// ============================================================
// src/routes/landRecordRoutes.js
// Land Record Routes
// ============================================================
// Defines all farmer land record management endpoints:
//   - Synthetic UP record discovery and import
//   - Document upload (photo/PDF) + OCR processing
//   - Farmer confirmation & correction of extracted data
//   - Secure signed URL retrieval for documents
//   - Standard land record CRUD operations
//
// All endpoints require authentication via authMiddleware.
// Uses PostgreSQL RLS via caller's Supabase client (req.supabase).
// ============================================================

import express from 'express'
import multer from 'multer'
import authMiddleware from '../middleware/authMiddleware.js'
import {
  getLandRecords,
  getLandRecordById,
  createLandRecord,
  updateLandRecord,
  deleteLandRecord,
  getSyntheticUPRecords,
  importSyntheticUPRecord,
  uploadLandRecordDocument,
  confirmLandRecord,
  getLandRecordDocument,
  getSignedUploadUrl,
  processUploadedStorage,
} from '../controllers/landRecordController.js'

const router = express.Router()

// Protect all land-record endpoints with authMiddleware
router.use(authMiddleware)

// ── Multer Configuration for Document Upload ─────────────────
// Keep files in memory as Buffers for validation, hashing, and Supabase Storage upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

/**
 * Middleware wrapper to handle multer errors gracefully.
 * Returns 400 Bad Request with a clear message on size limit violation.
 */
const handleFileUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds maximum allowable limit of 10MB.',
          })
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        })
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.',
      })
    }
    next()
  })
}

// ── Synthetic UP Land Data Endpoints ─────────────────────────
// NOTE: Mounted before /:id routes so 'synthetic-up' is not matched as an ID
// GET /api/land-records/synthetic-up — List or search available synthetic UP land records
router.get('/synthetic-up', getSyntheticUPRecords)

// POST /api/land-records/synthetic-up/import — Import a synthetic UP land record for the farmer
router.post('/synthetic-up/import', importSyntheticUPRecord)

// ── Document Upload & OCR Endpoints ──────────────────────────
// POST /api/land-records/signed-upload-url — Generates short-lived signed upload URL (bypasses Vercel 4.5MB limit)
router.post('/signed-upload-url', getSignedUploadUrl)

// POST /api/land-records/process-uploaded-storage — Runs OCR and creates draft from signed-upload file in private bucket
router.post('/process-uploaded-storage', processUploadedStorage)

// POST /api/land-records/upload — Upload land document (photo/PDF), run OCR, create draft record
router.post('/upload', handleFileUpload, uploadLandRecordDocument)

// PUT /api/land-records/:id/confirm — Farmer review and confirmation/correction of extracted land record
router.put('/:id/confirm', confirmLandRecord)

// GET /api/land-records/:id/document — Secure time-limited signed URL to view uploaded document
router.get('/:id/document', getLandRecordDocument)

// ── Standard CRUD Endpoints ──────────────────────────────────
// GET /api/land-records — List all land records for the authenticated farmer
router.get('/', getLandRecords)

// POST /api/land-records — Create a new land record manually
router.post('/', createLandRecord)

// GET /api/land-records/:id — Get a single land record by ID
router.get('/:id', getLandRecordById)

// PUT /api/land-records/:id — Update a land record
router.put('/:id', updateLandRecord)

// DELETE /api/land-records/:id — Delete a land record
router.delete('/:id', deleteLandRecord)

export default router
