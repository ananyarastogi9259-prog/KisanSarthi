// ============================================================
// src/services/LandDataNormalizer.js
// Land Data Normalizer
// ============================================================
// Normalizes raw land records from various providers (synthetic or
// real state land portals) into the standardized schema matching
// the existing `land_records` database table.
//
// Existing `land_records` columns targeted:
//   - survey_number (text)
//   - land_area (numeric)
//   - area_unit (text)
//   - state (text)
//   - district (text)
//   - village (text)
//   - record_type (text) -> 'synthetic'
//   - extracted_data (jsonb) -> rich extracted metadata & farmer attributes
//   - verification_status (text) -> 'pending' (per DB check constraint)
// ============================================================

export class LandDataNormalizer {
  /**
   * Normalizes a raw land record (from SyntheticUPLandProvider or real UP API)
   * into the exact shape expected by the `land_records` database table.
   *
   * @param {Object} rawRecord - Raw payload from provider
   * @param {Object} [options] - Normalization options
   * @param {string} [options.providerName='SyntheticUPLandProvider'] - Provider attribution
   * @param {boolean} [options.isSynthetic=true] - Whether record is synthetic
   * @returns {Object} Normalized land record ready for database insertion
   */
  static normalize(rawRecord, options = {}) {
    if (!rawRecord || typeof rawRecord !== 'object') {
      throw new Error('LandDataNormalizer: rawRecord must be a valid object.')
    }

    const {
      providerName = 'SyntheticUPLandProvider',
      isSynthetic = true,
      verificationStatus = 'pending',
    } = options

    // 1. Extract survey / khasra number
    const surveyNumber = (
      rawRecord.survey_number ||
      rawRecord.khasra_number ||
      rawRecord.gata_number ||
      ''
    ).toString().trim()

    // 2. Extract and parse land area
    let landArea = null
    const rawArea =
      rawRecord.land_area !== undefined
        ? rawRecord.land_area
        : rawRecord.land_area_acres !== undefined
          ? rawRecord.land_area_acres
          : rawRecord.land_area_hectares !== undefined
            ? rawRecord.land_area_hectares
            : rawRecord.area

    if (rawArea !== undefined && rawArea !== null && rawArea !== '') {
      landArea = Number(rawArea)
      if (isNaN(landArea) || landArea < 0) {
        throw new Error('LandDataNormalizer: land_area must be a valid non-negative number.')
      }
    }

    // 3. Extract area unit
    const areaUnit = (
      rawRecord.area_unit ||
      (rawRecord.land_area_acres !== undefined ? 'acres' : 'hectares')
    ).toString().trim()

    // 4. Extract state, district, village
    const state = (rawRecord.state || 'Uttar Pradesh').toString().trim()
    const district = (rawRecord.district || '').toString().trim()
    const village = (rawRecord.village || '').toString().trim()

    // 5. Build rich extracted_data JSON payload
    // Preserves provider-specific fields and farmer eligibility attributes
    // without requiring database schema changes or hardcoding eligibility results
    const extractedData = {
      source: isSynthetic ? 'synthetic_up_land_provider' : 'up_government_portal',
      provider: providerName,
      is_demo: Boolean(isSynthetic),
      disclaimer: isSynthetic
        ? 'Synthetic demo record for development and testing purposes only. Not official government data.'
        : undefined,
      synthetic_farmer_id: rawRecord.synthetic_farmer_id || rawRecord.provider_record_id || null,
      khasra_number: surveyNumber || null,
      land_type: rawRecord.land_type || rawRecord.land_category || null,
      ownership_type: rawRecord.ownership_type || null,
      primary_crop: rawRecord.primary_crop || null,
      farmer_category: rawRecord.farmer_category || null,
      irrigation_status: rawRecord.irrigation_status || rawRecord.irrigation_source || null,
      annual_income_inr:
        rawRecord.annual_income_inr !== undefined ? Number(rawRecord.annual_income_inr) : null,
      age: rawRecord.age !== undefined ? Number(rawRecord.age) : null,
      gender: rawRecord.gender || null,
      aadhaar_verified_demo:
        rawRecord.aadhaar_verified_demo !== undefined
          ? Boolean(rawRecord.aadhaar_verified_demo)
          : null,
      existing_loan_demo:
        rawRecord.existing_loan_demo !== undefined ? Boolean(rawRecord.existing_loan_demo) : null,
      land_document_available_demo:
        rawRecord.land_document_available_demo !== undefined
          ? Boolean(rawRecord.land_document_available_demo)
          : null,
      tehsil: rawRecord.tehsil || null,
      khata_number: rawRecord.khata_number || null,
      holder_name_masked: rawRecord.holder_name_masked || 'Demo Landholder (Fictional)',
      imported_at: new Date().toISOString(),
    }

    // Clean undefined and null fields in extractedData if needed, keeping false and 0
    Object.keys(extractedData).forEach((key) => {
      if (extractedData[key] === undefined) {
        delete extractedData[key]
      }
    })

    return {
      survey_number: surveyNumber || null,
      land_area: landArea,
      area_unit: areaUnit || 'acres',
      state: state || 'Uttar Pradesh',
      district: district || null,
      village: village || null,
      record_type: isSynthetic ? 'synthetic' : 'official_record',
      extracted_data: extractedData,
      verification_status: verificationStatus,
    }
  }

  /**
   * Normalizes an array of raw land records.
   *
   * @param {Array<Object>} rawRecords
   * @param {Object} [options]
   * @returns {Array<Object>}
   */
  static normalizeBatch(rawRecords, options = {}) {
    if (!Array.isArray(rawRecords)) {
      throw new Error('LandDataNormalizer: rawRecords must be an array.')
    }
    return rawRecords.map((rec) => LandDataNormalizer.normalize(rec, options))
  }
}

export default LandDataNormalizer
