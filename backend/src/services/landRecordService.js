// ============================================================
// src/services/landRecordService.js
// Land Record Service Layer
// ============================================================
// Business logic service connecting land data providers, data
// normalizers, and the existing `land_records` Supabase database.
//
// Pipeline:
//   Land Provider (e.g., SyntheticUPLandProvider / UPLandRecordProvider)
//           ↓
//   Land Data Normalizer (LandDataNormalizer)
//           ↓
//   Land Record Service (this file)
//           ↓
//   Existing Supabase `land_records` Table
// ============================================================

import syntheticUPLandProvider, {
  SyntheticUPLandProvider,
} from './providers/SyntheticUPLandProvider.js'
import LandDataNormalizer from './LandDataNormalizer.js'

export class LandRecordService {
  /**
   * Initializes the service with a pluggable land provider.
   * Defaults to SyntheticUPLandProvider for development & demo.
   * In future production, can be initialized with UPLandRecordProvider.
   *
   * @param {Object} [provider=syntheticUPLandProvider]
   */
  constructor(provider = syntheticUPLandProvider) {
    this.provider = provider
  }

  /**
   * Returns current active provider name.
   */
  get activeProviderName() {
    return this.provider.constructor.providerName || 'UnknownProvider'
  }

  /**
   * Fetches and normalizes available synthetic UP land records.
   *
   * @param {Object} [criteria={}] - Optional filter criteria (district, village, survey_number)
   * @returns {Promise<Array<Object>>} List of normalized land records
   */
  async getAvailableRecords(criteria = {}) {
    const rawRecords = await this.provider.searchRecords(criteria)
    return LandDataNormalizer.normalizeBatch(rawRecords, {
      providerName: this.activeProviderName,
      isSynthetic: true,
      verificationStatus: 'pending',
    })
  }

  /**
   * Looks up a single synthetic UP land record by district and survey number.
   *
   * @param {string} district
   * @param {string} surveyNumber
   * @returns {Promise<Object|null>} Normalized record or null if not found
   */
  async findRecordBySurvey(district, surveyNumber) {
    const rawRecord = await this.provider.getRecordBySurvey(district, surveyNumber)
    if (!rawRecord) return null

    return LandDataNormalizer.normalize(rawRecord, {
      providerName: this.activeProviderName,
      isSynthetic: true,
      verificationStatus: 'pending',
    })
  }

  /**
   * Imports a synthetic UP land record into the database for the authenticated farmer.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient - Scoped Supabase client (req.supabase)
   * @param {string} userId - Authenticated user ID (req.user.id)
   * @param {Object} lookupCriteria - Lookup parameters
   * @param {string} lookupCriteria.district - District name (e.g. 'Meerut')
   * @param {string} [lookupCriteria.survey_number] - Survey or Khasra number
   * @param {string} [lookupCriteria.khasra_number] - Alias for survey number
   * @returns {Promise<Object>} The persisted land record from the database
   */
  async importRecordForFarmer(userClient, userId, lookupCriteria = {}) {
    if (!userClient || !userId) {
      throw new Error('LandRecordService: userClient and userId are required to import records.')
    }

    const { district, survey_number, khasra_number, synthetic_farmer_id } = lookupCriteria
    const targetSurvey = survey_number || khasra_number || synthetic_farmer_id

    if (!targetSurvey) {
      const err = new Error('Survey/Khasra number or synthetic_farmer_id is required to import a land record.')
      err.statusCode = 400
      throw err
    }

    // 1. Fetch raw parcel from provider
    const rawRecord = await this.provider.getRecordBySurvey(district, targetSurvey)
    if (!rawRecord) {
      const err = new Error(
        `Synthetic UP land record not found for survey number "${targetSurvey}"${district ? ` in district "${district}"` : ''}.`
      )
      err.statusCode = 404
      throw err
    }

    // 2. Normalize through LandDataNormalizer
    const normalized = LandDataNormalizer.normalize(rawRecord, {
      providerName: this.activeProviderName,
      isSynthetic: true,
      verificationStatus: 'pending',
    })

    // 3. Ensure prerequisite farmer_profiles row exists for foreign key constraint
    const { data: existingFp, error: fpCheckError } = await userClient
      .from('farmer_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (fpCheckError) {
      console.error('Error verifying farmer profile prerequisite:', fpCheckError.message)
      const err = new Error('Failed to verify farmer profile prerequisites.')
      err.statusCode = 500
      throw err
    }

    if (!existingFp) {
      // Auto-provision minimal farmer_profiles record if not yet created
      const { error: fpInsertError } = await userClient
        .from('farmer_profiles')
        .insert({
          id: userId,
          state: normalized.state,
          district: normalized.district,
          village: normalized.village,
        })

      if (fpInsertError) {
        console.error('Error auto-creating farmer profile:', fpInsertError.message)
        const err = new Error('Failed to initialize farmer profile prerequisites.')
        err.statusCode = 500
        throw err
      }
    }

    // 4. Insert normalized land record into database under authenticated farmer's ownership
    const insertPayload = {
      farmer_id: userId,
      survey_number: normalized.survey_number,
      land_area: normalized.land_area,
      area_unit: normalized.area_unit,
      state: normalized.state,
      district: normalized.district,
      village: normalized.village,
      record_type: normalized.record_type,
      extracted_data: normalized.extracted_data,
      verification_status: normalized.verification_status,
    }

    const { data: insertedRecord, error: insertError } = await userClient
      .from('land_records')
      .insert(insertPayload)
      .select(
        'id, farmer_id, survey_number, land_area, area_unit, state, district, village, record_type, extracted_data, verification_status, created_at'
      )
      .single()

    if (insertError) {
      console.error('Error inserting imported land record:', insertError.message)
      const err = new Error('Failed to save imported land record.')
      err.statusCode = 500
      throw err
    }

    return insertedRecord
  }
}

// Export default singleton instance with default synthetic provider
const landRecordService = new LandRecordService()
export default landRecordService

