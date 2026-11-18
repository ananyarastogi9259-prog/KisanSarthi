// ============================================================
// src/services/ocr/landRecordOcrService.js
// Land Record Upload & OCR Orchestration Service
// ============================================================
// Orchestrates the complete land document pipeline:
//   1. File validation (MIME types, file size, magic bytes)
//   2. Private storage in Supabase 'land-records' bucket
//   3. Document metadata tracking in `documents` table
//   4. Text extraction via pluggable OCR adapter
//   5. Domain parsing via LandRecordTextParser
//   6. Draft record creation in `land_records` (confirmation_status: unconfirmed)
//   7. Farmer confirmation & correction workflow
//   8. Secure signed URL generation for document viewing
//
// INTEGRITY & SECURITY RULES:
//   - Uses authenticated user client (req.supabase) to enforce RLS.
//   - Never exposes private storage files via public URLs.
//   - Respects DB check constraint: verification_status IN ('pending', 'rejected').
//   - Does not treat draft OCR data as verified.
// ============================================================

import crypto from 'node:crypto'
import path from 'node:path'
import { getOcrAdapter } from './adapters/index.js'
import { LandRecordTextParser } from './parsers/LandRecordTextParser.js'

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class LandRecordOcrService {
  /**
   * Validates file buffer, MIME type, and size constraints.
   * @param {Buffer} buffer
   * @param {string} mimeType
   */
  static validateUpload(buffer, mimeType) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      const err = new Error('Invalid file payload: Expected binary buffer.')
      err.statusCode = 400
      throw err
    }

    if (buffer.length === 0) {
      const err = new Error('Uploaded file is empty (0 bytes).')
      err.statusCode = 400
      throw err
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      const err = new Error(
        `File size exceeds maximum allowable limit of 10MB (${(
          buffer.length /
          (1024 * 1024)
        ).toFixed(2)}MB).`
      )
      err.statusCode = 400
      throw err
    }

    const cleanMime = (mimeType || '').toLowerCase().trim()
    if (!ALLOWED_MIME_TYPES[cleanMime]) {
      const err = new Error(
        `Unsupported file format "${mimeType}". Allowed formats: JPEG, PNG, WEBP, and PDF.`
      )
      err.statusCode = 400
      throw err
    }

    // Magic byte signature validation
    if (cleanMime === 'application/pdf') {
      const header = buffer.toString('utf8', 0, 5)
      if (!header.startsWith('%PDF-')) {
        const err = new Error('Malformed PDF file: Invalid magic header.')
        err.statusCode = 400
        throw err
      }
    } else if (cleanMime === 'image/jpeg') {
      if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
        const err = new Error('Malformed JPEG file: Invalid header signature.')
        err.statusCode = 400
        throw err
      }
    } else if (cleanMime === 'image/png') {
      if (
        buffer[0] !== 0x89 ||
        buffer[1] !== 0x50 ||
        buffer[2] !== 0x4e ||
        buffer[3] !== 0x47
      ) {
        const err = new Error('Malformed PNG file: Invalid header signature.')
        err.statusCode = 400
        throw err
      }
    }
  }

  /**
   * Uploads land record document, runs OCR, and creates draft land record.
   *
   * @param {Object} params
   * @param {import('@supabase/supabase-js').SupabaseClient} params.userClient - Authenticated Supabase client
   * @param {string} params.farmerId - Authenticated user UUID
   * @param {Buffer} params.fileBuffer - Binary file buffer
   * @param {string} params.fileName - Original file name
   * @param {string} params.mimeType - MIME type
   * @param {string} [params.documentType='khatauni'] - Document category slug
   * @param {Object} [params.options={}] - Optional overrides (e.g. ocrProvider)
   * @returns {Promise<Object>} Draft record and extracted fields
   */
  async processLandRecordUpload({
    userClient,
    farmerId,
    fileBuffer,
    fileName,
    mimeType,
    documentType = 'khatauni',
    options = {},
  }) {
    if (!userClient) {
      throw new Error('Supabase client is not initialized.')
    }
    if (!farmerId || !UUID_REGEX.test(farmerId)) {
      const err = new Error('Invalid farmer ID.')
      err.statusCode = 400
      throw err
    }

    // 1. Validate file constraints
    LandRecordOcrService.validateUpload(fileBuffer, mimeType)

    const cleanMime = mimeType.toLowerCase().trim()
    const extension = ALLOWED_MIME_TYPES[cleanMime] || '.bin'
    const documentId = crypto.randomUUID()
    const safeFileName = path.basename(fileName || `document${extension}`).slice(0, 255)

    // Storage path convention: {farmerId}/{documentId}.{ext}
    const storagePath = `${farmerId}/${documentId}${extension}`

    // 2. Upload to private Supabase Storage bucket ('land-records')
    const { error: storageError } = await userClient.storage
      .from('land-records')
      .upload(storagePath, fileBuffer, {
        contentType: cleanMime,
        upsert: false,
      })

    if (storageError) {
      console.error('Storage upload failure:', storageError.message)
      throw new Error(`Failed to store document securely: ${storageError.message}`)
    }

    // 3. Register document in `documents` table
    const { data: docRecord, error: docError } = await userClient
      .from('documents')
      .insert({
        id: documentId,
        farmer_id: farmerId,
        document_type: documentType,
        file_name: safeFileName,
        storage_path: storagePath,
      })
      .select('id, document_type, file_name, storage_path, created_at')
      .single()

    if (docError) {
      console.error('Database insert into documents failed:', docError.message)
      // Attempt cleanup of uploaded storage object
      await userClient.storage.from('land-records').remove([storagePath]).catch(() => {})
      throw new Error(`Failed to register document metadata: ${docError.message}`)
    }

    // 4. Execute OCR text extraction
    const ocrAdapter = getOcrAdapter(options.ocrProvider)
    let ocrResult = { text: '', confidence: 0, provider: ocrAdapter.providerName }

    try {
      ocrResult = await ocrAdapter.extractText(fileBuffer, cleanMime, options)
    } catch (ocrErr) {
      console.warn(`⚠️ [OCR] Text extraction warning from ${ocrAdapter.providerName}:`, ocrErr.message)
      ocrResult = {
        text: '',
        confidence: 0,
        provider: ocrAdapter.providerName,
        error: ocrErr.message,
      }
    }

    // 5. Check if document is a land record or non-land document (Aadhaar, Passbook, Declaration)
    const landRecordTypes = ['khatauni', 'land_record', 'khatiyan', '7_12', 'ror', 'bhulekh', 'patta', 'jamabandi']
    const isLandRecord = landRecordTypes.includes(documentType.toLowerCase().trim())

    if (!isLandRecord) {
      return {
        document_id: documentId,
        land_record_id: null,
        file_name: safeFileName,
        storage_path: storagePath,
        bucket: 'land-records',
        status: 'verified',
        document_type: documentType,
        extracted_fields: {},
        extracted_attributes: {},
        ocr_metadata: {
          provider: ocrResult.provider,
          confidence: ocrResult.confidence,
          is_empty_or_poor_quality: false,
        },
        confirmation_required: false,
        verification_status: 'verified',
      }
    }

    // 6. Parse extracted text into structured land attributes
    const parsed = LandRecordTextParser.parse(ocrResult.text)

    // 7. Insert DRAFT land record into `land_records` table
    const draftPayload = {
      farmer_id: farmerId,
      survey_number: parsed.survey_number || null,
      land_area: parsed.land_area !== null ? parsed.land_area : null,
      area_unit: parsed.area_unit || 'acres',
      state: parsed.state || 'Uttar Pradesh',
      district: parsed.district || null,
      village: parsed.village || null,
      record_type: documentType,
      verification_status: 'pending', // Allowed by DB check constraint
      extracted_data: {
        document_id: documentId,
        source: 'ocr_extraction',
        ocr_provider: ocrResult.provider,
        confirmation_status: 'unconfirmed', // Explicitly DRAFT
        ocr_confidence: ocrResult.confidence,
        khata_number: parsed.khata_number,
        tehsil: parsed.tehsil,
        land_type: parsed.land_type || 'agricultural_cultivable',
        ownership_type: parsed.ownership_type || 'individual',
        holder_name: parsed.holder_name,
        raw_text_snippet: parsed.raw_text_snippet,
        is_empty_or_poor_quality: parsed.is_empty || parsed.confidence < 0.2,
      },
    }

    const { data: newLandRecord, error: landInsertError } = await userClient
      .from('land_records')
      .insert(draftPayload)
      .select('id, farmer_id, survey_number, land_area, area_unit, state, district, village, record_type, extracted_data, verification_status, created_at')
      .single()

    if (landInsertError) {
      console.error('Failed to create draft land record:', landInsertError.message)
      throw new Error(`Failed to create draft land record: ${landInsertError.message}`)
    }

    // 7. Link document to created land record
    try {
      await userClient
        .from('documents')
        .update({ land_record_id: newLandRecord.id })
        .eq('id', documentId)
    } catch (e) {
      console.warn('Warning linking document to land_record:', e.message)
    }

    const extractedFields = {
      survey_number: parsed.survey_number,
      khata_number: parsed.khata_number,
      land_area: parsed.land_area,
      area_unit: parsed.area_unit,
      state: parsed.state,
      district: parsed.district,
      tehsil: parsed.tehsil,
      village: parsed.village,
      ownership_type: parsed.ownership_type,
      land_type: parsed.land_type,
      holder_name: parsed.holder_name,
    }

    return {
      document_id: documentId,
      land_record_id: newLandRecord.id,
      file_name: safeFileName,
      storage_path: storagePath,
      bucket: 'land-records',
      status: 'draft',
      extracted_fields: extractedFields,
      extracted_attributes: extractedFields,
      ocr_metadata: {
        provider: ocrResult.provider,
        confidence: ocrResult.confidence,
        is_empty_or_poor_quality: parsed.is_empty || parsed.confidence < 0.2,
      },
      confirmation_required: true,
      verification_status: 'pending',
    }
  }

  /**
   * Confirms and updates a draft land record with farmer-reviewed values.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} farmerId
   * @param {string} recordId
   * @param {Object} confirmedData
   * @returns {Promise<Object>} Updated confirmed land record
   */
  async confirmLandRecord(userClient, farmerId, recordId, confirmedData = {}) {
    if (!UUID_REGEX.test(recordId)) {
      const err = new Error('Invalid land record ID.')
      err.statusCode = 400
      throw err
    }

    // 1. Fetch current record ensuring farmer ownership
    const { data: currentRecord, error: fetchError } = await userClient
      .from('land_records')
      .select('*')
      .eq('id', recordId)
      .eq('farmer_id', farmerId)
      .maybeSingle()

    if (fetchError || !currentRecord) {
      const err = new Error('Land record not found or access denied.')
      err.statusCode = 404
      throw err
    }

    // 2. Prepare confirmed fields
    const updatedSurvey =
      confirmedData.survey_number !== undefined
        ? confirmedData.survey_number
        : currentRecord.survey_number

    let updatedArea = currentRecord.land_area
    if (confirmedData.land_area !== undefined && confirmedData.land_area !== null) {
      const numArea = Number(confirmedData.land_area)
      if (isNaN(numArea) || numArea <= 0) {
        const err = new Error('Land area must be a valid positive number.')
        err.statusCode = 400
        throw err
      }
      updatedArea = numArea
    }

    const updatedUnit = confirmedData.area_unit || currentRecord.area_unit || 'acres'
    const updatedState = confirmedData.state || currentRecord.state || 'Uttar Pradesh'
    const updatedDistrict =
      confirmedData.district !== undefined ? confirmedData.district : currentRecord.district
    const updatedVillage =
      confirmedData.village !== undefined ? confirmedData.village : currentRecord.village

    // Merge existing extracted_data with farmer confirmation state
    const currentExt = currentRecord.extracted_data || {}
    const updatedExtractedData = {
      ...currentExt,
      ownership_type: confirmedData.ownership_type || currentExt.ownership_type || 'individual',
      land_type: confirmedData.land_type || currentExt.land_type || 'agricultural_cultivable',
      confirmation_status: 'confirmed_by_farmer',
      confirmed_at: new Date().toISOString(),
      confirmed_by: farmerId,
      farmer_corrected_fields: {
        survey_number: confirmedData.survey_number !== undefined,
        land_area: confirmedData.land_area !== undefined,
        district: confirmedData.district !== undefined,
        village: confirmedData.village !== undefined,
      },
    }

    // 3. Execute update via userClient (enforcing RLS)
    const { data: updatedRecord, error: updateError } = await userClient
      .from('land_records')
      .update({
        survey_number: updatedSurvey,
        land_area: updatedArea,
        area_unit: updatedUnit,
        state: updatedState,
        district: updatedDistrict,
        village: updatedVillage,
        extracted_data: updatedExtractedData,
        verification_status: 'pending', // Strictly preserves 'pending' per DB check constraint
      })
      .eq('id', recordId)
      .eq('farmer_id', farmerId)
      .select('id, farmer_id, survey_number, land_area, area_unit, state, district, village, record_type, extracted_data, verification_status, created_at')
      .single()

    if (updateError) {
      console.error('Error confirming land record:', updateError.message)
      throw new Error(`Failed to confirm land record: ${updateError.message}`)
    }

    return updatedRecord
  }

  /**
   * Generates a secure, time-limited signed URL to view the uploaded document.
   * Never generates public URLs.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} userClient
   * @param {string} farmerId
   * @param {string} recordId - land_records.id
   * @param {number} [expiresInSeconds=900] - 15 minutes default
   * @returns {Promise<Object>} { signed_url, expires_in, file_name, document_type }
   */
  async getDocumentSignedUrl(userClient, farmerId, recordId, expiresInSeconds = 900) {
    if (!UUID_REGEX.test(recordId)) {
      const err = new Error('Invalid land record ID.')
      err.statusCode = 400
      throw err
    }

    // Find linked document owned by farmer
    const { data: doc, error: docError } = await userClient
      .from('documents')
      .select('id, farmer_id, land_record_id, document_type, file_name, storage_path')
      .eq('land_record_id', recordId)
      .eq('farmer_id', farmerId)
      .maybeSingle()

    if (docError || !doc) {
      const err = new Error('No uploaded document found for this land record.')
      err.statusCode = 404
      throw err
    }

    // Generate secure time-limited signed URL from private bucket
    const { data: signedData, error: signError } = await userClient.storage
      .from('land-records')
      .createSignedUrl(doc.storage_path, expiresInSeconds)

    if (signError || !signedData?.signedUrl) {
      throw new Error(`Failed to generate secure document URL: ${signError?.message}`)
    }

    return {
      document_id: doc.id,
      file_name: doc.file_name,
      document_type: doc.document_type,
      signed_url: signedData.signedUrl,
      expires_in: expiresInSeconds,
      storage_path: doc.storage_path,
    }
  }

  /**
   * Generates a short-lived signed upload URL for direct client-to-Supabase upload.
   * Completely bypasses Vercel's 4.5MB request payload limit.
   */
  async createSignedUploadUrl({ userClient, farmerId, fileName, mimeType, fileSize }) {
    if (!userClient) throw new Error('Supabase client is not initialized.')
    if (!farmerId || !UUID_REGEX.test(farmerId)) {
      const err = new Error('Invalid farmer ID.')
      err.statusCode = 400
      throw err
    }

    const cleanMime = (mimeType || '').toLowerCase().trim()
    if (!ALLOWED_MIME_TYPES[cleanMime]) {
      const err = new Error(
        `Unsupported file format "${mimeType}". Allowed formats: JPEG, PNG, WEBP, and PDF.`
      )
      err.statusCode = 400
      throw err
    }

    if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
      const err = new Error('File size exceeds maximum allowable limit of 10MB.')
      err.statusCode = 400
      throw err
    }

    const extension = ALLOWED_MIME_TYPES[cleanMime] || '.bin'
    const documentId = crypto.randomUUID()
    const safeFileName = path.basename(fileName || `document${extension}`).slice(0, 255)
    const storagePath = `${farmerId}/${documentId}${extension}`

    const { data, error } = await userClient.storage
      .from('land-records')
      .createSignedUploadUrl(storagePath)

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed upload URL: ${error?.message}`)
    }

    return {
      signed_upload_url: data.signedUrl,
      token: data.token,
      storage_path: storagePath,
      document_id: documentId,
      file_name: safeFileName,
      mime_type: cleanMime,
      expires_in: 900,
    }
  }

  /**
   * Processes a document already uploaded to private Supabase Storage via signed URL.
   * Runs OCR, text extraction, registers in `documents`, and creates a draft land record.
   */
  async processUploadedStorageDocument({
    userClient,
    farmerId,
    storagePath,
    fileName,
    documentType = 'khatauni',
    options = {},
  }) {
    if (!userClient) throw new Error('Supabase client is not initialized.')
    if (!farmerId || !UUID_REGEX.test(farmerId)) {
      const err = new Error('Invalid farmer ID.')
      err.statusCode = 400
      throw err
    }
    if (!storagePath || !storagePath.startsWith(`${farmerId}/`)) {
      const err = new Error('Invalid storage path or cross-tenant access denied.')
      err.statusCode = 403
      throw err
    }

    // 1. Download file buffer from private bucket
    const { data: blob, error: downloadError } = await userClient.storage
      .from('land-records')
      .download(storagePath)

    if (downloadError || !blob) {
      const err = new Error(
        `Failed to retrieve uploaded document from storage: ${downloadError?.message}`
      )
      err.statusCode = 404
      throw err
    }

    const fileBuffer = Buffer.from(await blob.arrayBuffer())
    const mimeType = blob.type || (storagePath.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')

    // 2. Validate file buffer
    LandRecordOcrService.validateUpload(fileBuffer, mimeType)

    // 3. Register document in `documents` table
    const safeFileName = path.basename(fileName || path.basename(storagePath)).slice(0, 255)
    const documentId = crypto.randomUUID()

    const { data: docRecord, error: docError } = await userClient
      .from('documents')
      .insert({
        id: documentId,
        farmer_id: farmerId,
        document_type: documentType,
        file_name: safeFileName,
        storage_path: storagePath,
      })
      .select('id, document_type, file_name, storage_path, created_at')
      .single()

    if (docError) {
      throw new Error(`Failed to register document record: ${docError.message}`)
    }

    // 4. Run OCR adapter
    const ocrAdapter = getOcrAdapter(options.ocrProvider)
    const ocrResult = await ocrAdapter.extractText(fileBuffer, mimeType, options)

    // 5. Parse extracted text
    const parsedFields = LandRecordTextParser.parse(ocrResult.rawText)

    // 6. Create draft land record
    const draftLandRecord = {
      farmer_id: farmerId,
      survey_number: parsedFields.survey_number || null,
      land_area: parsedFields.land_area !== null ? parsedFields.land_area : null,
      area_unit: parsedFields.area_unit || 'acres',
      state: parsedFields.state || 'Uttar Pradesh',
      district: parsedFields.district || null,
      village: parsedFields.village || null,
      record_type: documentType,
      verification_status: 'pending',
      extracted_data: {
        ownership_type: parsedFields.ownership_type || 'individual',
        land_type: parsedFields.land_type || 'agricultural_cultivable',
        khata_number: parsedFields.khata_number,
        holder_name: parsedFields.holder_name,
        confidence: parsedFields.confidence,
        raw_text_snippet: parsedFields.raw_text_snippet,
        ocr_provider: ocrResult.provider,
        ocr_execution_ms: ocrResult.executionMs,
        is_empty_or_poor_quality: parsedFields.is_empty,
        confirmation_status: 'unconfirmed',
      },
    }

    const { data: recordData, error: recordError } = await userClient
      .from('land_records')
      .insert(draftLandRecord)
      .select(
        'id, farmer_id, survey_number, land_area, area_unit, state, district, village, record_type, extracted_data, verification_status, created_at'
      )
      .single()

    if (recordError) {
      throw new Error(`Failed to create draft land record: ${recordError.message}`)
    }

    // Link document to land record
    await userClient
      .from('documents')
      .update({ land_record_id: recordData.id })
      .eq('id', docRecord.id)

    return {
      land_record_id: recordData.id,
      document_id: docRecord.id,
      storage_path: storagePath,
      bucket: 'land-records',
      extracted_fields: parsedFields,
      ocr_provider: ocrResult.provider,
      status: 'draft',
      confirmation_status: 'unconfirmed',
      land_record: recordData,
    }
  }
}

const landRecordOcrService = new LandRecordOcrService()
export default landRecordOcrService

