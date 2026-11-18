// ============================================================
// src/services/ocr/adapters/MockOcrAdapter.js
// Mock OCR Adapter for Testing and Local Development
// ============================================================
// Provides deterministic, zero-dependency OCR text extraction
// seeded with realistic Uttar Pradesh e-Khatauni and land extracts.
//
// Allows testing the complete upload, extraction, and farmer
// confirmation pipeline without incurring cloud costs or requiring
// native binary OCR compilation.
// ============================================================

import { BaseOcrAdapter } from './BaseOcrAdapter.js'

export class MockOcrAdapter extends BaseOcrAdapter {
  get providerName() {
    return 'MockOcrProvider'
  }

  isAvailable() {
    return true
  }

  /**
   * Extracts text from buffer using mock fixtures or test content.
   * @param {Buffer} fileBuffer
   * @param {string} mimeType
   * @param {Object} [options={}]
   * @returns {Promise<{ text: string, confidence: number, provider: string }>}
   */
  async extractText(fileBuffer, mimeType, options = {}) {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('MockOcrAdapter: fileBuffer must be a valid Buffer.')
    }

    // Check for simulated poor/empty documents in test cases
    const bufferStr = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 256))

    if (fileBuffer.length < 30 || bufferStr.includes('EMPTY_DOCUMENT')) {
      return {
        text: '',
        confidence: 0,
        provider: this.providerName,
      }
    }

    if (bufferStr.includes('UNREADABLE_DOCUMENT') || bufferStr.includes('BLURRY')) {
      return {
        text: '--- ??? %%% unreadable smudge 000 ---',
        confidence: 0.1,
        provider: this.providerName,
      }
    }

    // If test explicitly passed custom simulated text in options
    if (options.simulatedText) {
      return {
        text: options.simulatedText,
        confidence: options.simulatedConfidence || 0.9,
        provider: this.providerName,
      }
    }

    // Default: Return realistic UP e-Khatauni text template
    const isEnglish = bufferStr.includes('ENGLISH_RECORD') || options.language === 'en'

    if (isEnglish) {
      return {
        text: `
GOVERNMENT OF UTTAR PRADESH - REVENUE DEPARTMENT
RECORD OF RIGHTS (KHATAUNI EXTRACT)
--------------------------------------------------
State: Uttar Pradesh
District: Gorakhpur
Tehsil: Pipraich
Village: Pipraich
Fasli Year: 1428-1433
Khata No: 00341
Khasra No: 786/A
Land Area: 2.20 Acres
Ownership: Individual
Category: Agricultural Cultivable (1-Ka Bhumidhari)
Landholder Name: Ram Kumar
Father Name: Shyam Lal
Verification Status: Pending Patwari Audit
--------------------------------------------------
        `.trim(),
        confidence: 0.95,
        provider: this.providerName,
      }
    }

    // Devanagari Hindi UP e-Khatauni template
    return {
      text: `
उत्तर प्रदेश सरकार - राजस्व परिषद
उद्धरण खतौनी (अधिकार अभिलेख)
--------------------------------------------------
जनपद : वाराणसी
तहसील : पिण्डरा
परगना : शिवपुर
ग्राम : शिवपुर
फसली वर्ष : 1428-1433
खाता संख्या : 00142
खसरा संख्या : 104/2
क्षेत्रफल : 0.8090 हेक्टेयर (2.00 एकड़)
श्रेणी : 1-क भूमि जो संक्रमणीय भूमिधरों के अधिकार में हो
स्वामित्व प्रकार : एकल (Individual)
खातेदार का नाम : राम कुमार
पिता का नाम : श्याम लाल
पहचान : XXXX-XXXX-4512
--------------------------------------------------
      `.trim(),
      confidence: 0.92,
      provider: this.providerName,
    }
  }
}

export default MockOcrAdapter

