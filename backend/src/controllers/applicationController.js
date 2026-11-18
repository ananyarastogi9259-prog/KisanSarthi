// ============================================================
// src/controllers/applicationController.js
// Scheme Applications Controller
// ============================================================
// Handles incoming HTTP requests for creating, viewing, and submitting
// farmer scheme applications using the existing `applications` table.
//
// Always executes within the authenticated caller's context (req.supabase)
// to strictly adhere to PostgreSQL Row Level Security (RLS) policies.
// ============================================================

import applicationService from '../services/applicationService.js'

/**
 * GET /api/applications
 * Returns all scheme applications belonging to the authenticated farmer.
 */
export const getApplications = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase

    const applications = await applicationService.getFarmerApplications(
      userClient,
      userId
    )

    return res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
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
 * GET /api/applications/:id
 * Returns one scheme application belonging to the authenticated farmer.
 */
export const getApplicationById = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { id } = req.params

    const application = await applicationService.getApplicationById(
      userClient,
      userId,
      id
    )

    return res.status(200).json({
      success: true,
      data: application,
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
 * POST /api/applications
 * Creates a new application record in 'draft' status for an eligible scheme.
 */
export const createApplication = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object.',
      })
    }

    const { scheme_id, document_ids } = req.body

    const application = await applicationService.createApplication(
      userClient,
      userId,
      {
        scheme_id,
        document_ids,
      }
    )

    return res.status(201).json({
      success: true,
      message: 'Application draft created successfully.',
      data: application,
    })
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        ...(err.details && { details: err.details }),
      })
    }
    next(err)
  }
}

/**
 * PATCH /api/applications/:id/submit
 * Submits an application packet.
 */
export const submitApplication = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { id } = req.params

    const application = await applicationService.submitApplication(
      userClient,
      userId,
      id
    )

    return res.status(200).json({
      success: true,
      message: 'Application submitted successfully for tracking.',
      data: application,
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
 * PATCH /api/applications/:id/status
 * Updates application status (under_review, approved, rejected).
 */
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { id } = req.params
    const { status } = req.body || {}

    const application = await applicationService.updateApplicationStatus(
      userClient,
      userId,
      id,
      status
    )

    return res.status(200).json({
      success: true,
      message: 'Application status updated successfully.',
      data: application,
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
