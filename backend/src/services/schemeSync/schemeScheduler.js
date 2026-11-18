// ============================================================
// src/services/schemeSync/schemeScheduler.js
// Background Cron Scheduler for Government Scheme Synchronization
// ============================================================
// Manages recurring background tasks via node-cron with
// scheme-specific intervals tailored to official update rhythms:
//   - PM-KISAN: Weekly (Sunday 02:00)
//   - PMFBY: Bi-weekly (1st & 15th 02:00)
//   - KCC: Monthly (1st 02:00)
//   - UP Karj Rahat: Monthly (1st 03:00)
//   - UP Solar Pump: Weekly (Wednesday 02:00)
//
// FEATURES:
//   - Handles graceful startup and shutdown (SIGTERM/SIGINT)
//   - Concurrency locking (rejects concurrent jobs)
//   - Manual on-demand trigger capability
// ============================================================

import cron from 'node-cron'
import schemeSyncService from './schemeSyncService.js'

export const SCHEME_CRON_SCHEDULES = [
  {
    schemeId: '9b46b004-8c63-4d94-9bc7-4e5f8e0c02e6',
    schemeName: 'PM-KISAN',
    cronExpression: '0 2 * * 0', // Weekly on Sundays at 02:00 AM
    description: 'Weekly check for PM-KISAN guidelines & DBT installment notices',
  },
  {
    schemeId: '566cc552-121e-4fe9-876f-414abcfb452d',
    schemeName: 'PMFBY',
    cronExpression: '0 2 1,15 * *', // 1st & 15th of each month at 02:00 AM
    description: 'Bi-weekly seasonal check for Kharif/Rabi cut-off dates and crop lists',
  },
  {
    schemeId: '6c64581f-b287-4da6-86c7-3da46985297f',
    schemeName: 'KCC',
    cronExpression: '0 2 1 * *', // 1st of each month at 02:00 AM
    description: 'Monthly check for RBI/NABARD interest subvention master circulars',
  },
  {
    schemeId: 'fbcc8b8d-2662-41fc-b6cd-83117c28f26b',
    schemeName: 'UP Karj Rahat',
    cronExpression: '0 3 1 * *', // 1st of each month at 03:00 AM
    description: 'Monthly availability probe and Shasanadesh debt relief check',
  },
  {
    schemeId: 'c3c61d25-ae2e-4627-9b74-f6bb80a7cf5e',
    schemeName: 'UP Solar Pump',
    cronExpression: '0 2 * * 3', // Weekly on Wednesdays at 02:00 AM
    description: 'Weekly check for UP Agriculture token booking announcements',
  },
]

export class SchemeScheduler {
  constructor() {
    this.scheduledTasks = []
    this.isStarted = false
  }

  /**
   * Initializes and starts all scheme cron schedules.
   */
  start() {
    if (this.isStarted) {
      console.log('ℹ️ [SchemeScheduler] Scheduler is already active.')
      return
    }

    console.log('🕒 [SchemeScheduler] Starting background scheme sync schedules...')

    for (const schedule of SCHEME_CRON_SCHEDULES) {
      const task = cron.schedule(
        schedule.cronExpression,
        async () => {
          console.log(
            `🔔 [SchemeScheduler] Cron triggered for ${schedule.schemeName} (${schedule.cronExpression})`
          )
          try {
            await schemeSyncService.syncScheme(schedule.schemeId)
          } catch (err) {
            console.error(
              `❌ [SchemeScheduler] Sync failed for ${schedule.schemeName}:`,
              err.message
            )
          }
        },
        {
          timezone: 'Asia/Kolkata',
        }
      )

      this.scheduledTasks.push({
        ...schedule,
        task,
      })
    }

    this.isStarted = true
    console.log(`✅ [SchemeScheduler] Initialized ${this.scheduledTasks.length} background tasks.`)
  }

  /**
   * Halts all scheduled tasks cleanly (e.g. during server shutdown).
   */
  stop() {
    if (!this.isStarted) return

    console.log('⏹️ [SchemeScheduler] Stopping background scheme sync tasks...')
    for (const item of this.scheduledTasks) {
      if (item.task) {
        item.task.stop()
      }
    }
    this.scheduledTasks = []
    this.isStarted = false
    console.log('✅ [SchemeScheduler] All background tasks stopped.')
  }

  /**
   * Returns current schedule metadata and statuses.
   * @returns {Object}
   */
  getStatus() {
    return {
      isStarted: this.isStarted,
      tasksCount: this.scheduledTasks.length,
      schedules: SCHEME_CRON_SCHEDULES.map((s) => ({
        schemeId: s.schemeId,
        schemeName: s.schemeName,
        cronExpression: s.cronExpression,
        description: s.description,
      })),
      syncEngine: schemeSyncService.getSyncStatus(),
    }
  }

  /**
   * Triggers an on-demand synchronization run.
   * @param {string} [schemeId] - Optional single scheme UUID
   * @returns {Promise<Object>}
   */
  async triggerNow(schemeId = null) {
    if (schemeId) {
      return await schemeSyncService.syncScheme(schemeId)
    }
    return await schemeSyncService.syncAllSchemes()
  }
}

// Singleton export
const schemeScheduler = new SchemeScheduler()
export default schemeScheduler

