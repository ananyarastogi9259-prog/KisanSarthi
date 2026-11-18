// ============================================================
// src/services/schemeSync/schemeSyncService.js
// Scheme Background Synchronization Orchestrator
// ============================================================
// Coordinates the pipeline:
//   Official Sources -> Adapters -> Fetch -> Normalize ->
//   Validate -> Compare -> Supabase
//
// INTEGRITY & SAFETY RULES:
//   1. Farmers NEVER wait for government websites synchronously.
//   2. Never overwrite valid database records with empty or corrupt data.
//   3. Concurrency lock prevents overlapping runs.
//   4. Preserves last-verified records on external network failures.
//   5. Changes requiring policy review are flagged for manual sign-off
//      rather than blindly overwriting machine-evaluable rules.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import supabase from '../../config/supabase.js'
import { getAdapterForScheme, getAllAdapters } from './adapters/index.js'

export class SchemeSyncService {
  constructor(options = {}) {
    this.isSyncRunning = false
    this.lastSyncTimestamp = null
    this.lastSyncResults = new Map()
    this.inMemorySyncMeta = new Map() // schemeId -> { contentHash, lastCheckedAt, status }

    // Use administrative client (service-role key) for backend sync if available,
    // otherwise fallback to shared client
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPAYBASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceRoleKey) {
      this.adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    } else {
      this.adminClient = supabase
    }
  }

  /**
   * Returns current sync engine status and latest results.
   * @returns {Object}
   */
  getSyncStatus() {
    const schemeSummaries = []
    for (const [schemeId, result] of this.lastSyncResults.entries()) {
      schemeSummaries.push({
        schemeId,
        schemeName: result.schemeName,
        status: result.status,
        mode: result.mode,
        lastCheckedAt: result.checkedAt,
        requiresManualReview: result.requiresManualReview,
        changeSummary: result.changeSummary,
        error: result.error,
      })
    }

    return {
      isSyncRunning: this.isSyncRunning,
      lastSyncTimestamp: this.lastSyncTimestamp,
      totalTrackedSchemes: 5,
      completedChecks: schemeSummaries.length,
      schemes: schemeSummaries,
    }
  }

  /**
   * Synchronizes a single scheme by UUID.
   * @param {string} schemeId
   * @param {Object} [options={}]
   * @returns {Promise<Object>}
   */
  async syncScheme(schemeId, options = {}) {
    const adapter = options.adapter || getAdapterForScheme(schemeId, options.adapterOptions)
    if (!adapter) {
      throw new Error(`No adapter registered for scheme ID: ${schemeId}`)
    }

    const previousMeta = this.inMemorySyncMeta.get(schemeId) || {}
    const descriptor = await adapter.checkUpdate(previousMeta)

    // Store latest hash and timestamp in memory
    if (descriptor.contentHash) {
      this.inMemorySyncMeta.set(schemeId, {
        contentHash: descriptor.contentHash,
        lastCheckedAt: descriptor.checkedAt,
        status: descriptor.status,
      })
    }

    // Safety Check 1: If adapter encountered an error, preserve existing database records
    if (descriptor.status === 'error') {
      console.warn(
        `⚠️ [SchemeSync] Sync error for ${descriptor.schemeName}: ${descriptor.error}. Database preserved.`
      )
      this.lastSyncResults.set(schemeId, descriptor)
      return {
        success: false,
        action: 'preserved_existing',
        reason: 'external_source_error',
        descriptor,
      }
    }

    // Safety Check 2: If no changes were detected, take no database write action
    if (descriptor.status === 'unchanged') {
      this.lastSyncResults.set(schemeId, descriptor)
      return {
        success: true,
        action: 'no_change',
        reason: 'content_identical',
        descriptor,
      }
    }

    // Safety Check 3: If manual review is required, flag it and do not blindly overwrite rules
    if (descriptor.requiresManualReview || descriptor.status === 'manual_review_needed') {
      console.log(
        `ℹ️ [SchemeSync] Manual review flagged for ${descriptor.schemeName}: ${descriptor.changeSummary}`
      )
      this.lastSyncResults.set(schemeId, descriptor)
      return {
        success: true,
        action: 'review_flagged',
        reason: 'requires_manual_policy_confirmation',
        descriptor,
      }
    }

    // Safety Check 4: For safe metadata updates, validate before writing to Supabase
    if (descriptor.status === 'change_detected' && descriptor.extractedData) {
      const isValid = adapter.validateCandidateData(descriptor.extractedData)
      if (!isValid) {
        console.warn(
          `⚠️ [SchemeSync] Rejected invalid/empty update payload for ${descriptor.schemeName}.`
        )
        this.lastSyncResults.set(schemeId, descriptor)
        return {
          success: false,
          action: 'rejected_invalid_payload',
          reason: 'empty_or_corrupt_data',
          descriptor,
        }
      }

      // Safe update to schemes table
      if (this.adminClient) {
        try {
          const updateFields = {}
          if (typeof descriptor.extractedData.is_active === 'boolean') {
            updateFields.is_active = descriptor.extractedData.is_active
          }
          if (descriptor.extractedData.official_source_url) {
            updateFields.official_source_url = descriptor.extractedData.official_source_url
          }

          if (Object.keys(updateFields).length > 0) {
            const { error } = await this.adminClient
              .from('schemes')
              .update(updateFields)
              .eq('id', schemeId)

            if (error) {
              throw error
            }
            console.log(`✅ [SchemeSync] Safely updated scheme ${descriptor.schemeName} in Supabase.`)
          }
        } catch (dbErr) {
          console.error(
            `❌ [SchemeSync] Database update failed for ${descriptor.schemeName}:`,
            dbErr.message
          )
          this.lastSyncResults.set(schemeId, descriptor)
          return {
            success: false,
            action: 'database_write_failed',
            reason: dbErr.message,
            descriptor,
          }
        }
      }

      this.lastSyncResults.set(schemeId, descriptor)
      return {
        success: true,
        action: 'updated_metadata',
        reason: 'safe_change_applied',
        descriptor,
      }
    }

    this.lastSyncResults.set(schemeId, descriptor)
    return {
      success: true,
      action: 'completed',
      descriptor,
    }
  }

  /**
   * Synchronizes all 5 verified schemes sequentially.
   * Enforces concurrency lock to prevent overlapping runs.
   * @param {Object} [options={}]
   * @returns {Promise<Object>} Consolidated sync run report
   */
  async syncAllSchemes(options = {}) {
    // Concurrency protection: reject overlapping jobs
    if (this.isSyncRunning) {
      console.warn('⚠️ [SchemeSync] A synchronization job is already running. Skipping trigger.')
      return {
        success: false,
        message: 'Sync job is already in progress.',
        skipped: true,
      }
    }

    this.isSyncRunning = true
    const startTime = Date.now()
    const results = []

    try {
      const adapters = getAllAdapters(options.adapterOptions)

      for (const adapter of adapters) {
        try {
          const result = await this.syncScheme(adapter.schemeId, options)
          results.push(result)
        } catch (err) {
          results.push({
            success: false,
            schemeId: adapter.schemeId,
            schemeName: adapter.schemeName,
            action: 'unexpected_error',
            error: err.message,
          })
        }

        // Polite delay between outbound source checks (500ms)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      this.lastSyncTimestamp = new Date().toISOString()
      const durationMs = Date.now() - startTime

      const summary = {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        preservedOnError: results.filter((r) => r.action === 'preserved_existing').length,
        unchanged: results.filter((r) => r.action === 'no_change').length,
        reviewFlagged: results.filter((r) => r.action === 'review_flagged').length,
        updated: results.filter((r) => r.action === 'updated_metadata').length,
      }

      console.log(
        `✅ [SchemeSync] Completed sync in ${durationMs}ms: ${summary.unchanged} unchanged, ${summary.reviewFlagged} review-flagged, ${summary.updated} updated, ${summary.preservedOnError} preserved on error.`
      )

      return {
        success: true,
        timestamp: this.lastSyncTimestamp,
        durationMs,
        summary,
        results,
      }
    } finally {
      this.isSyncRunning = false
    }
  }
}

// Singleton export
const schemeSyncService = new SchemeSyncService()
export default schemeSyncService
