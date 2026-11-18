// ============================================================
// src/services/ocr/adapters/BaseOcrAdapter.js
// Base Adapter for OCR Engines
// ============================================================
// Defines the common contract for document OCR text extraction.
// ============================================================

export class BaseOcrAdapter {
  constructor(options = {}) {
    this.options = options
  }

  get providerName() {
    return 'BaseOcrAdapter'
  }

  /**
   * Checks whether the provider is configured and available for inference.
   * @returns {boolean}
   */
  isAvailable() {
    return true
  }

  /**
   * Extracts raw text from an image or PDF buffer.
   * @param {Buffer} fileBuffer - File binary data
   * @param {string} mimeType - MIME type ('application/pdf', 'image/jpeg', etc.)
   * @param {Object} [options={}] - Custom extraction options
   * @returns {Promise<{ text: string, confidence: number, provider: string }>}
   */
  async extractText(fileBuffer, mimeType, options = {}) {
    throw new Error('extractText() must be implemented by child adapter.')
  }
}

export default BaseOcrAdapter

