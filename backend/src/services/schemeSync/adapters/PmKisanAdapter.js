// ============================================================
// src/services/schemeSync/adapters/PmKisanAdapter.js
// Official Adapter for PM-KISAN (Central Sector Scheme)
// ============================================================
// Official Source: https://pmkisan.gov.in/
//
// FEASIBILITY CONSTRAINTS (from Phase 1 Research):
//   - No public REST API exists.
//   - Status lookup (KYS) is CAPTCHA/OTP protected and strictly out of bounds.
//   - Operational guidelines and installment circulars are public PDFs.
//   - Automated checking monitors HTTP headers (ETag, Last-Modified)
//     and public notice hashes without scraping citizen-facing forms.
//   - Substantive rule modifications require human confirmation.
// ============================================================

import { BaseSchemeAdapter } from './BaseSchemeAdapter.js'

export class PmKisanAdapter extends BaseSchemeAdapter {
  constructor(options = {}) {
    super({
      schemeId: '9b46b004-8c63-4d94-9bc7-4e5f8e0c02e6',
      schemeName: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
      officialSourceUrl: 'https://pmkisan.gov.in/',
      mode: 'automated_check',
      timeoutMs: options.timeoutMs || 8000,
      maxRetries: options.maxRetries || 2,
    })
    // URL to check for guidelines / operational updates
    this.guidelineUrl =
      options.guidelineUrl ||
      'https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines(English).pdf'
  }

  /**
   * Checks for updates by querying headers or public guideline metadata.
   * @param {Object} [previousState={}] - Previous hash, etag, etc.
   * @returns {Promise<Object>} Change descriptor
   */
  async checkUpdate(previousState = {}) {
    const checkedAt = new Date().toISOString()

    try {
      // Execute conditional HTTP HEAD / GET check with retries
      const result = await this.executeWithRetry(async () => {
        // Attempt HEAD first for efficient bandwidth usage
        try {
          const headRes = await this.fetchWithTimeout(this.officialSourceUrl, {
            method: 'HEAD',
          })
          if (headRes.ok) {
            const etag = headRes.headers.get('etag') || ''
            const lastModified = headRes.headers.get('last-modified') || ''
            return {
              ok: true,
              status: headRes.status,
              etag,
              lastModified,
              sourceText: `${this.officialSourceUrl}:${etag}:${lastModified}`,
            }
          }
        } catch {
          // Fallback to GET if HEAD is refused by server
        }

        const getRes = await this.fetchWithTimeout(this.officialSourceUrl, {
          method: 'GET',
        })
        if (!getRes.ok) {
          throw new Error(`HTTP error ${getRes.status} from ${this.officialSourceUrl}`)
        }

        const etag = getRes.headers.get('etag') || ''
        const lastModified = getRes.headers.get('last-modified') || ''
        const html = await getRes.text()

        // Extract title or main notice snippet for content hashing
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        const title = match ? match[1].trim() : 'PM-KISAN Portal'

        return {
          ok: true,
          status: getRes.status,
          etag,
          lastModified,
          sourceText: `${title}:${etag}:${lastModified}`,
        }
      })

      const currentHash = this.computeHash(result.sourceText)
      const previousHash = previousState.contentHash || ''
      const hasChanged = Boolean(previousHash && currentHash !== previousHash)

      return {
        schemeId: this.schemeId,
        schemeName: this.schemeName,
        mode: this.mode,
        status: hasChanged ? 'change_detected' : 'unchanged',
        sourceUrl: this.officialSourceUrl,
        checkedAt,
        contentHash: currentHash,
        previousHash,
        hasChanged,
        extractedData: {
          official_source_url: this.officialSourceUrl,
          is_active: true,
        },
        requiresManualReview: hasChanged, // Policy changes must be human-confirmed
        changeSummary: hasChanged
          ? 'PM-KISAN source header/content change detected. Verification needed before applying statutory rule changes.'
          : 'Source verified. No policy or guideline modifications detected.',
        error: null,
      }
    } catch (err) {
      return {
        schemeId: this.schemeId,
        schemeName: this.schemeName,
        mode: this.mode,
        status: 'error',
        sourceUrl: this.officialSourceUrl,
        checkedAt,
        contentHash: previousState.contentHash || null,
        previousHash: previousState.contentHash || null,
        hasChanged: false,
        extractedData: null,
        requiresManualReview: true,
        changeSummary: `Unable to verify PM-KISAN: ${err.message}. Existing database records preserved.`,
        error: err.message,
      }
    }
  }
}

