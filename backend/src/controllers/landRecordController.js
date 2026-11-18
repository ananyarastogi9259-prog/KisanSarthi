// ============================================================
// src/controllers/landRecordController.js
// Land Record Controller
// ============================================================
// Handles CRUD operations for farmer land records.
// Uses the authenticated caller's Supabase client (req.supabase)
// to strictly adhere to PostgreSQL Row Level Security (RLS) policies.
// ============================================================

import landRecordService from '../services/landRecordService.js'
import landRecordOcrService from '../services/ocr/landRecordOcrService.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_VERIFICATION_STATUSES = ['pending', 'reviewed', 'rejected']

/**
 * GET /api/land-records
 * Fetches all land records owned by the authenticated farmer.
 */
export const getLandRecords = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase

    const { data: records, error } = await userClient
      .from('land_records')
      .select('id, farmer_id, survey_number, land_area, area_unit, state, district, village, record_type, extracted_data, verification_status, created_at')
      .eq('farmer_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching land records:', error.message)
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve land records.',
      })
    }

    return res.status(200).json({
      success: true,
      count: records ? records.length : 0,
      data: records || [],
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/land-records/:id
 * Fetches a single land record by ID for the authenticated farmer.
 * Returns 404 if the record does not exist or is not owned by the caller.
 */
export const getLandRecordById = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { id } = req.params

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid land record ID format. Must be a valid UUID.',
      })
    }

    const { data: record, error } = await userClient
      .from('land_records')
      .select('id, farmer_id, survey_number, land_area, area_unit, state, district, village, record_type, extracted_data, verification_status, created_at')
      .eq('id', id)
      .eq('farmer_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching land record by ID:', error.message)
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve the land record.',
      })
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Land record not found or inaccessible.',
      })
    }

    return res.status(200).json({
      success: true,
      data: record,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/land-records
 * Creates a new land record for the authenticated farmer.
 */
export const createLandRecord = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object.',
      })
    }

    const {
      survey_number,
      land_area,
      area_unit,
      state,
      district,
      village,
      record_type,
      extracted_data,
      verification_status,
    } = req.body

    // ── Input Validation ───────────────────────────────────────
    // Prevent client from spoofing farmer_id or record ID
    if (req.body.id !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'Record ID is generated automatically and cannot be provided.',
      })
    }

    if (req.body.farmer_id !== undefined && req.body.farmer_id !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create land records for another farmer.',
      })
    }

    // Validate land_area if provided
    let parsedArea = null
    if (land_area !== undefined && land_area !== null && land_area !== '') {
      parsedArea = Number(land_area)
      if (isNaN(parsedArea) || parsedArea < 0) {
        return res.status(400).json({
          success: false,
          message: 'land_area must be a valid non-negative number.',
        })
      }
    }

    // Validate verification_status if provided
    if (verification_status !== undefined && verification_status !== null && verification_status !== '') {
      if (typeof verification_status !== 'string' || !ALLOWED_VERIFICATION_STATUSES.includes(verification_status.trim())) {
        return res.status(400).json({
          success: false,
          message: `Invalid verification_status. Allowed values are: ${ALLOWED_VERIFICATION_STATUSES.join(', ')}.`,
        })
      }
    }

    // Validate string fields
    const textFields = { survey_number, area_unit, state, district, village, record_type }
    for (const [key, value] of Object.entries(textFields)) {
      if (value !== undefined && value !== null && typeof value !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Field "${key}" must be a text string.`,
        })
      }
      if (typeof value === 'string' && value.trim().length > 255) {
        return res.status(400).json({
          success: false,
          message: `Field "${key}" exceeds the maximum length of 255 characters.`,
        })
      }
    }

    // Validate extracted_data if provided
    if (extracted_data !== undefined && extracted_data !== null) {
      if (typeof extracted_data !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'extracted_data must be a valid JSON object or array.',
        })
      }
    }

    // ── Ensure farmer_profiles Parent Exists ──────────────────
    // land_records.farmer_id is a foreign key to farmer_profiles.id
    const { data: existingFp, error: fpCheckError } = await userClient
      .from('farmer_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (fpCheckError) {
      console.error('Error verifying farmer profile:', fpCheckError.message)
      return res.status(500).json({
        success: false,
        message: 'Failed to verify farmer profile prerequisites.',
      })
    }

    if (!existingFp) {
      // Auto-provision minimal farmer_profiles record if not yet created
      const { error: fpInsertError } = await userClient
        .from('farmer_profiles')
        .insert({ id: userId, state: state?.trim() || null, district: district?.trim() || null })

      if (fpInsertError) {
        console.error('Error auto-creating farmer profile:', fpInsertError.message)
        return res.status(500).json({
          success: false,
          message: 'Failed to initialize farmer profile prerequisites.',
        })
      }
    }

    // ── Insert Land Record ─────────────────────────────────────
    const newRecordPayload = {
      farmer_id: userId,
      survey_number: typeof survey_number === 'string' ? survey_number.trim() : null,
      land_area: parsedArea,
      area_unit: typeof area_unit === 'string' ? area_unit.trim() : null,
      state: typeof state === 'string' ? state.trim() : null,
      district: typeof district === 'string' ? district.trim() : null,
      village: typeof village === 'string' ? village.trim() : null,
      record_type: typeof record_type === 'string' ? record_type.trim() : null,
      extracted_data: extracted_data || null,
      verification_status: typeof verification_status === 'string' ? verification_status.trim() : 'pending',
    }

    const { data: createdRecord, error: insertError } = await userClient
      .from('land_records')
      .insert(newRecordPayload)
      .select('id, farmer_id, survey_number, land_area, area_unit, state, district, village, record_type, extracted_data, verification_status, created_at')
      .single()

    if (insertError) {
      console.error('Error inserting land record:', insertError.message)
      return res.status(500).json({
        success: false,
        message: 'Failed to create land record.',
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Land record created successfully.',
      data: createdRecord,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/land-records/:id
 * Updates an existing land record owned by the authenticated farmer.
 */
export const updateLandRecord = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { id } = req.params

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid land record ID format. Must be a valid UUID.',
      })
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object.',
      })
    }

    // Check if record exists and is owned by authenticated farmer
    const { data: existingRecord, error: findError } = await userClient
      .from('land_records')
      .select('id')
      .eq('id', id)
      .eq('farmer_id', userId)
      .maybeSingle()

    if (findError) {
      console.error('Error finding land record for update:', findError.message)
      return res.status(500).json({
        success: false,
        message: 'Failed to verify land record.',
      })
    }

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Land record not found or inaccessible.',
      })
    }

    // ── Input Validation ───────────────────────────────────────
    if (req.body.id !== undefined && req.body.id !== id) {
      return res.status(400).json({
        success: false,
        message: 'Record ID cannot be changed.',
      })
    }

    if (req.body.farmer_id !== undefined && req.body.farmer_id !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Record ownership (farmer_id) cannot be transferred.',
      })
    }

    const {
      survey_number,
      land_area,
      area_unit,
      state,
      district,
      village,
      record_type,
      extracted_data,
      verification_status,
    } = req.body

    const updates = {}

    // Validate land_area
    if (land_area !== undefined) {
      if (land_area === null || land_area === '') {
        updates.land_area = null
      } else {
        const parsedArea = Number(land_area)
        if (isNaN(parsedArea) || parsedArea < 0) {
          return res.status(400).json({
            success: false,
            message: 'land_area must be a valid non-negative number.',
          })
        }
        updates.land_area = parsedArea
      }
    }

    // Validate verification_status for update
    if (verification_status !== undefined) {
      if (verification_status === null || verification_status === '') {
        return res.status(400).json({
          success: false,
          message: `verification_status cannot be empty. Allowed values are: ${ALLOWED_VERIFICATION_STATUSES.join(', ')}.`,
        })
      }
      if (typeof verification_status !== 'string' || !ALLOWED_VERIFICATION_STATUSES.includes(verification_status.trim())) {
        return res.status(400).json({
          success: false,
          message: `Invalid verification_status. Allowed values are: ${ALLOWED_VERIFICATION_STATUSES.join(', ')}.`,
        })
      }
      updates.verification_status = verification_status.trim()
    }

    // Validate string fields
    const textFields = { survey_number, area_unit, state, district, village, record_type }
    for (const [key, value] of Object.entries(textFields)) {
      if (value !== undefined) {
        if (value !== null && typeof value !== 'string') {
          return res.status(400).json({
            success: false,
            message: `Field "${key}" must be a text string.`,
          })
        }
        if (typeof value === 'string' && value.trim().length > 255) {
          return res.status(400).json({
            success: false,
            message: `Field "${key}" exceeds the maximum length of 255 characters.`,
          })
        }
        updates[key] = typeof value === 'string' ? value.trim() : null
      }
    }

    // Validate extracted_data
    if (extracted_data !== undefined) {
      if (extracted_data !== null && typeof extracted_data !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'extracted_data must be a valid JSON object or array.',
        })
      }
      updates.extracted_data = extracted_data
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid update fields provided.',
      })
    }

    const { data: updatedRecord, error: updateError } = await userClient
      .from('land_records')
      .update(updates)
      .eq('id', id)
      .eq('farmer_id', userId)
      .select('id, farmer_id, survey_number, land_area, area_unit, state, district, village, record_type, extracted_data, verification_status, created_at')
      .single()

    if (updateError) {
      console.error('Error updating land record:', updateError.message)
      return res.status(500).json({
        success: false,
        message: 'Failed to update land record.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Land record updated successfully.',
      data: updatedRecord,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/land-records/:id
 * Deletes a land record owned by the authenticated farmer.
 */
export const deleteLandRecord = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { id } = req.params

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid land record ID format. Must be a valid UUID.',
      })
    }

    // Check if record exists and is owned by authenticated farmer
    const { data: existingRecord, error: findError } = await userClient
      .from('land_records')
      .select('id')
      .eq('id', id)
      .eq('farmer_id', userId)
      .maybeSingle()

    if (findError) {
      console.error('Error finding land record for deletion:', findError.message)
      return res.status(500).json({
        success: false,
        message: 'Failed to verify land record.',
      })
    }

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Land record not found or inaccessible.',
      })
    }

    const { error: deleteError } = await userClient
      .from('land_records')
      .delete()
      .eq('id', id)
      .eq('farmer_id', userId)

    if (deleteError) {
      console.error('Error deleting land record:', deleteError.message)
      return res.status(500).json({
        success: false,
        message: 'Failed to delete land record.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Land record deleted successfully.',
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/land-records/synthetic-up
 * Retrieves available synthetic UP land records for development/demo.
 * Supports optional filtering via query parameters: district, village, survey_number.
 */
export const getSyntheticUPRecords = async (req, res, next) => {
  try {
    const { district, village, survey_number, khasra_number } = req.query
    const records = await landRecordService.getAvailableRecords({
      district,
      village,
      survey_number,
      khasra_number,
    })

    return res.status(200).json({
      success: true,
      provider: landRecordService.activeProviderName,
      is_demo: true,
      disclaimer: 'Synthetic demo data for development purposes only. Not official UP government data.',
      count: records.length,
      data: records,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/land-records/synthetic-up/import
 * Imports a synthetic UP land record into the authenticated farmer's land records.
 *
 * Expected body:
 *   { district?: string, survey_number?: string, khasra_number?: string }
 */
export const importSyntheticUPRecord = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object.',
      })
    }

    const { district, survey_number, khasra_number, synthetic_farmer_id } = req.body
    const targetSurvey = survey_number || khasra_number || synthetic_farmer_id

    if (!targetSurvey || typeof targetSurvey !== 'string' || !targetSurvey.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid survey_number, khasra_number, or synthetic_farmer_id is required.',
      })
    }

    if (district !== undefined && typeof district !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Field "district" must be a string.',
      })
    }

    const importedRecord = await landRecordService.importRecordForFarmer(
      userClient,
      userId,
      {
        district: district ? district.trim() : undefined,
        survey_number: targetSurvey.trim(),
      }
    )

    return res.status(201).json({
      success: true,
      message: 'Synthetic UP land record imported successfully.',
      data: importedRecord,
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
 * POST /api/land-records/upload
 * Uploads a land record document (photo/PDF), validates it,
 * stores it in private Supabase Storage ('land-records'),
 * extracts data via OCR, and creates an unconfirmed draft record.
 */
export const uploadLandRecordDocument = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No document file uploaded. Please provide a file under the "file" form field.',
      })
    }

    const { document_type = 'khatauni', ocr_provider } = req.body || {}

    const result = await landRecordOcrService.processLandRecordUpload({
      userClient,
      farmerId: userId,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      documentType: document_type,
      options: {
        ocrProvider: ocr_provider,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Land record document uploaded and processed successfully. Please review and confirm the extracted details.',
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
 * PUT /api/land-records/:id/confirm
 * Allows the farmer to confirm and/or correct the extracted land record attributes.
 * Updates the record and transitions its confirmation_status to 'confirmed_by_farmer'.
 */
export const confirmLandRecord = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { id } = req.params

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid land record ID format. Must be a valid UUID.',
      })
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object.',
      })
    }

    const updatedRecord = await landRecordOcrService.confirmLandRecord(
      userClient,
      userId,
      id,
      req.body
    )

    return res.status(200).json({
      success: true,
      message: 'Land record details confirmed successfully.',
      data: updatedRecord,
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
 * GET /api/land-records/:id/document
 * Retrieves a secure, short-lived signed URL to view/download the uploaded land document.
 * Never exposes public URLs.
 */
export const getLandRecordDocument = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { id } = req.params

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid land record ID format. Must be a valid UUID.',
      })
    }

    const docData = await landRecordOcrService.getDocumentSignedUrl(
      userClient,
      userId,
      id
    )

    return res.status(200).json({
      success: true,
      data: docData,
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
 * POST /api/land-records/signed-upload-url
 * Generates short-lived signed upload URL for direct client-to-Supabase upload.
 * Solves Vercel's 4.5MB serverless request body limitation.
 */
export const getSignedUploadUrl = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { file_name, mime_type, file_size } = req.body || {}

    if (!mime_type) {
      return res.status(400).json({
        success: false,
        message: 'mime_type is required to generate a signed upload URL.',
      })
    }

    const result = await landRecordOcrService.createSignedUploadUrl({
      userClient,
      farmerId: userId,
      fileName: file_name,
      mimeType: mime_type,
      fileSize: file_size,
    })

    return res.status(200).json({
      success: true,
      message: 'Signed upload URL generated successfully.',
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
 * POST /api/land-records/process-uploaded-storage
 * Runs OCR and creates draft land record for an already-uploaded document in private storage.
 */
export const processUploadedStorage = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userClient = req.supabase
    const { storage_path, file_name, document_type = 'khatauni', ocr_provider } = req.body || {}

    if (!storage_path) {
      return res.status(400).json({
        success: false,
        message: 'storage_path is required.',
      })
    }

    const result = await landRecordOcrService.processUploadedStorageDocument({
      userClient,
      farmerId: userId,
      storagePath: storage_path,
      fileName: file_name,
      documentType: document_type,
      options: {
        ocrProvider: ocr_provider,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Document processed successfully from secure storage. Please review draft.',
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
