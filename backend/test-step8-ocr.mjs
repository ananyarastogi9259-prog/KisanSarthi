// ============================================================
// test-step8-ocr.mjs
// Step 8 Phase 2 Comprehensive Test Suite: Land Record Upload & OCR
// ============================================================
// Tests all 13 required scenarios:
//   1. Authenticated image upload (JPEG/PNG) creates draft record (201)
//   2. Authenticated PDF upload creates draft record (201)
//   3. Unsupported file type rejected (400)
//   4. Oversized file (>10MB) rejected (400)
//   5. Unauthenticated request rejected (401)
//   6. Cross-tenant isolation (Farmer B cannot access Farmer A's doc/record)
//   7. Land record document parsed correctly via OCR & domain parser
//   8. Text parser handles poor quality/empty text safely (is_empty_or_poor_quality)
//   9. Extracted draft record requires confirmation (unconfirmed / pending)
//   10. Farmer confirmation & correction workflow (PUT /:id/confirm)
//   11. Secure time-limited signed URL retrieval (GET /:id/document)
//   12. Existing land-record CRUD works without regression
//   13. Existing eligibility engine and scheme APIs work without regression
// ============================================================

import './src/config/env.js'
import assert from 'node:assert'
import { createClient } from '@supabase/supabase-js'
import app from './src/app.js'
import { LandRecordTextParser } from './src/services/ocr/parsers/LandRecordTextParser.js'
import eligibilityService from './src/services/eligibilityService.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🧪 RUNNING STEP 8 PHASE 2 COMPREHENSIVE TEST SUITE')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

let passedTests = 0
let failedTests = 0

function reportResult(name, passed, detail = '') {
  if (passed) {
    passedTests++
    console.log(`  ✅ PASS: ${name}`)
    if (detail) console.log(`     └─ ${detail}`)
  } else {
    failedTests++
    console.error(`  ❌ FAIL: ${name}`)
    if (detail) console.error(`     └─ ${detail}`)
  }
}

// ── Binary Buffer Generators for Tests ───────────────────────
function createValidJpegBuffer(tag = '') {
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xfe])
  const payload = Buffer.from(`\x00\x20${tag}_VALID_JPEG_TEST_BUFFER_WITH_PADDING_FOR_MIN_SIZE`)
  const footer = Buffer.from([0xff, 0xd9])
  return Buffer.concat([header, payload, footer])
}

function createValidPngBuffer(tag = '') {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const payload = Buffer.from(`PNG_TEST_CHUNK_${tag}_PADDING_MORE_BYTES_FOR_VALIDITY`)
  return Buffer.concat([header, payload])
}

function createValidPdfBuffer(tag = '') {
  return Buffer.from(
    `%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (${tag}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`
  )
}

// ── Setup Context ────────────────────────────────────────────
let server = null
let port = null
let serviceClient = null
let publicClient = null
let testUserA = null
let testUserB = null
let tokenA = null
let tokenB = null

// Tracking resources for teardown
const uploadedDocIds = []
const createdLandRecordIds = []
const uploadedStoragePaths = []

try {
  serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  publicClient = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Ensure verified PM-KISAN rule is seeded
  await eligibilityService.seedVerifiedRules(serviceClient)

  // 1. Create confirmed Test Farmer A
  const emailA = `farmer_step8_a_${Date.now()}@kisansarthi.internal`
  const passwordA = 'Pass!12345678'
  const { data: uA } = await serviceClient.auth.admin.createUser({
    email: emailA,
    password: passwordA,
    email_confirm: true,
  })
  testUserA = uA.user

  // 2. Create confirmed Test Farmer B (for cross-tenant checks)
  const emailB = `farmer_step8_b_${Date.now()}@kisansarthi.internal`
  const passwordB = 'Pass!12345678'
  const { data: uB } = await serviceClient.auth.admin.createUser({
    email: emailB,
    password: passwordB,
    email_confirm: true,
  })
  testUserB = uB.user

  // 3. Provision Farmer Profiles
  await serviceClient.from('farmer_profiles').upsert({
    id: testUserA.id,
    state: 'Uttar Pradesh',
    district: 'Gorakhpur',
    village: 'Pipraich',
    pincode: '273001',
  })

  await serviceClient.from('farmer_profiles').upsert({
    id: testUserB.id,
    state: 'Uttar Pradesh',
    district: 'Bareilly',
    village: 'Nawabganj',
    pincode: '243001',
  })

  // 4. Sign in both farmers
  const { data: signA } = await publicClient.auth.signInWithPassword({
    email: emailA,
    password: passwordA,
  })
  tokenA = signA.session.access_token

  const { data: signB } = await publicClient.auth.signInWithPassword({
    email: emailB,
    password: passwordB,
  })
  tokenB = signB.session.access_token

  // 5. Start ephemeral Express server
  server = app.listen(0)
  port = server.address().port
} catch (setupErr) {
  console.error('Fatal test setup error:', setupErr.message)
}

// ─────────────────────────────────────────────────────────────
// Test 1: Authenticated Image Upload (JPEG/PNG) Creates Draft (201)
// ─────────────────────────────────────────────────────────────
console.log('[Test 1] Authenticated Image Upload (JPEG) -> Draft Record Creation')
let recordAId = null
let docAId = null
try {
  const jpegBuf = createValidJpegBuffer('ENGLISH_RECORD')
  const formData = new FormData()
  formData.append('file', new Blob([jpegBuf], { type: 'image/jpeg' }), 'khatauni_sample.jpg')
  formData.append('document_type', 'khatauni')

  const res = await fetch(`http://localhost:${port}/api/land-records/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  })

  const json = await res.json()
  if (res.status !== 201) {
    console.error('❌ Upload returned status', res.status, 'Body:', JSON.stringify(json, null, 2))
  }
  assert.strictEqual(res.status, 201)
  assert.strictEqual(json.success, true)
  assert.ok(json.data.land_record_id)
  assert.ok(json.data.document_id)
  assert.strictEqual(json.data.bucket, 'land-records')
  assert.strictEqual(json.data.confirmation_required, true)
  assert.strictEqual(json.data.verification_status, 'pending')

  recordAId = json.data.land_record_id
  docAId = json.data.document_id
  createdLandRecordIds.push(recordAId)
  uploadedDocIds.push(docAId)
  uploadedStoragePaths.push(json.data.storage_path)

  // Verify DB state
  const { data: dbRec } = await serviceClient
    .from('land_records')
    .select('*')
    .eq('id', recordAId)
    .single()

  assert.strictEqual(dbRec.farmer_id, testUserA.id)
  assert.strictEqual(dbRec.verification_status, 'pending')
  assert.strictEqual(dbRec.extracted_data.confirmation_status, 'unconfirmed')
  assert.strictEqual(dbRec.extracted_data.document_id, docAId)

  reportResult(
    'Authenticated JPEG upload creates draft land record with confirmation_status: unconfirmed (HTTP 201)',
    true,
    `Record ID: ${recordAId}, Doc ID: ${docAId}`
  )
} catch (err) {
  reportResult('Authenticated JPEG upload test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 2: Authenticated PDF Upload Creates Draft (201)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 2] Authenticated PDF Upload -> Draft Record Creation')
let recordPdfId = null
try {
  const pdfBuf = createValidPdfBuffer('ENGLISH_RECORD')
  const formData = new FormData()
  formData.append('file', new Blob([pdfBuf], { type: 'application/pdf' }), 'land_record.pdf')
  formData.append('document_type', 'khatauni')

  const res = await fetch(`http://localhost:${port}/api/land-records/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  })

  const json = await res.json()
  if (res.status !== 201) {
    console.error('❌ Upload returned status', res.status, 'Body:', JSON.stringify(json, null, 2))
  }
  assert.strictEqual(res.status, 201)
  assert.strictEqual(json.success, true)
  assert.ok(json.data.land_record_id)
  assert.strictEqual(json.data.bucket, 'land-records')

  recordPdfId = json.data.land_record_id
  createdLandRecordIds.push(recordPdfId)
  uploadedDocIds.push(json.data.document_id)
  uploadedStoragePaths.push(json.data.storage_path)

  reportResult('Authenticated PDF upload accepted and stored in land-records bucket (HTTP 201)', true)
} catch (err) {
  reportResult('Authenticated PDF upload test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 3: Unsupported File Type Rejected (400)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 3] Unsupported File Type Rejection (400)')
try {
  const txtBuf = Buffer.from('This is a plain text file, not a land document.')
  const formData = new FormData()
  formData.append('file', new Blob([txtBuf], { type: 'text/plain' }), 'document.txt')

  const res = await fetch(`http://localhost:${port}/api/land-records/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  })

  assert.strictEqual(res.status, 400)
  const json = await res.json()
  assert.strictEqual(json.success, false)
  assert.ok(json.message.includes('Unsupported file format'))

  reportResult('Unsupported file type (text/plain) rejected with HTTP 400 and clear message', true)
} catch (err) {
  reportResult('Unsupported file type test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 4: Oversized File Rejected (>10MB) (400)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 4] Oversized File Rejection (>10MB) (400)')
try {
  // Create 10.2 MB buffer
  const oversizedBuf = Buffer.alloc(10 * 1024 * 1024 + 200 * 1024, 0x55)
  oversizedBuf[0] = 0x89
  oversizedBuf[1] = 0x50
  oversizedBuf[2] = 0x4e
  oversizedBuf[3] = 0x47
  oversizedBuf[4] = 0x0d
  oversizedBuf[5] = 0x0a
  oversizedBuf[6] = 0x1a
  oversizedBuf[7] = 0x0a

  const formData = new FormData()
  formData.append('file', new Blob([oversizedBuf], { type: 'image/png' }), 'huge_scan.png')

  const res = await fetch(`http://localhost:${port}/api/land-records/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  })

  assert.strictEqual(res.status, 400)
  const json = await res.json()
  assert.strictEqual(json.success, false)
  assert.ok(json.message.includes('10MB') || json.message.includes('exceeds'))

  reportResult('Oversized upload (>10MB) rejected with HTTP 400 and clear limit notice', true)
} catch (err) {
  reportResult('Oversized file rejection test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 5: Unauthenticated Request Rejected (401)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 5] Unauthenticated Request Rejection (401)')
try {
  const jpegBuf = createValidJpegBuffer('ANONYMOUS')
  const formData = new FormData()
  formData.append('file', new Blob([jpegBuf], { type: 'image/jpeg' }), 'doc.jpg')

  const res = await fetch(`http://localhost:${port}/api/land-records/upload`, {
    method: 'POST',
    body: formData,
  })

  assert.strictEqual(res.status, 401)
  const json = await res.json()
  assert.strictEqual(json.success, false)

  reportResult('Unauthenticated upload request rejected with HTTP 401', true)
} catch (err) {
  reportResult('Unauthenticated request rejection test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 6: Cross-Tenant Isolation (Farmer B cannot access Farmer A's doc)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 6] Cross-Tenant Security & Storage Isolation')
try {
  assert.ok(recordAId, 'Record A must exist from Test 1')

  // Subcase A: Farmer B attempts to get signed document URL for Farmer A's record
  const viewRes = await fetch(`http://localhost:${port}/api/land-records/${recordAId}/document`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert.strictEqual(viewRes.status, 404)
  const viewJson = await viewRes.json()
  assert.strictEqual(viewJson.success, false)

  // Subcase B: Farmer B attempts to confirm Farmer A's record
  const confirmRes = await fetch(`http://localhost:${port}/api/land-records/${recordAId}/confirm`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ survey_number: '999/SPOOF' }),
  })
  assert.strictEqual(confirmRes.status, 404)
  const confirmJson = await confirmRes.json()
  assert.strictEqual(confirmJson.success, false)

  // Subcase C: Direct storage access attempt by Farmer B's client using Farmer A's path
  const storagePathA = uploadedStoragePaths[0]
  const bSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${tokenB}` } },
  })
  const { data: bSignedData, error: bSignErr } = await bSupabase.storage
    .from('land-records')
    .createSignedUrl(storagePathA, 60)

  // Storage RLS blocks cross-tenant signed URL creation or yields error
  const isBlocked = bSignErr !== null || !bSignedData?.signedUrl
  assert.ok(isBlocked, 'Cross-tenant direct storage access must be blocked')

  reportResult(
    'Cross-tenant isolation enforced: Farmer B cannot view, confirm, or sign Farmer A documents',
    true
  )
} catch (err) {
  reportResult('Cross-tenant isolation test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 7: Land Record OCR & Domain Parsing Accuracy (Devanagari & English)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 7] Land Record OCR & Domain Parsing (Hindi + English + Aadhaar Masking)')
try {
  // Test Devanagari Hindi Text Parsing
  const hindiText = `
उत्तर प्रदेश सरकार - राजस्व परिषद
उद्धरण खतौनी (अधिकार अभिलेख)
जनपद : वाराणसी
तहसील : पिण्डरा
ग्राम : शिवपुर
खाता संख्या : 00142
खसरा संख्या : 104/2
क्षेत्रफल : 0.8090 हेक्टेयर (2.00 एकड़)
श्रेणी : 1-क भूमि जो संक्रमणीय भूमिधरों के अधिकार में हो
स्वामित्व प्रकार : एकल (Individual)
खातेदार का नाम : राम कुमार
पहचान आधार : 1234 5678 9012
  `.trim()

  const hindiParsed = LandRecordTextParser.parse(hindiText)
  assert.strictEqual(hindiParsed.survey_number, '104/2')
  assert.strictEqual(hindiParsed.khata_number, '00142')
  assert.strictEqual(hindiParsed.district, 'वाराणसी')
  assert.strictEqual(hindiParsed.village, 'शिवपुर')
  assert.strictEqual(hindiParsed.ownership_type, 'individual')
  assert.strictEqual(hindiParsed.land_type, 'agricultural_cultivable')
  assert.strictEqual(hindiParsed.holder_name, 'राम कुमार')
  // Verify Aadhaar masking
  assert.ok(!hindiParsed.raw_text_snippet.includes('1234 5678 9012'))
  assert.ok(hindiParsed.raw_text_snippet.includes('XXXX-XXXX-9012'))

  // Test English Text Parsing
  const englishText = `
GOVERNMENT OF UTTAR PRADESH - REVENUE DEPARTMENT
District: Gorakhpur
Tehsil: Pipraich
Village: Pipraich
Khata No: 00341
Khasra No: 786/A
Land Area: 2.20 Acres
Ownership: Joint
Category: Agricultural Cultivable (1-Ka Bhumidhari)
Landholder Name: Shyam Lal
  `.trim()

  const englishParsed = LandRecordTextParser.parse(englishText)
  assert.strictEqual(englishParsed.survey_number, '786/A')
  assert.strictEqual(englishParsed.khata_number, '00341')
  assert.strictEqual(englishParsed.land_area, 2.2)
  assert.strictEqual(englishParsed.area_unit, 'acres')
  assert.strictEqual(englishParsed.district, 'Gorakhpur')
  assert.strictEqual(englishParsed.village, 'Pipraich')
  assert.strictEqual(englishParsed.ownership_type, 'joint')

  reportResult(
    'Land record parser successfully extracts Khasra, Area, District, Village & masks Aadhaar PII',
    true,
    `Survey: ${hindiParsed.survey_number}, Area: ${hindiParsed.land_area} ${hindiParsed.area_unit}, Aadhaar masked: XXXX-XXXX-9012`
  )
} catch (err) {
  reportResult('Land record parser test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 8: Poor Quality / Empty Text Fallback Handled Safely
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 8] Poor Quality / Empty Text Handling')
try {
  const emptyBuf = createValidJpegBuffer('EMPTY_DOCUMENT')
  const formData = new FormData()
  formData.append('file', new Blob([emptyBuf], { type: 'image/jpeg' }), 'blurry_scan.jpg')

  const res = await fetch(`http://localhost:${port}/api/land-records/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData,
  })

  const json = await res.json()
  if (res.status !== 201) {
    console.error('❌ Upload returned status', res.status, 'Body:', JSON.stringify(json, null, 2))
  }
  assert.strictEqual(res.status, 201)
  assert.strictEqual(json.success, true)
  assert.strictEqual(json.data.ocr_metadata.is_empty_or_poor_quality, true)
  assert.strictEqual(json.data.extracted_fields.survey_number, null)
  assert.strictEqual(json.data.confirmation_required, true)

  createdLandRecordIds.push(json.data.land_record_id)
  uploadedDocIds.push(json.data.document_id)
  uploadedStoragePaths.push(json.data.storage_path)

  reportResult(
    'Poor quality / unreadable document handled safely with is_empty_or_poor_quality: true',
    true
  )
} catch (err) {
  reportResult('Poor quality text fallback test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 9: Extracted Draft State Verification (unconfirmed / pending)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 9] Extracted Draft State Verification')
try {
  assert.ok(recordAId, 'Record A must exist from Test 1')

  const { data: rec } = await serviceClient
    .from('land_records')
    .select('*')
    .eq('id', recordAId)
    .single()

  assert.strictEqual(rec.verification_status, 'pending')
  assert.strictEqual(rec.extracted_data.confirmation_status, 'unconfirmed')
  assert.strictEqual(rec.extracted_data.source, 'ocr_extraction')

  reportResult(
    'Draft record strictly holds confirmation_status: unconfirmed and verification_status: pending',
    true
  )
} catch (err) {
  reportResult('Extracted draft state verification test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 10: Farmer Confirmation & Correction Workflow (PUT /:id/confirm)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 10] Farmer Confirmation & Correction Workflow')
try {
  assert.ok(recordAId, 'Record A must exist from Test 1')

  const confirmPayload = {
    survey_number: '786/A-CONFIRMED',
    land_area: 2.5,
    area_unit: 'acres',
    district: 'Gorakhpur',
    village: 'Pipraich',
    ownership_type: 'individual',
  }

  const res = await fetch(`http://localhost:${port}/api/land-records/${recordAId}/confirm`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(confirmPayload),
  })

  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.strictEqual(json.data.survey_number, '786/A-CONFIRMED')
  assert.strictEqual(json.data.land_area, 2.5)
  assert.strictEqual(json.data.extracted_data.confirmation_status, 'confirmed_by_farmer')
  assert.ok(json.data.extracted_data.confirmed_at)
  assert.strictEqual(json.data.extracted_data.confirmed_by, testUserA.id)
  assert.strictEqual(json.data.verification_status, 'pending')

  reportResult(
    'Farmer confirmation workflow successfully updates land attributes and transitions status to confirmed_by_farmer',
    true,
    `Survey: ${json.data.survey_number}, Area: ${json.data.land_area} acres, Status: confirmed_by_farmer`
  )
} catch (err) {
  reportResult('Farmer confirmation workflow test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 11: Secure Time-Limited Signed URL Retrieval (GET /:id/document)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 11] Secure Time-Limited Signed URL Retrieval')
try {
  assert.ok(recordAId, 'Record A must exist from Test 1')

  const res = await fetch(`http://localhost:${port}/api/land-records/${recordAId}/document`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })

  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.ok(json.data.signed_url)
  assert.strictEqual(json.data.expires_in, 900)
  // Ensure the signed URL includes security token parameters and is not a public URL
  assert.ok(json.data.signed_url.includes('token=') || json.data.signed_url.includes('signature='))

  // Test downloading through the signed URL
  const downloadRes = await fetch(json.data.signed_url)
  assert.strictEqual(downloadRes.status, 200)
  const arrayBuf = await downloadRes.arrayBuffer()
  assert.ok(arrayBuf.byteLength > 0)

  reportResult(
    'Secure 15-minute signed URL generated for private bucket and successfully verified download',
    true,
    `Expires in: ${json.data.expires_in}s, File: ${json.data.file_name}`
  )
} catch (err) {
  reportResult('Signed URL retrieval test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 12: Existing Land Record CRUD Regression Check
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 12] Existing Land Record CRUD Operations')
try {
  // GET /api/land-records
  const listRes = await fetch(`http://localhost:${port}/api/land-records`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(listRes.status, 200)
  const listJson = await listRes.json()
  assert.strictEqual(listJson.success, true)
  assert.ok(listJson.count >= 2) // We uploaded at least 2 records for Farmer A

  // GET /api/land-records/:id
  const singleRes = await fetch(`http://localhost:${port}/api/land-records/${recordAId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(singleRes.status, 200)
  const singleJson = await singleRes.json()
  assert.strictEqual(singleJson.success, true)
  assert.strictEqual(singleJson.data.id, recordAId)

  // POST /api/land-records (manual creation)
  const manualRes = await fetch(`http://localhost:${port}/api/land-records`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      survey_number: '123/MANUAL',
      land_area: 1.5,
      area_unit: 'acres',
      district: 'Gorakhpur',
      village: 'Pipraich',
    }),
  })
  assert.strictEqual(manualRes.status, 201)
  const manualJson = await manualRes.json()
  createdLandRecordIds.push(manualJson.data.id)

  // DELETE /api/land-records/:id (cleanup the manual one)
  const delRes = await fetch(`http://localhost:${port}/api/land-records/${manualJson.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(delRes.status, 200)

  reportResult('Existing land record CRUD operations (list, single, create, delete) function normally', true)
} catch (err) {
  reportResult('Existing land record CRUD test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 13: Existing Scheme Catalogue & Eligibility Regression Check
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 13] Existing Scheme Catalogue & Eligibility Integration')
try {
  // GET /api/schemes
  const schemesRes = await fetch(`http://localhost:${port}/api/schemes`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(schemesRes.status, 200)
  const schemesJson = await schemesRes.json()
  assert.strictEqual(schemesJson.success, true)
  assert.strictEqual(schemesJson.count, 5)

  // GET /api/eligibility/:schemeId (PM-KISAN)
  const pmKisanId = '9b46b004-8c63-4d94-9bc7-4e5f8e0c02e6'
  const evalRes = await fetch(`http://localhost:${port}/api/eligibility/${pmKisanId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(evalRes.status, 200)
  const evalJson = await evalRes.json()
  assert.strictEqual(evalJson.success, true)
  assert.ok(evalJson.data.result_status)

  reportResult(
    'Existing scheme catalogue and dynamic eligibility engine evaluate confirmed land records seamlessly',
    true,
    `PM-KISAN evaluation status: ${evalJson.data.result_status}`
  )
} catch (err) {
  reportResult('Existing scheme catalogue & eligibility test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Teardown & Resource Cleanup
// ─────────────────────────────────────────────────────────────
if (server) {
  server.close()
}

if (serviceClient) {
  try {
    // 1. Remove uploaded storage files from private bucket
    if (uploadedStoragePaths.length > 0) {
      try { await serviceClient.storage.from('land-records').remove(uploadedStoragePaths) } catch {}
    }

    // 2. Remove document records
    if (uploadedDocIds.length > 0) {
      try { await serviceClient.from('documents').delete().in('id', uploadedDocIds) } catch {}
    }

    // 3. Remove created land records
    if (createdLandRecordIds.length > 0) {
      try { await serviceClient.from('land_records').delete().in('id', createdLandRecordIds) } catch {}
    }

    // 4. Remove farmer data & profiles
    if (testUserA) {
      try { await serviceClient.from('eligibility_results').delete().eq('farmer_id', testUserA.id) } catch {}
      try { await serviceClient.from('farmer_profiles').delete().eq('id', testUserA.id) } catch {}
      try { await serviceClient.auth.admin.deleteUser(testUserA.id) } catch {}
    }

    if (testUserB) {
      try { await serviceClient.from('eligibility_results').delete().eq('farmer_id', testUserB.id) } catch {}
      try { await serviceClient.from('farmer_profiles').delete().eq('id', testUserB.id) } catch {}
      try { await serviceClient.auth.admin.deleteUser(testUserB.id) } catch {}
    }
  } catch (cleanupErr) {
    console.warn('Non-fatal cleanup warning:', cleanupErr.message)
  }
}

// ─────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`TEST SUITE RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

if (failedTests > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
