// ============================================================
// src/routes/personalizedSchemeRoutes.js
// Personalized Scheme Results Routes
// ============================================================
// Defines personalized government scheme recommendation and
// document checklist endpoints for authenticated farmers.
//
// All endpoints require authentication via authMiddleware.
// Uses PostgreSQL RLS via caller's Supabase client (req.supabase).
// ============================================================

import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import {
  getPersonalizedSchemes,
  getPersonalizedSchemeDetail,
} from '../controllers/personalizedSchemeController.js'

const router = express.Router()

// Protect all personalized scheme routes with authMiddleware
router.use(authMiddleware)

// GET /api/personalized-schemes — List active schemes evaluated for the farmer
router.get('/', getPersonalizedSchemes)

// GET /api/personalized-schemes/:schemeId — Detailed scheme info, checklist, and application status
router.get('/:schemeId', getPersonalizedSchemeDetail)

export default router
