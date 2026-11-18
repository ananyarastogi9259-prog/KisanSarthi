// ============================================================
// src/controllers/schemeController.js
// Scheme Catalogue Controller
// ============================================================
// Handles HTTP requests for discovering and inspecting government
// agricultural schemes. Uses the authenticated caller's Supabase
// client (req.supabase) to strictly adhere to PostgreSQL Row Level
// Security (RLS) policies.
// Also exposes sync monitoring and on-demand trigger endpoints.
// ============================================================

import schemeService from '../services/schemeService.js'
import schemeScheduler from '../services/schemeSync/schemeScheduler.js'

/**
 * GET /api/schemes
 * Lists active government schemes for the authenticated farmer.
 * Optional query parameters:
 *   - state: filter by state (e.g., 'Uttar Pradesh' or 'Central')
 *   - department: filter by sponsoring department/ministry
 *   - search: keyword search in scheme name or description
 */
export const getSchemes = async (req, res, next) => {
  try {
    const userClient = req.supabase
    const { state, department, search } = req.query

    const schemes = await schemeService.getSchemes(userClient, {
      state,
      department,
      search,
    })

    return res.status(200).json({
      success: true,
      count: schemes ? schemes.length : 0,
      data: schemes || [],
    })
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      })
    }
    next(err)
  }
}

/**
 * GET /api/schemes/sync/status
 * Retrieves status of the background synchronization engine,
 * registered cron schedules, and latest source check results.
 */
export const getSyncStatus = async (req, res, next) => {
  try {
    const status = schemeScheduler.getStatus()
    return res.status(200).json({
      success: true,
      data: status,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/schemes/sync/run
 * Triggers an on-demand background sync for all or a single scheme.
 */
export const triggerSync = async (req, res, next) => {
  try {
    const schemeId = req.body?.schemeId || req.query?.schemeId || null
    const result = await schemeScheduler.triggerNow(schemeId)
    return res.status(200).json({
      success: true,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/schemes/:id
 * Retrieves full details of a single government scheme by ID.
 * Returns 400 for invalid UUID format.
 * Returns 404 if scheme does not exist or is inactive.
 */
export const getSchemeById = async (req, res, next) => {
  try {
    const userClient = req.supabase
    const { id } = req.params

    const scheme = await schemeService.getSchemeById(userClient, id)

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Scheme not found or inactive.',
      })
    }

    return res.status(200).json({
      success: true,
      data: scheme,
    })
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      })
    }
    next(err)
  }
}
