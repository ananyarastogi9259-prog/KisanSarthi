// ============================================================
// src/services/eligibilityService.js
// Eligibility Engine Service Layer
// ============================================================
// Coordinates data loading, dynamic evaluation, and result storage
// across existing Supabase tables:
//   - schemes
//   - eligibility_rules
//   - farmer_profiles & profiles
//   - land_records
//   - eligibility_results
//
// INTEGRITY & SECURITY:
//   - Always uses the authenticated farmer's client context (userClient)
//     so PostgreSQL Row Level Security (RLS) is strictly enforced.
//   - Evaluates rules dynamically from `eligibility_rules.conditions`.
//   - Saves evaluation results into `eligibility_results`.
//   - Does not expose other farmers' records or sensitive secrets.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import supabase from '../config/supabase.js'
import { EligibilityEngine } from './eligibilityEngine.js'
import { VERIFIED_RULES } from '../data/verifiedRules.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class EligibilityService {
  /**
   * Evaluates a single scheme's eligibility for the authenticated farmer.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient - Authenticated user client
   * @param {string} userId - Authenticated farmer UUID
   * @param {string} schemeId - Target scheme UUID
   * @returns {Promise<Object>} Evaluation result and reasons
   */
  async evaluateSchemeForFarmer(userClient, userId, schemeId) {
    if (!userClient) {
      throw new Error('Supabase client is not initialized.')
    }
    if (!userId || !UUID_REGEX.test(userId)) {
      const err = new Error('Invalid farmer ID.')
      err.statusCode = 400
      throw err
    }
    if (!schemeId || !UUID_REGEX.test(schemeId)) {
      const err = new Error('Invalid scheme ID. Must be a valid UUID.')
      err.statusCode = 400
      throw err
    }

    // 1. Fetch target scheme from `schemes` table
    const { data: scheme, error: schemeError } = await userClient
      .from('schemes')
      .select('id, name, description, department, benefits, state, official_source_url, is_active')
      .eq('id', schemeId)
      .eq('is_active', true)
      .maybeSingle()

    if (schemeError) {
      console.error('Error fetching scheme for evaluation:', schemeError.message)
      throw new Error('Failed to retrieve scheme information.')
    }

    if (!scheme) {
      const err = new Error('Scheme not found or inactive.')
      err.statusCode = 404
      throw err
    }

    // 2. Fetch scheme's eligibility rule from `eligibility_rules` table
    const { data: rule, error: ruleError } = await userClient
      .from('eligibility_rules')
      .select('id, scheme_id, rule_name, conditions, required_documents, source_url, last_verified_at')
      .eq('scheme_id', schemeId)
      .maybeSingle()

    if (ruleError) {
      console.error('Error fetching eligibility rules:', ruleError.message)
      throw new Error('Failed to retrieve scheme rules.')
    }

    // 3. Fetch farmer profile (combined profiles + farmer_profiles)
    const { data: baseProfile } = await userClient
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('id', userId)
      .maybeSingle()

    const { data: farmerProfile } = await userClient
      .from('farmer_profiles')
      .select('id, state, district, village, address, pincode')
      .eq('id', userId)
      .maybeSingle()

    const combinedProfile = farmerProfile
      ? { ...farmerProfile, ...(baseProfile || {}) }
      : baseProfile || null

    // 4. Fetch farmer's land records from `land_records` table
    const { data: landRecords, error: landError } = await userClient
      .from('land_records')
      .select('id, farmer_id, survey_number, land_area, area_unit, state, district, village, record_type, extracted_data, verification_status')
      .eq('farmer_id', userId)

    if (landError) {
      console.error('Error fetching land records for evaluation:', landError.message)
      throw new Error('Failed to retrieve farmer land records.')
    }

    // 5. Execute pure evaluation engine
    const evalResult = EligibilityEngine.evaluate({
      farmerProfile: combinedProfile,
      landRecords: landRecords || [],
      scheme,
      rule,
    })

    // 6. Save evaluation result into existing `eligibility_results` table
    // Maps 'needs_verification' to 'needs_review' to satisfy DB check constraint
    let savedResultId = null
    const dbStatus =
      evalResult.result_status === 'needs_verification'
        ? 'needs_review'
        : evalResult.result_status

    try {
      const { data: savedRow, error: saveError } = await userClient
        .from('eligibility_results')
        .insert({
          farmer_id: userId,
          scheme_id: schemeId,
          result_status: dbStatus,
          reasons: evalResult.reasons,
          evaluated_at: evalResult.evaluated_at,
        })
        .select('id')
        .single()

      if (saveError) {
        console.warn('⚠️ Warning: Failed to persist eligibility_results:', saveError.message)
      } else {
        savedResultId = savedRow?.id || null
      }
    } catch (saveEx) {
      console.warn('⚠️ Warning: Exception saving eligibility_results:', saveEx.message)
    }

    return {
      result_id: savedResultId,
      scheme_id: scheme.id,
      scheme_name: scheme.name,
      result_status: evalResult.result_status,
      reasons: evalResult.reasons,
      evaluated_at: evalResult.evaluated_at,
      scheme_details: {
        department: scheme.department,
        benefits: scheme.benefits,
        state: scheme.state,
        official_source_url: scheme.official_source_url,
      },
    }
  }

  /**
   * Retrieves evaluation history for a specific scheme and farmer.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} userId
   * @param {string} schemeId
   * @returns {Promise<Array<Object>>}
   */
  async getEligibilityHistory(userClient, userId, schemeId) {
    if (!UUID_REGEX.test(schemeId)) {
      const err = new Error('Invalid scheme ID.')
      err.statusCode = 400
      throw err
    }

    const { data, error } = await userClient
      .from('eligibility_results')
      .select('id, farmer_id, scheme_id, result_status, reasons, evaluated_at')
      .eq('farmer_id', userId)
      .eq('scheme_id', schemeId)
      .order('evaluated_at', { ascending: false })

    if (error) {
      console.error('Error fetching eligibility history:', error.message)
      throw new Error('Failed to retrieve evaluation history.')
    }

    return (data || []).map((row) => ({
      ...row,
      result_status: row.result_status === 'needs_review' ? 'needs_verification' : row.result_status,
    }))
  }

  /**
   * Evaluates all active schemes for the authenticated farmer.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} userId
   * @returns {Promise<Array<Object>>}
   */
  async evaluateAllSchemesForFarmer(userClient, userId) {
    const { data: schemes, error: schemesError } = await userClient
      .from('schemes')
      .select('id, name')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (schemesError) {
      throw new Error('Failed to load active schemes.')
    }

    const results = []
    for (const s of schemes || []) {
      try {
        const evalRes = await this.evaluateSchemeForFarmer(userClient, userId, s.id)
        results.push(evalRes)
      } catch (err) {
        results.push({
          scheme_id: s.id,
          scheme_name: s.name,
          result_status: 'error',
          error: err.message,
        })
      }
    }

    return results
  }

  /**
   * Idempotently seeds verified eligibility rules into `eligibility_rules` table.
   * Uses administrative client (service-role key) or fallback client.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} [client]
   * @returns {Promise<Object>} Seeding summary
   */
  async seedVerifiedRules(client = null) {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPAYBASE_SERVICE_ROLE_KEY

    let adminClient = client
    if (!adminClient) {
      if (supabaseUrl && serviceKey) {
        adminClient = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      } else {
        adminClient = supabase
      }
    }

    let inserted = 0
    let existing = 0
    const records = []

    for (const rule of VERIFIED_RULES) {
      const { data: found, error: findError } = await adminClient
        .from('eligibility_rules')
        .select('id, scheme_id, rule_name')
        .eq('scheme_id', rule.scheme_id)
        .maybeSingle()

      if (findError) {
        console.error(`Error checking rule for scheme "${rule.scheme_id}":`, findError.message)
        continue
      }

      if (found) {
        // Update to ensure latest verified conditions
        await adminClient
          .from('eligibility_rules')
          .update({
            rule_name: rule.rule_name,
            conditions: rule.conditions,
            required_documents: rule.required_documents,
            source_url: rule.source_url,
            last_verified_at: rule.last_verified_at,
          })
          .eq('id', found.id)

        existing++
        records.push({ id: found.id, scheme_id: rule.scheme_id, status: 'already_exists_updated' })
      } else {
        const { data: newRule, error: insertError } = await adminClient
          .from('eligibility_rules')
          .insert({
            scheme_id: rule.scheme_id,
            rule_name: rule.rule_name,
            conditions: rule.conditions,
            required_documents: rule.required_documents,
            source_url: rule.source_url,
            last_verified_at: rule.last_verified_at,
          })
          .select('id, scheme_id')
          .single()

        if (insertError) {
          console.error(`Error inserting rule for scheme "${rule.scheme_id}":`, insertError.message)
        } else {
          inserted++
          records.push({ id: newRule.id, scheme_id: newRule.scheme_id, status: 'inserted' })
        }
      }
    }

    return {
      total: VERIFIED_RULES.length,
      inserted,
      existing,
      records,
    }
  }
}

const eligibilityService = new EligibilityService()
export default eligibilityService
