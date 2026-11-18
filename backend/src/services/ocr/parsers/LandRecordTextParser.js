// ============================================================
// src/services/ocr/parsers/LandRecordTextParser.js
// Land Record Text Parser (Devanagari & English)
// ============================================================
// Parses raw text extracted from Indian land records (such as UP
// e-Khatauni, Bihar Khatiyan, Maharashtra 7/12 extracts) into
// structured land attributes.
//
// Key Responsibilities:
//   - Identifies Khasra / Survey Number (खसरा संख्या / गाटा संख्या)
//   - Identifies Khata Number (खाता संख्या)
//   - Identifies Land Area and Unit (क्षेत्रफल, हेक्टेयर / एकड़)
//   - Identifies District, Tehsil, and Village (जनपद, तहसील, ग्राम)
//   - Identifies Tenure Category & Ownership Type (1-क संक्रमणीय / individual / joint)
//   - Masks any detected 12-digit Aadhaar patterns for PII protection
//   - Computes an extraction confidence score (0.0 to 1.0)
// ============================================================

export class LandRecordTextParser {
  /**
   * Masks any detected 12-digit Aadhaar patterns in extracted text.
   * Format: XXXX-XXXX-1234
   * @param {string} text
   * @returns {string} Sanitized text
   */
  static maskAadhaar(text) {
    if (!text || typeof text !== 'string') return ''
    return text.replace(/\b(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})\b/g, 'XXXX-XXXX-$3')
  }

  /**
   * Parses raw OCR text into structured land record fields.
   * @param {string} rawText - Raw OCR output
   * @returns {Object} Structured draft fields and parsing metadata
   */
  static parse(rawText) {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return {
        survey_number: null,
        khata_number: null,
        land_area: null,
        area_unit: 'acres',
        state: 'Uttar Pradesh',
        district: null,
        tehsil: null,
        village: null,
        ownership_type: null,
        land_type: null,
        holder_name: null,
        confidence: 0,
        raw_text_snippet: '',
        is_empty: true,
      }
    }

    const sanitized = LandRecordTextParser.maskAadhaar(rawText)
    const lines = sanitized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

    let surveyNumber = null
    let khataNumber = null
    let landArea = null
    let areaUnit = 'acres'
    let state = 'Uttar Pradesh'
    let district = null
    let tehsil = null
    let village = null
    let ownershipType = 'individual'
    let landType = 'agricultural_cultivable'
    let holderName = null

    // ── 1. Khasra / Survey / Gata Number Matching ────────────────
    // Hindi: खसरा संख्या / गाटा संख्या / खसरा नं
    // English: Khasra No / Survey No / Gata No / Plot No
    const khasraRegexes = [
      /(?:खसरा\s*(?:संख्या|सं०|नंबर|नं|क्र०)?|गाटा\s*(?:संख्या|सं०|नंबर)?|khasra\s*(?:no|number)?|survey\s*(?:no|number)?|gata\s*(?:no)?)\s*[:=\-]?\s*([0-9]+(?:\/[0-9]+|[a-zA-Z0-9\/-]+))/i,
      /\b(?:plot|survey|khasra|gata)\s*#?\s*([0-9]+(?:\/[0-9]+)?)\b/i,
    ]
    for (const regex of khasraRegexes) {
      const match = sanitized.match(regex)
      if (match && match[1]) {
        surveyNumber = match[1].trim()
        break
      }
    }

    // ── 2. Khata Number Matching ─────────────────────────────────
    // Hindi: खाता संख्या / खाता सं० / खाता नं
    // English: Khata No / Holding No
    const khataRegex =
      /(?:खाता\s*(?:संख्या|सं०|नंबर|नं)?|khata\s*(?:no|number)?|holding\s*no)\s*[:=\-]?\s*([0-9]+(?:\/[0-9]+)?)/i
    const khataMatch = sanitized.match(khataRegex)
    if (khataMatch && khataMatch[1]) {
      khataNumber = khataMatch[1].trim()
    }

    // ── 3. Land Area and Unit Matching ───────────────────────────
    // Hindi: क्षेत्रफल : 0.4050 हेक्टेयर / एकड़
    // English: Area: 2.50 Acres / Hectares
    const areaRegexes = [
      /(?:क्षेत्रफल|area|land\s*area|कुल\s*क्षेत्रफल)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(हेक्टेयर|हेक्टेअर|हे०|hectare|hectares|एकड़|एकड़|acres|acre|bigha|बीघा)?/i,
      /([0-9]+(?:\.[0-9]+)?)\s*(हेक्टेयर|हेक्टेअर|हे०|hectare|hectares|एकड़|एकड़|acres|acre)\b/i,
    ]
    for (const regex of areaRegexes) {
      const match = sanitized.match(regex)
      if (match && match[1]) {
        const rawNum = Number(match[1])
        if (!isNaN(rawNum) && rawNum > 0) {
          const rawUnit = (match[2] || '').toLowerCase()
          if (
            rawUnit.includes('हेक्टेयर') ||
            rawUnit.includes('हेक्टेअर') ||
            rawUnit.includes('हे०') ||
            rawUnit.includes('hectare')
          ) {
            areaUnit = 'hectares'
            landArea = rawNum
          } else {
            areaUnit = 'acres'
            landArea = rawNum
          }
          break
        }
      }
    }

    // ── 4. District Matching ─────────────────────────────────────
    // Hindi: जनपद / जिला
    // English: District
    const districtRegex =
      /(?:जनपद|ज़िला|जिला|district)\s*[:=\-]?\s*([\u0900-\u097F\w\s]+?)(?:,|\n|तहसील|tehsil|परगना|$)/i
    const distMatch = sanitized.match(districtRegex)
    if (distMatch && distMatch[1]) {
      district = distMatch[1].trim()
    }

    // ── 5. Tehsil Matching ───────────────────────────────────────
    const tehsilRegex =
      /(?:तहसील|उपखंड|tehsil|sub-district|taluka)\s*[:=\-]?\s*([\u0900-\u097F\w\s]+?)(?:,|\n|परगना|ग्राम|village|$)/i
    const tehsilMatch = sanitized.match(tehsilRegex)
    if (tehsilMatch && tehsilMatch[1]) {
      tehsil = tehsilMatch[1].trim()
    }

    // ── 6. Village Matching ──────────────────────────────────────
    const villageRegex =
      /(?:ग्राम|गाँव|मौजा|village)\s*[:=\-]?\s*([\u0900-\u097F\w\s]+?)(?:,|\n|फसली|fasli|खाता|$)/i
    const villMatch = sanitized.match(villageRegex)
    if (villMatch && villMatch[1]) {
      village = villMatch[1].trim()
    }

    // ── 7. Ownership & Category Matching ─────────────────────────
    if (
      sanitized.includes('संयुक्त') ||
      sanitized.includes('joint') ||
      sanitized.includes('सह-खातेदार')
    ) {
      ownershipType = 'joint'
    } else if (
      sanitized.includes('पट्टेदार') ||
      sanitized.includes('किराएदार') ||
      sanitized.includes('tenant') ||
      sanitized.includes('lease')
    ) {
      ownershipType = 'tenant'
    } else {
      ownershipType = 'individual'
    }

    // Tenure category (UP Bhulekh 1-क: संक्रमणीय भूमिधर = cultivable agricultural ownership)
    if (
      sanitized.includes('संक्रमणीय') ||
      sanitized.includes('1-क') ||
      sanitized.includes('कृषि') ||
      sanitized.includes('agricultural')
    ) {
      landType = 'agricultural_cultivable'
    } else if (
      sanitized.includes('गैर-कृषि') ||
      sanitized.includes('आबादी') ||
      sanitized.includes('residential') ||
      sanitized.includes('commercial')
    ) {
      landType = 'commercial'
    }

    // ── 8. Holder Name Matching ──────────────────────────────────
    const nameRegex =
      /(?:खातेदार\s*का\s*नाम|काश्तकार|नाम|landholder|holder\s*name)\s*[:=\-]?\s*([\u0900-\u097F\w\s]+?)(?:,|\n|पिता|पति|$)/i
    const nameMatch = sanitized.match(nameRegex)
    if (nameMatch && nameMatch[1]) {
      holderName = nameMatch[1].trim()
    }

    // ── 9. Calculate Parsing Confidence ──────────────────────────
    let score = 0
    if (surveyNumber) score += 0.35
    if (landArea !== null) score += 0.35
    if (district) score += 0.15
    if (village) score += 0.15

    return {
      survey_number: surveyNumber,
      khata_number: khataNumber,
      land_area: landArea,
      area_unit: areaUnit,
      state: state || 'Uttar Pradesh',
      district: district,
      tehsil: tehsil,
      village: village,
      ownership_type: ownershipType,
      land_type: landType,
      holder_name: holderName,
      confidence: Math.round(score * 100) / 100,
      raw_text_snippet: sanitized.slice(0, 500),
      is_empty: false,
    }
  }
}

export default LandRecordTextParser

