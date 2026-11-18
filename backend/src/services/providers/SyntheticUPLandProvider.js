// ============================================================
// src/services/providers/SyntheticUPLandProvider.js
// Synthetic Uttar Pradesh (UP) Land Data Provider
// ============================================================
// Simulates an external UP Land Records (Bhulekh) data provider
// using the finalized 25-record synthetic UP farmer eligibility dataset:
// `synthetic_up_farmer_eligibility_dataset.csv`.
//
// ⚠️  IMPORTANT DISCLAIMER & DESIGN RULES:
// 1. All records are 100% SYNTHETIC AND FICTIONAL for development/demo.
// 2. Contains NO real farmer personal data or official government secrets.
// 3. Does NOT contain any `eligible` or `scheme_eligible` column.
// 4. Does NOT hardcode eligibility results — preserves varied attributes
//    (land_area, land_type, ownership, crop, income, age, gender, loans)
//    so the future dynamic eligibility engine can compute eligibility
//    per scheme.
// ============================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Fallback static dataset of 25 fictional UP records matching the CSV
 * to guarantee zero-downtime execution in any deployment context.
 */
const FALLBACK_SYNTHETIC_RECORDS = [
  { synthetic_farmer_id: 'UP-FARM-001', district: 'Meerut', village: 'Kalyanpur (Demo)', khasra_number: '142/1', land_area_acres: 1.85, land_type: 'Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Wheat', farmer_category: 'Marginal', irrigation_status: 'Canal & Tube well', annual_income_inr: 85000, age: 38, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-002', district: 'Mathura', village: 'Govardhanpur (Demo)', khasra_number: '205/3', land_area_acres: 3.20, land_type: 'Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Mustard', farmer_category: 'Small', irrigation_status: 'Tube well', annual_income_inr: 140000, age: 45, gender: 'Female', aadhaar_verified_demo: true, existing_loan_demo: true, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-003', district: 'Agra', village: 'Fatehpur (Demo)', khasra_number: '88/2', land_area_acres: 0.95, land_type: 'Semi-Irrigated Agricultural', ownership_type: 'Joint / Ancestral', primary_crop: 'Potato', farmer_category: 'Marginal', irrigation_status: 'Borewell', annual_income_inr: 62000, age: 29, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-004', district: 'Aligarh', village: 'Haridaspur (Demo)', khasra_number: '314/1', land_area_acres: 7.50, land_type: 'Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Wheat', farmer_category: 'Large', irrigation_status: 'Canal & Tube well', annual_income_inr: 480000, age: 56, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: true, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-005', district: 'Lucknow', village: 'Mohanpur (Demo)', khasra_number: '59/4', land_area_acres: 2.10, land_type: 'Multi-crop Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Vegetables', farmer_category: 'Marginal', irrigation_status: 'Solar Pump', annual_income_inr: 110000, age: 34, gender: 'Female', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-006', district: 'Varanasi', village: 'Shivpur (Demo)', khasra_number: '118/2', land_area_acres: 1.20, land_type: 'Irrigated Agricultural', ownership_type: 'Sharecropper / Leaseholder', primary_crop: 'Paddy (Rice)', farmer_category: 'Marginal', irrigation_status: 'Canal', annual_income_inr: 54000, age: 26, gender: 'Male', aadhaar_verified_demo: false, existing_loan_demo: false, land_document_available_demo: false },
  { synthetic_farmer_id: 'UP-FARM-007', district: 'Prayagraj', village: 'Naini Demo', khasra_number: '245/1', land_area_acres: 4.80, land_type: 'Rainfed / Dryland', ownership_type: 'Individual Owner', primary_crop: 'Pulses (Gram)', farmer_category: 'Small', irrigation_status: 'Rainfed', annual_income_inr: 98000, age: 62, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: true, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-008', district: 'Gorakhpur', village: 'Chauri Demo', khasra_number: '77/3', land_area_acres: 1.60, land_type: 'Irrigated Agricultural', ownership_type: 'Joint / Ancestral', primary_crop: 'Sugarcane', farmer_category: 'Marginal', irrigation_status: 'Tube well', annual_income_inr: 92000, age: 41, gender: 'Female', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-009', district: 'Jhansi', village: 'Babina Demo', khasra_number: '163/1', land_area_acres: 12.00, land_type: 'Rainfed / Dryland', ownership_type: 'Individual Owner', primary_crop: 'Soybean', farmer_category: 'Large', irrigation_status: 'Rainfed', annual_income_inr: 350000, age: 52, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: true, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-010', district: 'Bareilly', village: 'Faridpur Demo', khasra_number: '94/5', land_area_acres: 2.40, land_type: 'Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Wheat', farmer_category: 'Marginal', irrigation_status: 'Canal', annual_income_inr: 125000, age: 31, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-011', district: 'Ayodhya', village: 'Bikapur Demo', khasra_number: '201/2', land_area_acres: 3.80, land_type: 'Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Paddy (Rice)', farmer_category: 'Small', irrigation_status: 'Tube well', annual_income_inr: 175000, age: 48, gender: 'Female', aadhaar_verified_demo: true, existing_loan_demo: true, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-012', district: 'Kanpur Nagar', village: 'Bilhaur Demo', khasra_number: '33/1', land_area_acres: 0.75, land_type: 'Semi-Irrigated Agricultural', ownership_type: 'Tenant Farmer', primary_crop: 'Maize', farmer_category: 'Marginal', irrigation_status: 'Tube well', annual_income_inr: 45000, age: 23, gender: 'Male', aadhaar_verified_demo: false, existing_loan_demo: false, land_document_available_demo: false },
  { synthetic_farmer_id: 'UP-FARM-013', district: 'Meerut', village: 'Mawana Demo', khasra_number: '219/4', land_area_acres: 6.20, land_type: 'Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Sugarcane', farmer_category: 'Medium', irrigation_status: 'Canal & Tube well', annual_income_inr: 390000, age: 59, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: true, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-014', district: 'Mathura', village: 'Chhata Demo', khasra_number: '155/2', land_area_acres: 1.90, land_type: 'Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Barley', farmer_category: 'Marginal', irrigation_status: 'Tube well', annual_income_inr: 88000, age: 36, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-015', district: 'Agra', village: 'Kheragarh Demo', khasra_number: '42/3', land_area_acres: 14.50, land_type: 'Semi-Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Mustard', farmer_category: 'Large', irrigation_status: 'Borewell', annual_income_inr: 720000, age: 64, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-016', district: 'Aligarh', village: 'Atrauli Demo', khasra_number: '280/1', land_area_acres: 2.30, land_type: 'Irrigated Agricultural', ownership_type: 'Joint / Ancestral', primary_crop: 'Maize', farmer_category: 'Marginal', irrigation_status: 'Canal', annual_income_inr: 105000, age: 27, gender: 'Female', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-017', district: 'Lucknow', village: 'Malihabad Demo', khasra_number: '104/2', land_area_acres: 4.20, land_type: 'Orchard / Horticulture', ownership_type: 'Individual Owner', primary_crop: 'Mango / Fruits', farmer_category: 'Small', irrigation_status: 'Drip Irrigation', annual_income_inr: 260000, age: 50, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: true, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-018', district: 'Varanasi', village: 'Pindra Demo', khasra_number: '66/1', land_area_acres: 0.50, land_type: 'Irrigated Agricultural', ownership_type: 'Sharecropper / Leaseholder', primary_crop: 'Vegetables', farmer_category: 'Marginal', irrigation_status: 'Tube well', annual_income_inr: 38000, age: 21, gender: 'Female', aadhaar_verified_demo: false, existing_loan_demo: false, land_document_available_demo: false },
  { synthetic_farmer_id: 'UP-FARM-019', district: 'Prayagraj', village: 'Phulpur Demo', khasra_number: '189/3', land_area_acres: 3.50, land_type: 'Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Wheat', farmer_category: 'Small', irrigation_status: 'Canal', annual_income_inr: 160000, age: 43, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-020', district: 'Gorakhpur', village: 'Sahjanwa Demo', khasra_number: '312/2', land_area_acres: 1.75, land_type: 'Rainfed / Dryland', ownership_type: 'Joint / Ancestral', primary_crop: 'Paddy (Rice)', farmer_category: 'Marginal', irrigation_status: 'Rainfed', annual_income_inr: 78000, age: 68, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: true, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-021', district: 'Jhansi', village: 'Mauranipur Demo', khasra_number: '85/4', land_area_acres: 5.50, land_type: 'Rainfed / Dryland', ownership_type: 'Individual Owner', primary_crop: 'Pulses (Arhar)', farmer_category: 'Medium', irrigation_status: 'Rainfed', annual_income_inr: 190000, age: 55, gender: 'Female', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-022', district: 'Bareilly', village: 'Baheri Demo', khasra_number: '172/1', land_area_acres: 8.00, land_type: 'Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Sugarcane', farmer_category: 'Large', irrigation_status: 'Canal & Tube well', annual_income_inr: 510000, age: 61, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: true, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-023', district: 'Ayodhya', village: 'Rudauli Demo', khasra_number: '99/2', land_area_acres: 2.00, land_type: 'Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Wheat', farmer_category: 'Marginal', irrigation_status: 'Tube well', annual_income_inr: 115000, age: 39, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-024', district: 'Kanpur Nagar', village: 'Ghatampur Demo', khasra_number: '141/3', land_area_acres: 3.10, land_type: 'Semi-Irrigated Agricultural', ownership_type: 'Individual Owner', primary_crop: 'Mustard', farmer_category: 'Small', irrigation_status: 'Tube well', annual_income_inr: 145000, age: 47, gender: 'Male', aadhaar_verified_demo: true, existing_loan_demo: true, land_document_available_demo: true },
  { synthetic_farmer_id: 'UP-FARM-025', district: 'Meerut', village: 'Sardhana Demo', khasra_number: '53/1', land_area_acres: 0.80, land_type: 'Irrigated Agricultural', ownership_type: 'Tenant Farmer', primary_crop: 'Vegetables', farmer_category: 'Marginal', irrigation_status: 'Solar Pump', annual_income_inr: 52000, age: 25, gender: 'Female', aadhaar_verified_demo: true, existing_loan_demo: false, land_document_available_demo: false },
]

/**
 * Loads and parses records dynamically from the CSV dataset if available.
 */
function loadDataset() {
  const possiblePaths = [
    path.resolve(__dirname, '../../data/synthetic_up_farmer_eligibility_dataset.csv'),
    path.resolve(__dirname, '../../../../synthetic_up_farmer_eligibility_dataset.csv'),
    path.resolve(process.cwd(), 'backend/src/data/synthetic_up_farmer_eligibility_dataset.csv'),
    path.resolve(process.cwd(), 'synthetic_up_farmer_eligibility_dataset.csv'),
  ]

  for (const csvPath of possiblePaths) {
    if (fs.existsSync(csvPath)) {
      try {
        const rawContent = fs.readFileSync(csvPath, 'utf-8')
        const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0)
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h) => h.trim())
          const records = lines.slice(1).map((line) => {
            const vals = line.split(',').map((v) => v.trim())
            const rec = {}
            headers.forEach((h, i) => {
              rec[h] = vals[i]
            })
            return {
              synthetic_farmer_id: rec.synthetic_farmer_id,
              provider_record_id: rec.synthetic_farmer_id,
              state: 'Uttar Pradesh',
              district: rec.district,
              village: rec.village,
              khasra_number: rec.khasra_number,
              survey_number: rec.khasra_number,
              land_area_acres: parseFloat(rec.land_area_acres) || 0,
              land_area: parseFloat(rec.land_area_acres) || 0,
              area_unit: 'acres',
              land_type: rec.land_type,
              ownership_type: rec.ownership_type,
              primary_crop: rec.primary_crop,
              farmer_category: rec.farmer_category,
              irrigation_status: rec.irrigation_status,
              annual_income_inr: parseInt(rec.annual_income_inr, 10) || 0,
              age: parseInt(rec.age, 10) || 0,
              gender: rec.gender,
              aadhaar_verified_demo: rec.aadhaar_verified_demo === 'true',
              existing_loan_demo: rec.existing_loan_demo === 'true',
              land_document_available_demo: rec.land_document_available_demo === 'true',
              holder_name_masked: `Demo Farmer ${rec.synthetic_farmer_id} (Fictional)`,
              is_demo: true,
              data_source: 'SYNTHETIC_UP_LAND_PROVIDER',
            }
          })
          if (records.length > 0) {
            return records
          }
        }
      } catch (err) {
        console.warn('SyntheticUPLandProvider: could not parse CSV, using fallback static dataset:', err.message)
      }
    }
  }

  // Fallback if file not read
  return FALLBACK_SYNTHETIC_RECORDS.map((r) => ({
    ...r,
    provider_record_id: r.synthetic_farmer_id,
    state: 'Uttar Pradesh',
    survey_number: r.khasra_number,
    land_area: r.land_area_acres,
    area_unit: 'acres',
    holder_name_masked: `Demo Farmer ${r.synthetic_farmer_id} (Fictional)`,
    is_demo: true,
    data_source: 'SYNTHETIC_UP_LAND_PROVIDER',
  }))
}

export class SyntheticUPLandProvider {
  constructor() {
    this.dataset = loadDataset()
  }

  /**
   * Identifies this provider implementation.
   */
  static get providerName() {
    return 'SyntheticUPLandProvider'
  }

  /**
   * Returns metadata indicating the provider is synthetic/demo.
   */
  static get isSynthetic() {
    return true
  }

  /**
   * Retrieves all 25 synthetic UP sample records.
   * Useful for development, testing, and UI demo selectors.
   *
   * @returns {Promise<Array<Object>>}
   */
  async getAllRecords() {
    return JSON.parse(JSON.stringify(this.dataset))
  }

  /**
   * Searches synthetic records by district, village, and/or survey/khasra number.
   *
   * @param {Object} criteria
   * @param {string} [criteria.district]
   * @param {string} [criteria.village]
   * @param {string} [criteria.survey_number]
   * @param {string} [criteria.khasra_number]
   * @param {string} [criteria.synthetic_farmer_id]
   * @returns {Promise<Array<Object>>}
   */
  async searchRecords(criteria = {}) {
    const { district, village, survey_number, khasra_number, synthetic_farmer_id } = criteria
    const targetSurvey = (survey_number || khasra_number || '').trim().toLowerCase()
    const targetDistrict = (district || '').trim().toLowerCase()
    const targetVillage = (village || '').trim().toLowerCase()
    const targetId = (synthetic_farmer_id || '').trim().toLowerCase()

    const results = this.dataset.filter((rec) => {
      if (targetId && !rec.synthetic_farmer_id.toLowerCase().includes(targetId)) {
        return false
      }
      if (targetDistrict && !rec.district.toLowerCase().includes(targetDistrict)) {
        return false
      }
      if (targetVillage && !rec.village.toLowerCase().includes(targetVillage)) {
        return false
      }
      if (targetSurvey && !rec.khasra_number.toLowerCase().includes(targetSurvey)) {
        return false
      }
      return true
    })

    return JSON.parse(JSON.stringify(results))
  }

  /**
   * Looks up a single synthetic record by district and survey/khasra number, or by synthetic ID.
   *
   * @param {string} district
   * @param {string} surveyNumber
   * @returns {Promise<Object|null>}
   */
  async getRecordBySurvey(district, surveyNumber) {
    if (!surveyNumber) return null

    const targetSurvey = surveyNumber.trim().toLowerCase()
    const targetDistrict = (district || '').trim().toLowerCase()

    const match = this.dataset.find((rec) => {
      const surveyMatches =
        rec.khasra_number.toLowerCase() === targetSurvey ||
        rec.synthetic_farmer_id.toLowerCase() === targetSurvey

      if (targetDistrict) {
        return surveyMatches && rec.district.toLowerCase() === targetDistrict
      }
      return surveyMatches
    })

    return match ? JSON.parse(JSON.stringify(match)) : null
  }
}

// Export default singleton instance
const syntheticUPLandProvider = new SyntheticUPLandProvider()
export default syntheticUPLandProvider
