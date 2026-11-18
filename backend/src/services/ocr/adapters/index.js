// ============================================================
// src/services/ocr/adapters/index.js
// OCR Adapter Registry & Factory
// ============================================================

import { MockOcrAdapter } from './MockOcrAdapter.js'
import { CloudVisionOcrAdapter } from './CloudVisionOcrAdapter.js'
import { TesseractOcrAdapter } from './TesseractOcrAdapter.js'

export const OCR_ADAPTER_REGISTRY = {
  mock: MockOcrAdapter,
  cloud_vision: CloudVisionOcrAdapter,
  tesseract: TesseractOcrAdapter,
}

/**
 * Returns an instance of the configured OCR adapter.
 * Configured via OCR_PROVIDER in .env (defaults to 'mock').
 *
 * @param {string} [providerName] - Optional provider override
 * @param {Object} [options={}] - Options passed to adapter
 * @returns {import('./BaseOcrAdapter.js').BaseOcrAdapter}
 */
export function getOcrAdapter(providerName = null, options = {}) {
  const selected = (providerName || process.env.OCR_PROVIDER || 'mock').toLowerCase().trim()
  const AdapterClass = OCR_ADAPTER_REGISTRY[selected] || MockOcrAdapter
  return new AdapterClass(options)
}

export {
  MockOcrAdapter,
  CloudVisionOcrAdapter,
  TesseractOcrAdapter,
}

