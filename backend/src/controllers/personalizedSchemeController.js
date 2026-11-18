// ============================================================
// src/controllers/personalizedSchemeController.js
// Personalized Scheme Results Controller
// ============================================================
// Handles incoming HTTP requests for retrieving personalized government
// scheme recommendations and detailed document checklists.
//
// Always executes within the authenticated caller's context (req.supabase)
// to strictly adhere to PostgreSQL Row Level Security (RLS) policies.
// ============================================================

import personalizedSchemeService from '../services/personalizedSchemeService.js'

/**
 * GET /api/personalized-schemes
 * Returns active schemes evaluated and ranked for the authenticated farmer.
 */
export const getPersonalizedSchemes = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase

    const schemes = await personalizedSchemeService.getPersonalizedSchemes(
      userClient,
      userId
    )

    return res.status(200).json({
      success: true,
      count: schemes.length,
      data: schemes,
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
 * GET /api/personalized-schemes/:schemeId
 * Returns detailed personalized result for one scheme, including:
 * scheme info, eligibility status & reasons, document checklist, and application status.
 */
export const getPersonalizedSchemeDetail = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { schemeId } = req.params

    const detail = await personalizedSchemeService.getPersonalizedSchemeDetail(
      userClient,
      userId,
      schemeId
    )

    return res.status(200).json({
      success: true,
      data: detail,
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
