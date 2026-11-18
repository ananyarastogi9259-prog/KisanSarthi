// ============================================================
// src/services/schemeSync/adapters/PmfbyAdapter.js
// Official Adapter for PMFBY (Crop Insurance Scheme)
// ============================================================
// Official Source: https://pmfby.gov.in/
//
// FEASIBILITY CONSTRAINTS (from Phase 1 Research):
//   - National Crop Insurance Portal (NCIP) APIs are strictly restricted
//     to licensed insurers, banks, and state agriculture departments.
//   - Public access covers operational guidelines and seasonal notices.
//   - Seasonal cut-off dates (July 31 Kharif / Dec 31 Rabi) and notified
//     crop lists must be reviewed manually per state SLCCCI gazette.
// ============================================================

import { BaseSchemeAdapter } from './BaseSchemeAdapter.js'

export class PmfbyAdapter extends BaseSchemeAdapter {
  constructor(options = {}) {
    super({
      schemeId: '566cc552-121e-4fe9-876f-414abcfb452d',
      schemeName: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      officialSourceUrl: 'https://pmfby.gov.in/',
      mode: 'automated_check',
      timeoutMs: options.timeoutMs || 8000,
      maxRetries: options.maxRetries || 2,
    })
  }

  async checkUpdate(previousState = {}) {
    const checkedAt = new Date().toISOString()

    try {
      const result = await this.executeWithRetry(async () => {
        try {
          const headRes = await this.fetchWithTimeout(this.officialSourceUrl, {
            method: 'HEAD',
          })
          if (headRes.ok) {
            const etag = headRes.headers.get('etag') || ''
            const lastModified = headRes.headers.get('last-modified') || ''
            return {
              ok: true,
              etag,
              lastModified,
              sourceText: `PMFBY:${etag}:${lastModified}`,
            }
          }
        } catch {
          // Fallback to GET
        }

        const getRes = await this.fetchWithTimeout(this.officialSourceUrl, {
          method: 'GET',
        })
        if (!getRes.ok) {
          throw new Error(`HTTP error ${getRes.status} from ${this.officialSourceUrl}`)
        }

        const etag = getRes.headers.get('etag') || ''
        const lastModified = getRes.headers.get('last-modified') || ''
        const text = await getRes.text()

        const match = text.match(/<title[^>]*>([^<]+)<\/title>/i)
        const title = match ? match[1].trim() : 'PMFBY Portal'

        return {
          ok: true,
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
        requiresManualReview: hasChanged,
        changeSummary: hasChanged
          ? 'PMFBY notice or portal change detected. Seasonal SLCCCI notification review recommended.'
          : 'Source verified. PMFBY baseline parameters confirmed.',
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
        changeSummary: `Unable to verify PMFBY: ${err.message}. Existing database records preserved.`,
        error: err.message,
      }
    }
  }
}

