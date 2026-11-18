// ============================================================
// src/routes/schemeRoutes.js
// Scheme Catalogue Routes
// ============================================================
// Defines government scheme catalogue endpoints for authenticated farmers.
// Uses authMiddleware and user-scoped Supabase client (req.supabase)
// to strictly adhere to PostgreSQL Row Level Security (RLS) policies.
// Also exposes sync monitoring and on-demand trigger endpoints.
// ============================================================

import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import {
  getSchemes,
  getSchemeById,
  getSyncStatus,
  triggerSync,
} from '../controllers/schemeController.js'

const router = express.Router()

// Protect all scheme catalogue endpoints with authMiddleware
router.use(authMiddleware)

// GET /api/schemes — List active government schemes
router.get('/', getSchemes)

// Background sync monitoring & trigger endpoints (placed before /:id)
// GET /api/schemes/sync/status — Inspection of background sync engine & schedules
router.get('/sync/status', getSyncStatus)

// POST /api/schemes/sync/run — On-demand background sync trigger
router.post('/sync/run', triggerSync)

// GET /api/schemes/:id — Get details of a single government scheme
router.get('/:id', getSchemeById)

export default router
