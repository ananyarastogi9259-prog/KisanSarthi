// ============================================================
// src/services/schemeService.js
// Scheme Service Layer
// ============================================================
// Encapsulates business logic and database queries for the
// Government Schemes Catalogue. Interacts with the actual
// Supabase `schemes` table conforming strictly to its existing columns.
//
// Existing columns in `schemes`:
//   - id (uuid, PK)
//   - name (text, required)
//   - description (text)
//   - department (text)
//   - benefits (text)
//   - state (text)
//   - official_source_url (text)
//   - is_active (boolean)
//   - created_by (uuid FK)
//   - created_at (timestamptz)
// ============================================================

import { createClient } from '@supabase/supabase-js'
import supabase from '../config/supabase.js'
import { VERIFIED_SCHEMES } from '../data/verifiedSchemes.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class SchemeService {
  /**
   * Retrieves active government schemes with optional filters.
   * Uses client (user-scoped or default Supabase client).
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} [client=supabase]
   * @param {Object} [filters={}] - Optional query filters (state, department, search)
   * @returns {Promise<Array<Object>>} List of active schemes
   */
  async getSchemes(client = supabase, filters = {}) {
    const activeClient = client || supabase
    if (!activeClient) {
      throw new Error('Supabase client is not initialized.')
    }

    const { state, department, search } = filters

    let query = activeClient
      .from('schemes')
      .select('id, name, description, department, benefits, state, official_source_url, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (state && typeof state === 'string' && state.trim()) {
      query = query.ilike('state', `%${state.trim()}%`)
    }

    if (department && typeof department === 'string' && department.trim()) {
      query = query.ilike('department', `%${department.trim()}%`)
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim().replace(/[%_]/g, '')
      if (term) {
        query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
      }
    }

    const { data: schemes, error } = await query

    if (error) {
      console.error('Error fetching schemes from database:', error.message)
      throw new Error('Failed to retrieve government schemes catalogue.')
    }

    return schemes || []
  }

  /**
   * Retrieves a single active scheme by ID.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} [client=supabase]
   * @param {string} id - Scheme UUID
   * @returns {Promise<Object|null>} Scheme record or null if not found
   */
  async getSchemeById(client = supabase, id) {
    const activeClient = client || supabase
    if (!activeClient) {
      throw new Error('Supabase client is not initialized.')
    }

    if (!id || !UUID_REGEX.test(id)) {
      const err = new Error('Invalid scheme ID format. Must be a valid UUID.')
      err.statusCode = 400
      throw err
    }

    const { data: scheme, error } = await activeClient
      .from('schemes')
      .select('id, name, description, department, benefits, state, official_source_url, is_active, created_at')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('Error fetching scheme by ID:', error.message)
      throw new Error('Failed to retrieve scheme details.')
    }

    return scheme || null
  }

  /**
   * Seeds verified initial government schemes into Supabase if not already present.
   * Idempotent: checks by name before insert, never creates duplicates, never overwrites.
   * Requires administrative / service-role credentials to satisfy RLS write policy.
   *
   * @returns {Promise<Object>} Seed result summary
   */
  async seedVerifiedSchemes() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.SUPABASE_URL

    if (!serviceKey || !supabaseUrl) {
      throw new Error('Service role key is required for scheme seeding.')
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let inserted = 0
    let existing = 0
    const records = []

    for (const scheme of VERIFIED_SCHEMES) {
      // Check if scheme with same name already exists
      const { data: found, error: findError } = await adminClient
        .from('schemes')
        .select('id, name')
        .eq('name', scheme.name)
        .maybeSingle()

      if (findError) {
        console.error(`Error checking existing scheme "${scheme.name}":`, findError.message)
        continue
      }

      if (found) {
        existing++
        records.push({ id: found.id, name: found.name, status: 'already_exists' })
      } else {
        const { data: newScheme, error: insertError } = await adminClient
          .from('schemes')
          .insert({
            name: scheme.name,
            description: scheme.description,
            department: scheme.department,
            benefits: scheme.benefits,
            state: scheme.state,
            official_source_url: scheme.official_source_url,
            is_active: scheme.is_active,
          })
          .select('id, name')
          .single()

        if (insertError) {
          console.error(`Error inserting scheme "${scheme.name}":`, insertError.message)
        } else {
          inserted++
          records.push({ id: newScheme.id, name: newScheme.name, status: 'inserted' })
        }
      }
    }

    return {
      total: VERIFIED_SCHEMES.length,
      inserted,
      existing,
      records,
    }
  }
}

const schemeService = new SchemeService()
export default schemeService

