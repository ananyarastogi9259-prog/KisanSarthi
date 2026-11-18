// ============================================================
// src/services/schemeSync/adapters/UpKarjRahatAdapter.js
// Official Adapter for UP Kisan Karj Rahat Yojana
// ============================================================
// Official Source: https://upkisankarjrahat.upsdc.gov.in/
//
// FEASIBILITY CONSTRAINTS (from Phase 1 Research):
//   - No public API exists.
//   - Portal status checks require visual CAPTCHAs (scraping strictly barred).
//   - The scheme represents the 2017 UP farm loan waiver up to ₹1,00,000.
//   - Any subsequent debt redemption rounds require official UP Cabinet
//     sanction and Government Orders (Shasanadesh).
//   - MODE IS STRICTLY: manual_verification_required.
//     We do NOT claim this source is automatically synchronized.
// ============================================================

import { BaseSchemeAdapter } from './BaseSchemeAdapter.js'

export class UpKarjRahatAdapter extends BaseSchemeAdapter {
  constructor(options = {}) {
    super({
      schemeId: 'fbcc8b8d-2662-41fc-b6cd-83117c28f26b',
      schemeName: 'UP Kisan Karj Rahat Yojana',
      officialSourceUrl: 'https://upkisankarjrahat.upsdc.gov.in/',
      mode: 'manual_verification_required',
      timeoutMs: options.timeoutMs || 8000,
      maxRetries: options.maxRetries || 2,
    })
  }

  async checkUpdate(previousState = {}) {
    const checkedAt = new Date().toISOString()

    try {
      // Lightweight availability probe: verify that the official UPSDC host is reachable
      let isReachable = false
      let etag = ''
      let lastModified = ''

      try {
        const headRes = await this.fetchWithTimeout(this.officialSourceUrl, {
          method: 'HEAD',
        })
        isReachable = headRes.ok || headRes.status === 301 || headRes.status === 302
        etag = headRes.headers.get('etag') || ''
        lastModified = headRes.headers.get('last-modified') || ''
      } catch {
        // Some government firewalls block HEAD; test GET with abort
        try {
          const getRes = await this.fetchWithTimeout(this.officialSourceUrl, {
            method: 'GET',
          })
          isReachable = getRes.ok || getRes.status === 301 || getRes.status === 302
          etag = getRes.headers.get('etag') || ''
          lastModified = getRes.headers.get('last-modified') || ''
        } catch {
          isReachable = false
        }
      }

      const currentHash = this.computeHash(
        `UP_KARJ_RAHAT:${isReachable}:${etag}:${lastModified}`
      )

      return {
        schemeId: this.schemeId,
        schemeName: this.schemeName,
        mode: this.mode,
        status: 'manual_review_needed',
        sourceUrl: this.officialSourceUrl,
        checkedAt,
        contentHash: currentHash,
        previousHash: previousState.contentHash || null,
        hasChanged: false,
        extractedData: {
          official_source_url: this.officialSourceUrl,
          is_active: isReachable,
        },
        requiresManualReview: true,
        changeSummary: isReachable
          ? 'UP Karj Rahat portal is online. Scheme status is in manual-verification mode; updates require UP Cabinet Shasanadesh review.'
          : 'UP Karj Rahat portal is currently unreachable. Existing verified database records preserved.',
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
        changeSummary: `Unable to probe UP Karj Rahat portal: ${err.message}. Existing records preserved.`,
        error: err.message,
      }
    }
  }
}

