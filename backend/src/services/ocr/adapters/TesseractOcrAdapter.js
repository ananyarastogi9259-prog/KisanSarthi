// ============================================================
// src/services/ocr/adapters/TesseractOcrAdapter.js
// Local Tesseract OCR Adapter (Pluggable)
// ============================================================
// Adapter boundary for local Tesseract.js / node-tesseract engine.
// Provides open-source, local, zero-cost OCR with Hindi ('hin')
// and English ('eng') support.
// ============================================================

import { BaseOcrAdapter } from './BaseOcrAdapter.js'

export class TesseractOcrAdapter extends BaseOcrAdapter {
  constructor(options = {}) {
    super(options)
    this.tesseractAvailable = false
  }

  get providerName() {
    return 'TesseractOcrProvider'
  }

  isAvailable() {
    return this.tesseractAvailable
  }

  async extractText(fileBuffer, mimeType, options = {}) {
    if (!this.isAvailable()) {
      throw new Error(
        'Tesseract OCR provider is not configured or tesseract.js is not installed. ' +
          'Use OCR_PROVIDER=mock for development.'
      )
    }

    throw new Error('Tesseract execution requires tesseract.js installation.')
  }
}

export default TesseractOcrAdapter

