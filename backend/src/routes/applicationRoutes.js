// ============================================================
// src/routes/applicationRoutes.js
// Scheme Application Tracking Routes
// ============================================================
// Defines farmer application tracking endpoints:
//   - List farmer applications
//   - Create draft application for an eligible scheme
//   - View single application details with attached documents
//   - Submit application packet for tracking
//   - Update application status (within permitted transitions)
//
// All endpoints require authentication via authMiddleware.
// Uses PostgreSQL RLS via caller's Supabase client (req.supabase).
// ============================================================

import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import {
  getApplications,
  getApplicationById,
  createApplication,
  submitApplication,
  updateApplicationStatus,
} from '../controllers/applicationController.js'

const router = express.Router()

// Protect all application routes with authMiddleware
router.use(authMiddleware)

// GET /api/applications — List all applications for the authenticated farmer
router.get('/', getApplications)

// POST /api/applications — Create a new draft application for an eligible scheme
router.post('/', createApplication)

// GET /api/applications/:id — View single application details and attached documents
router.get('/:id', getApplicationById)

// PATCH /api/applications/:id/submit — Submit application packet
router.patch('/:id/submit', submitApplication)

// PATCH /api/applications/:id/status — Update application status (demo/review)
router.patch('/:id/status', updateApplicationStatus)

export default router
