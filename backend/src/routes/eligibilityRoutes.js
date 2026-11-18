// ============================================================
// src/routes/eligibilityRoutes.js
// Scheme Eligibility Routes
// ============================================================
// Defines government scheme eligibility endpoints for authenticated farmers.
// Uses authMiddleware and user-scoped Supabase client (req.supabase)
// to strictly adhere to PostgreSQL Row Level Security (RLS) policies.
// ============================================================

import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import {
  getEligibilityByScheme,
  getEligibilityHistory,
  evaluateAllSchemes,
} from '../controllers/eligibilityController.js'

const router = express.Router()

// Protect all eligibility evaluation endpoints with authMiddleware
router.use(authMiddleware)

// GET /api/eligibility — Evaluate farmer across all active schemes
router.get('/', evaluateAllSchemes)

// GET /api/eligibility/:schemeId/history — Retrieve past evaluation history
router.get('/:schemeId/history', getEligibilityHistory)

// GET /api/eligibility/:schemeId — Evaluate farmer for a specific scheme
router.get('/:schemeId', getEligibilityByScheme)

export default router

