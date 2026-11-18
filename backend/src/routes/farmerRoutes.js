// ============================================================
// src/routes/farmerRoutes.js
// Farmer Profile & Application Routes
// ============================================================
// Defines all farmer-specific endpoints.
// All routes in this router require authentication via authMiddleware.
// ============================================================

import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import { getProfile, updateProfile } from '../controllers/farmerController.js'

const router = express.Router()

// Protect all farmer endpoints with authMiddleware
router.use(authMiddleware)

// ── Farmer Profile Endpoints ──────────────────────────────────
// GET /api/farmer/profile — Get authenticated farmer's combined profile
router.get('/profile', getProfile)

// PUT /api/farmer/profile — Create / update authenticated farmer's profile
router.put('/profile', updateProfile)

export default router

