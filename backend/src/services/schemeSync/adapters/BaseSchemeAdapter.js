// ============================================================
// src/services/schemeSync/adapters/BaseSchemeAdapter.js
// Base Adapter for Official Government Scheme Data Sources
// ============================================================
// Defines the contract and common resilient networking utilities
// for all government scheme adapters.
//
// Key Responsibilities:
//   - Strict HTTP request timeouts (AbortController)
//   - Controlled retries with exponential backoff
//   - SHA-256 cryptographic content hashing
//   - Non-destructive data validation (never wipe valid fields)
//   - Standardized change descriptor output
// ============================================================

import crypto from 'node:crypto'

export class BaseSchemeAdapter {
  /**
   * @param {Object} config
   * @param {string} config.schemeId - Exact Supabase scheme UUID
   * @param {string} config.schemeName - Official scheme name
   * @param {string} config.officialSourceUrl - Verified official URL
   * @param {'automated_check' | 'manual_verification_required'} config.mode - Operational mode
   * @param {number} [config.timeoutMs=8000] - Request timeout in milliseconds
   * @param {number} [config.maxRetries=2] - Maximum retry attempts
   */
  constructor({
    schemeId,
    schemeName,
    officialSourceUrl,
    mode = 'automated_check',
    timeoutMs = 8000,
    maxRetries = 2,
  }) {
    if (!schemeId || !schemeName || !officialSourceUrl) {
      throw new Error('BaseSchemeAdapter requires schemeId, schemeName, and officialSourceUrl.')
    }
    this.schemeId = schemeId
    this.schemeName = schemeName
    this.officialSourceUrl = officialSourceUrl
    this.mode = mode
    this.timeoutMs = timeoutMs
    this.maxRetries = maxRetries
  }

  /**
   * Computes SHA-256 hex digest of string or Buffer.
   * @param {string|Buffer} content
   * @returns {string} SHA-256 hash
   */
  computeHash(content) {
    if (!content) return ''
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  /**
   * Executes HTTP request with strict timeout via AbortController.
   * @param {string} url
   * @param {Object} [options={}] - Fetch options
   * @param {number} [timeoutMs] - Custom timeout in ms
   * @returns {Promise<Response>}
   */
  async fetchWithTimeout(url, options = {}, timeoutMs = this.timeoutMs) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KisanSarthi-SchemeBot/1.0',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.8,*/*;q=0.7',
          ...(options.headers || {}),
        },
      })
      return response
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`)
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Executes an async operation with controlled retries and exponential backoff.
   * @param {Function} operation - Async function to execute
   * @param {number} [retries=this.maxRetries]
   * @param {number} [baseDelayMs=1500]
   * @returns {Promise<*>}
   */
  async executeWithRetry(operation, retries = this.maxRetries, baseDelayMs = 1500) {
    let lastError = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation()
      } catch (err) {
        lastError = err
        if (attempt < retries) {
          const delay = baseDelayMs * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
    throw lastError
  }

  /**
   * Validates that candidate update data is non-empty and structurally safe.
   * Prevents overwriting valid database rows with blank or null responses.
   * @param {Object} candidateData
   * @returns {boolean} True if data is safe to evaluate
   */
  validateCandidateData(candidateData) {
    if (!candidateData || typeof candidateData !== 'object') {
      return false
    }
    // Must contain at least one valid non-empty string field
    const keys = Object.keys(candidateData)
    if (keys.length === 0) return false

    for (const key of keys) {
      const val = candidateData[key]
      if (typeof val === 'string' && val.trim().length > 0) {
        return true
      }
      if (typeof val === 'boolean') {
        return true
      }
    }
    return false
  }

  /**
   * Abstract checkUpdate method to be implemented by child adapters.
   * @param {Object} [previousState={}] - Previous hash, verification dates, etc.
   * @returns {Promise<Object>} Standardized change descriptor
   */
  async checkUpdate(previousState = {}) {
    throw new Error('checkUpdate() must be implemented by child adapter.')
  }
}

