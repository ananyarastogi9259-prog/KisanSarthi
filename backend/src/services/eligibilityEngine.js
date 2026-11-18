// ============================================================
// src/services/eligibilityEngine.js
// Dynamic Government Scheme Eligibility Engine
// ============================================================
// Pure evaluation engine that inspects a farmer's profile,
// multi-parcel land records, and verified scheme eligibility rules.
//
// DESIGN PRINCIPLES:
//   1. Dynamic: Reads criteria from `eligibility_rules.conditions` (JSONB).
//   2. Three Deterministic States:
//      - 'eligible': All conditions pass, no missing verification checkpoints.
//      - 'not_eligible': Definitive statutory disqualification.
//      - 'needs_verification': Missing data, unverified records, or required declaration.
//   3. Never assume missing data means eligible.
//   4. Multi-parcel aggregation: Combines acreage and checks ownership across parcels.
//   5. Privacy & Attribution: Human-readable reasons without exposing sensitive secrets.
// ============================================================

export class EligibilityEngine {
  /**
   * Normalizes land area to acres.
   * @param {number|string} area
   * @param {string} unit
   * @returns {number}
   */
  static normalizeAreaToAcres(area, unit = 'acres') {
    const num = Number(area)
    if (isNaN(num) || num <= 0) return 0

    const u = (unit || '').toLowerCase().trim()
    if (u.includes('hectare') || u === 'ha') {
      return num * 2.47105 // 1 hectare = 2.47105 acres
    }
    if (u.includes('bigha')) {
      // Standard UP Pucca Bigha approx 0.625 acres (defaulting safely)
      return num * 0.625
    }
    return num // Default assumed acres
  }

  /**
   * Evaluates a farmer's profile and land records against a scheme's rules.
   *
   * @param {Object} context
   * @param {Object} context.farmerProfile - Row from farmer_profiles / combined profile
   * @param {Array<Object>} [context.landRecords=[]] - Rows from land_records table
   * @param {Object} context.scheme - Row from schemes table
   * @param {Object} [context.rule=null] - Row from eligibility_rules table
   * @returns {Object} { result_status, reasons, evaluated_at }
   */
  static evaluate({ farmerProfile, landRecords = [], scheme, rule = null }) {
    const evaluatedAt = new Date().toISOString()

    // ── Guard 1: Missing Scheme or Rules ────────────────────────
    if (!scheme) {
      return {
        result_status: 'needs_verification',
        reasons: {
          summary: 'Scheme not specified or inactive.',
          criteria_evaluated: [],
          missing_information: ['scheme'],
          required_documents_needed: [],
        },
        evaluated_at: evaluatedAt,
      }
    }

    if (!rule || !rule.conditions || !rule.conditions.criteria) {
      return {
        result_status: 'needs_verification',
        reasons: {
          summary: `No automated eligibility rules have been configured for "${scheme.name}" yet. Official departmental verification is required.`,
          criteria_evaluated: [],
          missing_information: ['scheme_eligibility_rules'],
          required_documents_needed: rule?.required_documents || [],
        },
        evaluated_at: evaluatedAt,
      }
    }

    // ── Guard 2: Missing Farmer Agricultural Profile ────────────
    if (!farmerProfile || !farmerProfile.state) {
      return {
        result_status: 'needs_verification',
        reasons: {
          summary:
            'Farmer agricultural profile is incomplete. Please complete your state and district residential details before evaluation.',
          criteria_evaluated: [],
          missing_information: ['farmer_profile_state', 'farmer_profile_district'],
          required_documents_needed: rule.required_documents || [],
        },
        evaluated_at: evaluatedAt,
      }
    }

    const { criteria } = rule.conditions
    const criteriaEvaluated = []
    const missingInformation = []

    // ── 1. Location / Jurisdiction Evaluation ───────────────────
    if (criteria.location) {
      const allowedStates = (criteria.location.allowed_states || []).map((s) =>
        s.toLowerCase().trim()
      )
      const farmerState = (farmerProfile.state || '').toLowerCase().trim()

      const isAllIndia =
        allowedStates.includes('all') ||
        allowedStates.includes('central / all india') ||
        allowedStates.length === 0

      if (isAllIndia || allowedStates.includes(farmerState)) {
        criteriaEvaluated.push({
          criterion: 'location_jurisdiction',
          status: 'PASS',
          reason: `Applicant resides in ${farmerProfile.state || 'India'}, eligible for this scheme.`,
        })
      } else {
        criteriaEvaluated.push({
          criterion: 'location_jurisdiction',
          status: 'FAIL',
          reason: `Scheme is restricted to residents of ${criteria.location.allowed_states.join(
            ', '
          )}. Applicant state is ${farmerProfile.state}.`,
        })
      }
    }

    // ── 2. Multi-Parcel Land Records Aggregation ────────────────
    const records = Array.isArray(landRecords) ? landRecords : []
    let totalLandAreaAcres = 0
    let hasCultivableLand = false
    let hasDisallowedLandType = false
    let hasValidOwnership = false
    let hasDisallowedOwnership = false
    let allParcelsPendingVerification = records.length > 0
    let preCutoffMutationVerified = false
    let aadhaarVerifiedDemo = false
    let exclusionDeclared = false

    const landCriteria = criteria.land || {}
    const allowedOwnerships = (landCriteria.allowed_ownership_types || []).map((o) =>
      o.toLowerCase()
    )
    const disallowedOwnerships = (landCriteria.disallowed_ownership_types || []).map((o) =>
      o.toLowerCase()
    )
    const allowedLandTypes = (landCriteria.allowed_land_types || []).map((t) =>
      t.toLowerCase()
    )
    const disallowedLandTypes = (landCriteria.disallowed_land_types || []).map((t) =>
      t.toLowerCase()
    )

    for (const record of records) {
      const parcelArea = EligibilityEngine.normalizeAreaToAcres(
        record.land_area,
        record.area_unit
      )
      totalLandAreaAcres += parcelArea

      const ext = record.extracted_data || {}
      const ownership = (ext.ownership_type || record.record_type || '').toLowerCase().trim()
      const landType = (ext.land_type || '').toLowerCase().trim()

      // Check ownership
      if (allowedOwnerships.some((ao) => ownership.includes(ao))) {
        hasValidOwnership = true
      }
      if (disallowedOwnerships.some((doType) => ownership.includes(doType))) {
        hasDisallowedOwnership = true
      }

      // Check land type
      if (allowedLandTypes.some((alt) => landType.includes(alt)) || !landType) {
        hasCultivableLand = true
      }
      if (disallowedLandTypes.some((dlt) => landType.includes(dlt))) {
        hasDisallowedLandType = true
      }

      // Check verification status
      if (record.verification_status === 'verified' || ext.land_document_available_demo === true) {
        allParcelsPendingVerification = false
      }

      // Check pre-cutoff mutation date (PM-KISAN cut-off: 2019-02-01)
      if (ext.land_mutation_date) {
        const mutationDate = new Date(ext.land_mutation_date)
        const cutoffDate = new Date('2019-02-01')
        if (mutationDate <= cutoffDate || ext.is_inherited === true) {
          preCutoffMutationVerified = true
        }
      } else if (ext.is_inherited === true || ext.ownership_before_cutoff === true) {
        preCutoffMutationVerified = true
      }

      // Check Aadhaar verification demo flag
      if (ext.aadhaar_verified_demo === true) {
        aadhaarVerifiedDemo = true
      }

      // Check statutory exclusion self-declaration
      if (ext.statutory_exclusion_declared === true) {
        exclusionDeclared = true
      }
    }

    // ── 3. Land Ownership & Acreage Evaluation ──────────────────
    if (landCriteria.requires_land_ownership) {
      if (records.length === 0) {
        criteriaEvaluated.push({
          criterion: 'land_ownership',
          status: 'FAIL',
          reason:
            'PM-KISAN requires lawful ownership of cultivable agricultural land. No land records are registered under this farmer profile.',
        })
      } else if (hasDisallowedOwnership && !hasValidOwnership) {
        criteriaEvaluated.push({
          criterion: 'land_ownership_type',
          status: 'FAIL',
          reason:
            'PM-KISAN strictly excludes pure tenant farmers, sharecroppers, and leased landholders. Cultivable land ownership is required.',
        })
      } else if (hasDisallowedLandType && !hasCultivableLand) {
        criteriaEvaluated.push({
          criterion: 'cultivable_land',
          status: 'FAIL',
          reason:
            'Land parcel is classified for non-agricultural or commercial usage. Only cultivable agricultural land qualifies.',
        })
      } else {
        // Valid land ownership established
        const roundedAcres = Math.round(totalLandAreaAcres * 100) / 100
        criteriaEvaluated.push({
          criterion: 'cultivable_land_ownership',
          status: 'PASS',
          reason: `Cultivable agricultural land ownership confirmed (${roundedAcres} acres across ${records.length} registered parcel(s)).`,
        })

        // Check land ceiling if specified by scheme
        if (landCriteria.max_land_area_acres && totalLandAreaAcres > landCriteria.max_land_area_acres) {
          criteriaEvaluated.push({
            criterion: 'land_area_ceiling',
            status: 'FAIL',
            reason: `Total land area (${roundedAcres} acres) exceeds the scheme ceiling of ${landCriteria.max_land_area_acres} acres.`,
          })
        }
      }
    }

    // ── 4. Farmer Demographics Evaluation ────────────────────────
    const farmerCriteria = criteria.farmer || {}
    let applicantAge = null

    // Extract age from records or profile
    for (const r of records) {
      if (r.extracted_data?.age) {
        applicantAge = Number(r.extracted_data.age)
        break
      }
    }

    if (farmerCriteria.min_age && applicantAge !== null) {
      if (applicantAge < farmerCriteria.min_age) {
        criteriaEvaluated.push({
          criterion: 'applicant_age',
          status: 'FAIL',
          reason: `Primary applicant must be at least ${farmerCriteria.min_age} years of age. Applicant age is ${applicantAge}.`,
        })
      } else {
        criteriaEvaluated.push({
          criterion: 'applicant_age',
          status: 'PASS',
          reason: `Applicant age requirement satisfied (${applicantAge} years).`,
        })
      }
    }

    // Check institutional landholder
    let isInstitutional = false
    for (const r of records) {
      if (
        r.extracted_data?.farmer_category === 'institutional' ||
        r.extracted_data?.ownership_type === 'institutional'
      ) {
        isInstitutional = true
        break
      }
    }

    if (farmerCriteria.institutional_landholder_disqualified && isInstitutional) {
      criteriaEvaluated.push({
        criterion: 'institutional_exclusion',
        status: 'FAIL',
        reason:
          'Institutional landholders (trusts, societies, corporate bodies) are strictly excluded from PM-KISAN benefits.',
      })
    }

    // ── 5. Statutory Verification Checkpoints (PM-KISAN) ────────
    const checkpoints = criteria.statutory_verification_checkpoints || {}

    // Checkpoint A: Cut-off date (01-02-2019)
    if (checkpoints.land_ownership_cutoff_date && records.length > 0) {
      if (preCutoffMutationVerified) {
        criteriaEvaluated.push({
          criterion: 'land_cutoff_date',
          status: 'PASS',
          reason:
            'Land ownership registration confirmed on or before 01-02-2019 or inherited via death succession.',
        })
      } else {
        criteriaEvaluated.push({
          criterion: 'land_cutoff_date',
          status: 'NEEDS_VERIFICATION',
          reason:
            'Land registration date must be verified on or before the statutory cut-off date (01-02-2019) or certified as acquired through death succession.',
        })
        missingInformation.push('land_ownership_cutoff_verification')
      }
    }

    // Checkpoint B: Statutory Exclusion Categories (Tax, Govt Service, Public Post)
    if (checkpoints.income_tax_exclusion || checkpoints.constitutional_post_exclusion) {
      if (exclusionDeclared) {
        criteriaEvaluated.push({
          criterion: 'statutory_exclusions',
          status: 'PASS',
          reason:
            'Self-declaration confirmed: Applicant is not an Income Tax payee, government employee, or constitutional postholder.',
        })
      } else {
        criteriaEvaluated.push({
          criterion: 'statutory_exclusions',
          status: 'NEEDS_VERIFICATION',
          reason:
            'Self-declaration of non-inclusion in statutory exclusion categories (Income Tax payee in last assessment year, regular government/PSE employee, constitutional postholder) is required.',
        })
        missingInformation.push('statutory_exclusion_self_declaration')
      }
    }

    // Checkpoint C: Aadhaar Seeding on NPCI Payment Bridge
    if (checkpoints.dbt_bank_aadhaar_seeding) {
      if (aadhaarVerifiedDemo) {
        criteriaEvaluated.push({
          criterion: 'dbt_aadhaar_seeding',
          status: 'PASS',
          reason: 'Aadhaar identity and bank DBT bridge seeding verified.',
        })
      } else {
        criteriaEvaluated.push({
          criterion: 'dbt_aadhaar_seeding',
          status: 'NEEDS_VERIFICATION',
          reason:
            'Bank account must be seeded with Aadhaar and mapped on the NPCI Payment Bridge for Direct Benefit Transfer.',
        })
        missingInformation.push('aadhaar_dbt_bank_seeding')
      }
    }

    // Checkpoint D: Revenue Land Extract Verification
    if (records.length > 0 && allParcelsPendingVerification) {
      criteriaEvaluated.push({
        criterion: 'revenue_record_verification',
        status: 'NEEDS_VERIFICATION',
        reason:
          'Uploaded land record extract is pending official verification against state digitized revenue records (Bhulekh / Khatauni).',
      })
      missingInformation.push('land_record_revenue_verification')
    }

    // ── 6. Determine Final Result State ──────────────────────────
    let finalStatus = 'eligible'

    const hasFailure = criteriaEvaluated.some((c) => c.status === 'FAIL')
    const hasPendingVerification =
      criteriaEvaluated.some((c) => c.status === 'NEEDS_VERIFICATION') ||
      missingInformation.length > 0

    if (hasFailure) {
      finalStatus = 'not_eligible'
    } else if (hasPendingVerification) {
      finalStatus = 'needs_verification'
    } else {
      finalStatus = 'eligible'
    }

    // ── 7. Generate Summary Text ─────────────────────────────────
    let summary = ''
    if (finalStatus === 'eligible') {
      summary = `Farmer meets all statutory eligibility criteria for ${scheme.name}. All verified attributes and checkpoints passed.`
    } else if (finalStatus === 'not_eligible') {
      const failReasons = criteriaEvaluated
        .filter((c) => c.status === 'FAIL')
        .map((c) => c.reason)
        .join(' ')
      summary = `Farmer is not eligible for ${scheme.name}. Reason: ${failReasons}`
    } else {
      summary = `Farmer satisfies preliminary qualification for ${scheme.name}, but final approval requires completing ${missingInformation.length} official verification checkpoint(s).`
    }

    const requiredDocs = (rule.required_documents || []).map((doc) => ({
      doc_type: doc.doc_type,
      name: doc.name,
      mandatory: doc.mandatory !== false,
      purpose: doc.purpose || doc.description || '',
    }))

    return {
      result_status: finalStatus,
      reasons: {
        summary,
        criteria_evaluated: criteriaEvaluated,
        missing_information: missingInformation,
        required_documents_needed: requiredDocs,
      },
      evaluated_at: evaluatedAt,
    }
  }
}

export default EligibilityEngine

