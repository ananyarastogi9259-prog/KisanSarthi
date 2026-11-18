// ============================================================
// src/controllers/eligibilityController.js
// Eligibility Evaluation Controller
// ============================================================
// Handles incoming HTTP requests for evaluating farmer eligibility
// against government agricultural schemes.
//
// Always executes within the authenticated caller's context (req.supabase)
// to strictly respect PostgreSQL Row Level Security (RLS) policies.
// ============================================================

import eligibilityService from '../services/eligibilityService.js'

/**
 * GET /api/eligibility/:schemeId
 * Evaluates the authenticated farmer's eligibility for a specific scheme.
 * Loads their profile and land records, executes the dynamic rule engine,
 * saves the result to `eligibility_results`, and returns the evaluation.
 */
export const getEligibilityByScheme = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { schemeId } = req.params

    const result = await eligibilityService.evaluateSchemeForFarmer(
      userClient,
      userId,
      schemeId
    )

    return res.status(200).json({
      success: true,
      data: result,
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
 * GET /api/eligibility/:schemeId/history
 * Retrieves past evaluation results for the authenticated farmer and a specific scheme.
 */
export const getEligibilityHistory = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { schemeId } = req.params

    const history = await eligibilityService.getEligibilityHistory(
      userClient,
      userId,
      schemeId
    )

    return res.status(200).json({
      success: true,
      count: history ? history.length : 0,
      data: history || [],
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
 * GET /api/eligibility
 * Evaluates the authenticated farmer against ALL active government schemes.
 */
export const evaluateAllSchemes = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase

    const results = await eligibilityService.evaluateAllSchemesForFarmer(
      userClient,
      userId
    )

    return res.status(200).json({
      success: true,
      count: results ? results.length : 0,
      data: results || [],
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

