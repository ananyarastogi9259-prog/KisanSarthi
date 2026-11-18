// ============================================================
// src/services/applicationService.js
// Scheme Application Tracking Service Layer
// ============================================================
// Coordinates creation, listing, detail view, and submission of
// farmer scheme applications using the existing `applications` table.
//
// INTEGRITY & SECURITY RULES:
//   - Always uses the authenticated farmer's client context (userClient)
//     so PostgreSQL Row Level Security (RLS) is strictly enforced.
//   - Allowed status values strictly conform to `applications_status_check`:
//     ('draft', 'submitted', 'under_review', 'approved', 'rejected').
//   - Enforces business rules:
//     * Applications can only be created for 'eligible' schemes.
//     * Ineligible schemes ('not_eligible') are rejected.
//     * Incomplete schemes ('needs_verification') require checkpoint completion.
//     * Prevents duplicate active applications for the same scheme.
//   - Does NOT automate submission to government portals.
// ============================================================

import checklistService from './checklistService.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'rejected']

export class ApplicationService {
  /**
   * Retrieves all applications created by the authenticated farmer.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} userId
   * @returns {Promise<Array<Object>>} List of farmer applications
   */
  async getFarmerApplications(userClient, userId) {
    if (!userClient) {
      throw new Error('Supabase client is not initialized.')
    }
    if (!userId || !UUID_REGEX.test(userId)) {
      const err = new Error('Invalid farmer ID.')
      err.statusCode = 400
      throw err
    }

    // 1. Fetch farmer's applications
    const { data: apps, error: appsError } = await userClient
      .from('applications')
      .select('id, farmer_id, scheme_id, status, submitted_at, reviewed_by, created_at')
      .eq('farmer_id', userId)
      .order('created_at', { ascending: false })

    if (appsError) {
      console.error('Error fetching farmer applications:', appsError.message)
      throw new Error('Failed to retrieve applications.')
    }

    if (!apps || apps.length === 0) {
      return []
    }

    // 2. Fetch scheme metadata for all referenced schemes
    const schemeIds = [...new Set(apps.map((a) => a.scheme_id))]
    const { data: schemes } = await userClient
      .from('schemes')
      .select('id, name, department, benefits, state, official_source_url')
      .in('id', schemeIds)

    const schemeMap = new Map()
    for (const s of schemes || []) {
      schemeMap.set(s.id, s)
    }

    // 3. Fetch count of attached documents per application
    const appIds = apps.map((a) => a.id)
    const { data: docs } = await userClient
      .from('documents')
      .select('id, application_id')
      .in('application_id', appIds)

    const docCountMap = new Map()
    for (const d of docs || []) {
      if (d.application_id) {
        docCountMap.set(d.application_id, (docCountMap.get(d.application_id) || 0) + 1)
      }
    }

    // 4. Format response with joined scheme info and computed timeline
    return apps.map((app) => {
      const scheme = schemeMap.get(app.scheme_id) || null
      return {
        id: app.id,
        scheme_id: app.scheme_id,
        scheme_name: scheme?.name || 'Government Scheme',
        department: scheme?.department || null,
        benefits: scheme?.benefits || null,
        official_source_url: scheme?.official_source_url || null,
        status: app.status,
        submitted_at: app.submitted_at,
        created_at: app.created_at,
        attached_documents_count: docCountMap.get(app.id) || 0,
        timeline: ApplicationService.computeTimeline(app),
      }
    })
  }

  /**
   * Retrieves single application details by ID, ensuring ownership.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} userId
   * @param {string} applicationId
   * @returns {Promise<Object>} Detailed application record
   */
  async getApplicationById(userClient, userId, applicationId) {
    if (!userClient) {
      throw new Error('Supabase client is not initialized.')
    }
    if (!userId || !UUID_REGEX.test(userId)) {
      const err = new Error('Invalid farmer ID.')
      err.statusCode = 400
      throw err
    }
    if (!applicationId || !UUID_REGEX.test(applicationId)) {
      const err = new Error('Invalid application ID format. Must be a valid UUID.')
      err.statusCode = 400
      throw err
    }

    // 1. Fetch application belonging to the authenticated farmer
    const { data: app, error: appError } = await userClient
      .from('applications')
      .select('id, farmer_id, scheme_id, status, submitted_at, reviewed_by, created_at')
      .eq('id', applicationId)
      .eq('farmer_id', userId)
      .maybeSingle()

    if (appError) {
      console.error('Error fetching application by ID:', appError.message)
      throw new Error('Failed to retrieve application details.')
    }

    if (!app) {
      const err = new Error('Application not found or inaccessible.')
      err.statusCode = 404
      throw err
    }

    // 2. Fetch scheme metadata
    const { data: scheme } = await userClient
      .from('schemes')
      .select('id, name, description, department, benefits, state, official_source_url')
      .eq('id', app.scheme_id)
      .maybeSingle()

    // 3. Fetch attached documents
    const { data: attachedDocs } = await userClient
      .from('documents')
      .select('id, document_type, file_name, created_at, storage_path')
      .eq('application_id', applicationId)
      .eq('farmer_id', userId)

    // 4. Fetch document checklist status
    const checklistData = await checklistService.getSchemeDocumentChecklist(
      userClient,
      userId,
      app.scheme_id
    )

    return {
      id: app.id,
      farmer_id: app.farmer_id,
      status: app.status,
      submitted_at: app.submitted_at,
      created_at: app.created_at,
      scheme: scheme || { id: app.scheme_id },
      attached_documents: (attachedDocs || []).map((d) => ({
        id: d.id,
        document_type: d.document_type,
        file_name: d.file_name,
        created_at: d.created_at,
      })),
      checklist: checklistData.checklist,
      checklist_summary: checklistData.summary,
      timeline: ApplicationService.computeTimeline(app),
    }
  }

  /**
   * Creates a new application record in 'draft' status for an eligible scheme.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} userId
   * @param {Object} payload - { scheme_id, document_ids }
   * @returns {Promise<Object>} Created application record
   */
  async createApplication(userClient, userId, { scheme_id, document_ids = [] }) {
    if (!userClient) {
      throw new Error('Supabase client is not initialized.')
    }
    if (!userId || !UUID_REGEX.test(userId)) {
      const err = new Error('Invalid farmer ID.')
      err.statusCode = 400
      throw err
    }
    if (!scheme_id || !UUID_REGEX.test(scheme_id)) {
      const err = new Error('A valid scheme_id (UUID) is required to apply.')
      err.statusCode = 400
      throw err
    }

    // 1. Verify target scheme is active
    const { data: scheme, error: schemeError } = await userClient
      .from('schemes')
      .select('id, name, is_active')
      .eq('id', scheme_id)
      .eq('is_active', true)
      .maybeSingle()

    if (schemeError || !scheme) {
      const err = new Error('Target scheme not found or inactive.')
      err.statusCode = 404
      throw err
    }

    // 2. Enforce Eligibility Business Rule:
    // Check latest eligibility result in `eligibility_results`
    const { data: latestEval } = await userClient
      .from('eligibility_results')
      .select('result_status, reasons')
      .eq('farmer_id', userId)
      .eq('scheme_id', scheme_id)
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const evalStatus = latestEval
      ? (latestEval.result_status === 'needs_review' ? 'needs_verification' : latestEval.result_status)
      : 'not_evaluated'

    if (evalStatus === 'not_eligible') {
      const err = new Error(
        `Cannot create application: You do not meet the statutory eligibility requirements for "${scheme.name}". Please review eligibility reasons.`
      )
      err.statusCode = 400
      err.details = latestEval?.reasons || {}
      throw err
    }

    if (evalStatus === 'needs_verification' || evalStatus === 'not_evaluated') {
      // Check if document checklist is complete
      const checklistData = await checklistService.getSchemeDocumentChecklist(userClient, userId, scheme_id)
      const isComplete = Boolean(checklistData?.summary?.is_complete)
      if (!isComplete && evalStatus !== 'eligible') {
        const err = new Error(
          `Cannot create application: Please verify all required documents first (${checklistData?.summary?.total_missing || 0} missing, ${checklistData?.summary?.total_needing_verification || 0} pending verification).`
        )
        err.statusCode = 400
        err.details = latestEval?.reasons || {
          missing_information: ['statutory_eligibility_evaluation_required'],
        }
        throw err
      }
    }

    // 3. Enforce Duplicate Application Rule:
    // Reject if an active application already exists for this scheme
    const { data: existingApp } = await userClient
      .from('applications')
      .select('id, status')
      .eq('farmer_id', userId)
      .eq('scheme_id', scheme_id)
      .in('status', ['draft', 'submitted', 'under_review'])
      .maybeSingle()

    if (existingApp) {
      const err = new Error(
        `An active application (Status: "${existingApp.status}") already exists for "${scheme.name}".`
      )
      err.statusCode = 409
      throw err
    }

    // 4. Insert new application record with default status: 'draft'
    const { data: createdApp, error: insertError } = await userClient
      .from('applications')
      .insert({
        farmer_id: userId,
        scheme_id: scheme_id,
        status: 'draft',
      })
      .select('id, farmer_id, scheme_id, status, submitted_at, reviewed_by, created_at')
      .single()

    if (insertError) {
      console.error('Error inserting application:', insertError.message)
      throw new Error(`Failed to create application: ${insertError.message}`)
    }

    // 5. Associate provided documents if specified
    if (Array.isArray(document_ids) && document_ids.length > 0) {
      const validDocIds = document_ids.filter((id) => UUID_REGEX.test(id))
      if (validDocIds.length > 0) {
        await userClient
          .from('documents')
          .update({ application_id: createdApp.id })
          .in('id', validDocIds)
          .eq('farmer_id', userId)
      }
    }

    return {
      ...createdApp,
      scheme_name: scheme.name,
      message: 'Application draft created successfully. Please attach all required documents before final submission.',
      timeline: ApplicationService.computeTimeline(createdApp),
    }
  }

  /**
   * Submits an application packet.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} userId
   * @param {string} applicationId
   * @returns {Promise<Object>} Updated application
   */
  async submitApplication(userClient, userId, applicationId) {
    if (!applicationId || !UUID_REGEX.test(applicationId)) {
      const err = new Error('Invalid application ID format.')
      err.statusCode = 400
      throw err
    }

    // Fetch existing application ensuring farmer ownership
    const { data: app, error: findError } = await userClient
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('farmer_id', userId)
      .maybeSingle()

    if (findError || !app) {
      const err = new Error('Application not found or inaccessible.')
      err.statusCode = 404
      throw err
    }

    if (app.status !== 'draft') {
      const err = new Error(`Application cannot be submitted because its current status is "${app.status}".`)
      err.statusCode = 400
      throw err
    }

    // Update status to 'submitted'
    const submissionTime = new Date().toISOString()
    const { data: updatedApp, error: updateError } = await userClient
      .from('applications')
      .update({
        status: 'submitted',
        submitted_at: submissionTime,
      })
      .eq('id', applicationId)
      .eq('farmer_id', userId)
      .select('id, farmer_id, scheme_id, status, submitted_at, reviewed_by, created_at')
      .single()

    if (updateError) {
      console.error('Error submitting application:', updateError.message)
      throw new Error(`Failed to submit application: ${updateError.message}`)
    }

    return {
      ...updatedApp,
      message:
        'Application submitted successfully for tracking in KisanSarthi. Note: Official government processing takes place through departmental portals.',
      timeline: ApplicationService.computeTimeline(updatedApp),
    }
  }

  /**
   * Updates application status (for review / demo transitions).
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} userId
   * @param {string} applicationId
   * @param {string} newStatus
   * @returns {Promise<Object>}
   */
  async updateApplicationStatus(userClient, userId, applicationId, newStatus) {
    if (!applicationId || !UUID_REGEX.test(applicationId)) {
      const err = new Error('Invalid application ID format.')
      err.statusCode = 400
      throw err
    }

    if (!newStatus || !ALLOWED_STATUSES.includes(newStatus.trim())) {
      const err = new Error(
        `Invalid status "${newStatus}". Allowed values: ${ALLOWED_STATUSES.join(', ')}.`
      )
      err.statusCode = 400
      throw err
    }

    const { data: app, error: findError } = await userClient
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .eq('farmer_id', userId)
      .maybeSingle()

    if (findError || !app) {
      const err = new Error('Application not found or inaccessible.')
      err.statusCode = 404
      throw err
    }

    const { data: updatedApp, error: updateError } = await userClient
      .from('applications')
      .update({ status: newStatus.trim() })
      .eq('id', applicationId)
      .eq('farmer_id', userId)
      .select('id, farmer_id, scheme_id, status, submitted_at, reviewed_by, created_at')
      .single()

    if (updateError) {
      console.error('Error updating application status:', updateError.message)
      throw new Error(`Failed to update application status: ${updateError.message}`)
    }

    return {
      ...updatedApp,
      timeline: ApplicationService.computeTimeline(updatedApp),
    }
  }

  /**
   * Computes a linear multi-step progress timeline based on current application state.
   * Satisfies the user request without creating an application status history table.
   *
   * @param {Object} app
   * @returns {Array<Object>} Timeline steps
   */
  static computeTimeline(app) {
    const isSubmitted = ['submitted', 'under_review', 'approved', 'rejected'].includes(app.status)
    const isUnderReview = ['under_review', 'approved', 'rejected'].includes(app.status)
    const isResolved = ['approved', 'rejected'].includes(app.status)

    return [
      {
        step: 1,
        name: 'Draft Created',
        description: 'Application initiated and document checklist prepared in KisanSarthi.',
        status: 'completed',
        timestamp: app.created_at,
      },
      {
        step: 2,
        name: 'Submitted by Farmer',
        description: 'Application packet finalized and submitted for official processing.',
        status: isSubmitted ? 'completed' : 'pending',
        timestamp: app.submitted_at || null,
      },
      {
        step: 3,
        name: 'Under Departmental Review',
        description: 'Under review by authorized scheme verification authority.',
        status: isUnderReview ? 'completed' : isSubmitted ? 'in_progress' : 'pending',
        timestamp: null,
      },
      {
        step: 4,
        name: app.status === 'rejected' ? 'Rejected' : 'Approved',
        description:
          app.status === 'approved'
            ? 'Scheme application approved for benefits disbursement.'
            : app.status === 'rejected'
            ? 'Scheme application was not approved by the verification authority.'
            : 'Final departmental decision.',
        status: isResolved ? (app.status === 'approved' ? 'completed' : 'rejected') : 'pending',
        timestamp: null,
      },
    ]
  }
}

const applicationService = new ApplicationService()
export default applicationService
