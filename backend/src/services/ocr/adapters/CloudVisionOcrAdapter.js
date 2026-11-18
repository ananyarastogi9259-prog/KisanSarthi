// ============================================================
// src/services/ocr/adapters/CloudVisionOcrAdapter.js
// Cloud Vision / Document AI OCR Adapter (Pluggable)
// ============================================================
// Adapter boundary for Google Cloud Vision / Cloud Document AI.
//
// INTEGRITY RULES:
//   - Requires valid GOOGLE_APPLICATION_CREDENTIALS or CLOUD_VISION_API_KEY.
//   - If credentials are not present, explicitly reports as NOT CONFIGURED.
//   - Does not invent credentials or expose secrets.
// ============================================================

import { BaseOcrAdapter } from './BaseOcrAdapter.js'

export class CloudVisionOcrAdapter extends BaseOcrAdapter {
  constructor(options = {}) {
    super(options)
    this.apiKey = process.env.CLOUD_VISION_API_KEY || null
    this.credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || null
  }

  get providerName() {
    return 'CloudVisionOcrProvider'
  }

  isAvailable() {
    return Boolean(this.apiKey || this.credentialsPath)
  }

  async extractText(fileBuffer, mimeType, options = {}) {
    if (!this.isAvailable()) {
      throw new Error(
        'Cloud Vision OCR provider is not configured. Missing valid credentials. ' +
          'Configure GOOGLE_APPLICATION_CREDENTIALS or use OCR_PROVIDER=mock for local development.'
      )
    }

    // When cloud credentials are provided in future production deployment,
    // this will invoke the official Cloud Vision / Document AI client.
    throw new Error('Cloud Vision API client execution requires active cloud runtime.')
  }
}

export default CloudVisionOcrAdapter

