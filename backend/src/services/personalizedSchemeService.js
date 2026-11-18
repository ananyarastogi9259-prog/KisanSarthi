// ============================================================
// src/services/personalizedSchemeService.js
// Personalized Scheme Results Service Layer
// ============================================================
// Consolidates active schemes, farmer eligibility results, document
// checklists, and application states for the authenticated farmer.
//
// INTEGRITY & SECURITY RULES:
//   - Always uses the authenticated farmer's client context (userClient)
//     so PostgreSQL Row Level Security (RLS) is strictly enforced.
//   - Reads from existing tables: schemes, eligibility_results,
//     applications, documents, and eligibility_rules.
//   - Zero duplicate tables or schema alterations.
//   - Handles unevaluated schemes safely without inventing results.
// ============================================================

import checklistService from './checklistService.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class PersonalizedSchemeService {
  /**
   * Retrieves all active schemes personalized for the authenticated farmer.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} userId - Authenticated farmer UUID
   * @returns {Promise<Array<Object>>} Personalized scheme results
   */
  async getPersonalizedSchemes(userClient, userId) {
    if (!userClient) {
      throw new Error('Supabase client is not initialized.')
    }
    if (!userId || !UUID_REGEX.test(userId)) {
      const err = new Error('Invalid farmer ID.')
      err.statusCode = 400
      throw err
    }

    // 1. Fetch all active schemes
    const { data: schemes, error: schemesError } = await userClient
      .from('schemes')
      .select('id, name, description, department, benefits, state, official_source_url, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (schemesError) {
      console.error('Error fetching schemes for personalized list:', schemesError.message)
      throw new Error('Failed to retrieve active schemes.')
    }

    // 2. Fetch existing evaluation results for this farmer from `eligibility_results`
    const { data: evalResults, error: evalError } = await userClient
      .from('eligibility_results')
      .select('id, scheme_id, result_status, reasons, evaluated_at')
      .eq('farmer_id', userId)
      .order('evaluated_at', { ascending: false })

    if (evalError) {
      console.error('Error fetching eligibility results:', evalError.message)
      throw new Error('Failed to retrieve eligibility results.')
    }

    // Group latest evaluation result per scheme
    const latestEvalMap = new Map()
    for (const er of evalResults || []) {
      if (!latestEvalMap.has(er.scheme_id)) {
        latestEvalMap.set(er.scheme_id, er)
      }
    }

    // 3. Fetch existing applications for this farmer
    const { data: applications, error: appError } = await userClient
      .from('applications')
      .select('id, scheme_id, status, submitted_at, created_at')
      .eq('farmer_id', userId)

    if (appError) {
      console.error('Error fetching applications for personalized list:', appError.message)
    }

    const appMap = new Map()
    for (const app of applications || []) {
      appMap.set(app.scheme_id, app)
    }

    // 4. Build consolidated personalized list
    const results = (schemes || []).map((scheme) => {
      const evalRow = latestEvalMap.get(scheme.id)
      const existingApp = appMap.get(scheme.id)

      let status = 'not_evaluated'
      let reasons = {
        summary: 'Eligibility has not yet been evaluated for this scheme. Run evaluation to check qualification.',
      }
      let evaluatedAt = null

      if (evalRow) {
        // Map database status ('needs_review' -> 'needs_verification')
        status = evalRow.result_status === 'needs_review' ? 'needs_verification' : evalRow.result_status
        reasons = evalRow.reasons || reasons
        evaluatedAt = evalRow.evaluated_at
      }

      return {
        scheme_id: scheme.id,
        scheme_name: scheme.name,
        description: scheme.description,
        benefits: scheme.benefits,
        department: scheme.department,
        state: scheme.state,
        official_source_url: scheme.official_source_url,
        eligibility_status: status,
        eligibility_reasons: reasons,
        evaluated_at: evaluatedAt,
        application: existingApp
          ? {
              id: existingApp.id,
              status: existingApp.status,
              submitted_at: existingApp.submitted_at,
              created_at: existingApp.created_at,
            }
          : null,
      }
    })

    return results
  }

  /**
   * Retrieves detailed personalized information for a single scheme:
   * scheme info, eligibility status & reasons, document checklist, and application status.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} userId
   * @param {string} schemeId
   * @returns {Promise<Object>} Detailed personalized scheme object
   */
  async getPersonalizedSchemeDetail(userClient, userId, schemeId) {
    if (!userClient) {
      throw new Error('Supabase client is not initialized.')
    }
    if (!userId || !UUID_REGEX.test(userId)) {
      const err = new Error('Invalid farmer ID.')
      err.statusCode = 400
      throw err
    }
    if (!schemeId || !UUID_REGEX.test(schemeId)) {
      const err = new Error('Invalid scheme ID format. Must be a valid UUID.')
      err.statusCode = 400
      throw err
    }

    // 1. Fetch scheme details
    const { data: scheme, error: schemeError } = await userClient
      .from('schemes')
      .select('id, name, description, department, benefits, state, official_source_url, is_active, created_at')
      .eq('id', schemeId)
      .eq('is_active', true)
      .maybeSingle()

    if (schemeError) {
      console.error('Error fetching scheme detail:', schemeError.message)
      throw new Error('Failed to retrieve scheme details.')
    }

    if (!scheme) {
      const err = new Error('Scheme not found or inactive.')
      err.statusCode = 404
      throw err
    }

    // 2. Fetch latest eligibility result from `eligibility_results`
    const { data: evalRow } = await userClient
      .from('eligibility_results')
      .select('id, result_status, reasons, evaluated_at')
      .eq('farmer_id', userId)
      .eq('scheme_id', schemeId)
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let status = 'not_evaluated'
    let reasons = {
      summary: 'Eligibility has not yet been evaluated for this scheme. Run evaluation to check qualification.',
    }
    let evaluatedAt = null

    if (evalRow) {
      status = evalRow.result_status === 'needs_review' ? 'needs_verification' : evalRow.result_status
      reasons = evalRow.reasons || reasons
      evaluatedAt = evalRow.evaluated_at
    }

    // 3. Generate dynamic document checklist
    const checklistData = await checklistService.getSchemeDocumentChecklist(userClient, userId, schemeId)

    // 4. Fetch existing application for this scheme if any
    const { data: application } = await userClient
      .from('applications')
      .select('id, status, submitted_at, reviewed_by, created_at')
      .eq('farmer_id', userId)
      .eq('scheme_id', schemeId)
      .maybeSingle()

    // 5. Determine whether application creation is permitted
    const isDocComplete = Boolean(checklistData?.summary?.is_complete)
    const canApply = (status === 'eligible' || isDocComplete) && !application

    return {
      scheme: {
        id: scheme.id,
        name: scheme.name,
        description: scheme.description,
        benefits: scheme.benefits,
        department: scheme.department,
        state: scheme.state,
        official_source_url: scheme.official_source_url,
      },
      eligibility: {
        status,
        reasons,
        evaluated_at: evaluatedAt,
      },
      checklist: checklistData.checklist,
      checklist_summary: checklistData.summary,
      application: application || null,
      can_apply: canApply,
    }
  }
}

const personalizedSchemeService = new PersonalizedSchemeService()
export default personalizedSchemeService
