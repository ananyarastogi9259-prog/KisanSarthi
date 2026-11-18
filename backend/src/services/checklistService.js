// ============================================================
// src/services/checklistService.js
// Document Checklist Service Layer
// ============================================================
// Compares statutory scheme document requirements in `eligibility_rules`
// against the farmer's uploaded document records in `documents`.
//
// INTEGRITY & SECURITY RULES:
//   - Always uses the authenticated farmer's client context (userClient)
//     so PostgreSQL Row Level Security (RLS) is strictly enforced.
//   - Does not duplicate document requirements into another table.
//   - Normalizes document types for comparison without mutating DB records.
//   - Does not expose private storage paths or signed URLs unnecessarily.
// ============================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Standardized alias mapping for flexible matching across states
const DOCUMENT_TYPE_ALIASES = {
  land_record: ['khatauni', 'land_record', 'khatiyan', '7_12', 'ror', 'bhulekh', 'patta', 'jamabandi'],
  aadhaar: ['aadhaar', 'aadhar', 'identity_card', 'id_proof'],
  bank_passbook: ['bank_passbook', 'passbook', 'bank_statement', 'cancelled_cheque'],
  statutory_self_declaration: ['statutory_self_declaration', 'self_declaration', 'declaration', 'affidavit'],
}

export class ChecklistService {
  /**
   * Checks whether an uploaded document type satisfies a statutory requirement slug.
   * @param {string} requiredSlug
   * @param {string} uploadedDocType
   * @returns {boolean}
   */
  static matchesDocType(requiredSlug, uploadedDocType) {
    if (!requiredSlug || !uploadedDocType) return false
    const r = requiredSlug.toLowerCase().trim()
    const u = uploadedDocType.toLowerCase().trim()
    if (r === u) return true

    const aliases = DOCUMENT_TYPE_ALIASES[r] || [r]
    return aliases.includes(u)
  }

  /**
   * Generates a comprehensive document checklist for a specific scheme and farmer.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} farmerId
   * @param {string} schemeId
   * @returns {Promise<Object>} Categorized document checklist
   */
  async getSchemeDocumentChecklist(userClient, farmerId, schemeId) {
    if (!userClient) {
      throw new Error('Supabase client is not initialized.')
    }
    if (!farmerId || !UUID_REGEX.test(farmerId)) {
      const err = new Error('Invalid farmer ID.')
      err.statusCode = 400
      throw err
    }
    if (!schemeId || !UUID_REGEX.test(schemeId)) {
      const err = new Error('Invalid scheme ID. Must be a valid UUID.')
      err.statusCode = 400
      throw err
    }

    // 1. Fetch scheme details to verify existence
    const { data: scheme, error: schemeError } = await userClient
      .from('schemes')
      .select('id, name, is_active')
      .eq('id', schemeId)
      .eq('is_active', true)
      .maybeSingle()

    if (schemeError) {
      console.error('Error fetching scheme for checklist:', schemeError.message)
      throw new Error('Failed to retrieve scheme details.')
    }

    if (!scheme) {
      const err = new Error('Scheme not found or inactive.')
      err.statusCode = 404
      throw err
    }

    // 2. Fetch statutory required documents from `eligibility_rules`
    const { data: rule, error: ruleError } = await userClient
      .from('eligibility_rules')
      .select('id, required_documents')
      .eq('scheme_id', schemeId)
      .maybeSingle()

    if (ruleError) {
      console.error('Error fetching eligibility rules for checklist:', ruleError.message)
      throw new Error('Failed to retrieve scheme requirements.')
    }

    const requiredDocs = (rule && Array.isArray(rule.required_documents)) ? rule.required_documents : []

    // 3. Fetch farmer's uploaded documents from `documents`
    const { data: farmerDocs, error: docError } = await userClient
      .from('documents')
      .select('id, document_type, file_name, land_record_id, application_id, created_at')
      .eq('farmer_id', farmerId)

    if (docError) {
      console.error('Error fetching farmer documents for checklist:', docError.message)
      throw new Error('Failed to retrieve uploaded documents.')
    }

    // 4. Fetch farmer's land records to check confirmation & verification status
    const { data: landRecords } = await userClient
      .from('land_records')
      .select('id, verification_status, extracted_data')
      .eq('farmer_id', farmerId)

    const landRecordMap = new Map()
    for (const lr of landRecords || []) {
      landRecordMap.set(lr.id, lr)
    }

    // 5. Reconcile requirements against farmer's documents
    const availableDocuments = []
    const missingDocuments = []
    const documentsNeedingVerification = []

    for (const reqItem of requiredDocs) {
      const reqSlug = reqItem.doc_type || reqItem.slug || 'unknown'
      const matchedDocs = (farmerDocs || []).filter((fd) =>
        ChecklistService.matchesDocType(reqSlug, fd.document_type)
      )

      if (matchedDocs.length > 0) {
        for (const md of matchedDocs) {
          const docEntry = {
            requirement_name: reqItem.name,
            doc_type: reqSlug,
            document_id: md.id,
            file_name: md.file_name,
            uploaded_at: md.created_at,
            land_record_id: md.land_record_id,
            application_id: md.application_id,
          }

          // Check if associated land record is pending farmer confirmation or rejected
          let needsVerification = false
          if (md.land_record_id && landRecordMap.has(md.land_record_id)) {
            const lr = landRecordMap.get(md.land_record_id)
            const confStatus = lr.extracted_data?.confirmation_status
            if (lr.verification_status === 'rejected' || (confStatus && confStatus !== 'confirmed_by_farmer')) {
              needsVerification = true
              docEntry.verification_status = lr.verification_status || 'pending'
              docEntry.confirmation_status = confStatus || 'unconfirmed'
              docEntry.reason = confStatus !== 'confirmed_by_farmer'
                ? 'Land record extracted via OCR requires farmer confirmation.'
                : 'Land record extract was rejected during revenue verification.'
            }
          }

          if (needsVerification) {
            documentsNeedingVerification.push(docEntry)
          } else {
            availableDocuments.push(docEntry)
          }
        }
      } else {
        // Document has not been uploaded yet
        missingDocuments.push({
          name: reqItem.name,
          doc_type: reqSlug,
          purpose: reqItem.purpose || 'Statutory verification requirement',
          mandatory: Boolean(reqItem.mandatory !== false),
        })
      }
    }

    const missingMandatoryCount = missingDocuments.filter((d) => d.mandatory).length
    const isComplete =
      missingMandatoryCount === 0 &&
      documentsNeedingVerification.length === 0 &&
      (availableDocuments.length > 0 || requiredDocs.length === 0)
    const completionPercentage = requiredDocs.length > 0
      ? Math.min(100, Math.round((availableDocuments.length / requiredDocs.length) * 100))
      : 100

    return {
      scheme_id: scheme.id,
      scheme_name: scheme.name,
      checklist: {
        required: requiredDocs,
        required_documents: requiredDocs,
        available: availableDocuments,
        available_documents: availableDocuments,
        missing: missingDocuments,
        missing_documents: missingDocuments,
        needing_verification: documentsNeedingVerification,
        documents_needing_verification: documentsNeedingVerification,
      },
      summary: {
        total_required: requiredDocs.length,
        total_available: availableDocuments.length,
        total_missing: missingDocuments.length,
        missing_count: missingDocuments.length,
        total_needing_verification: documentsNeedingVerification.length,
        needing_verification_count: documentsNeedingVerification.length,
        missing_mandatory_count: missingMandatoryCount,
        completion_percentage: completionPercentage,
        is_complete: isComplete,
      },
    }
  }
}

const checklistService = new ChecklistService()
export default checklistService
