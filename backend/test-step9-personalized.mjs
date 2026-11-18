// ============================================================
// test-step9-personalized.mjs
// Step 9 Phase 2 Comprehensive Test Suite
// Personalized Scheme Results, Document Checklist & Application Tracking
// ============================================================
// Tests all 16 required scenarios:
//   1. Existing health endpoint (GET /api/health)
//   2. Existing auth middleware (GET /api/protected-test)
//   3. Existing farmer profile APIs (GET /api/farmer/profile)
//   4. Existing land record APIs (GET /api/land-records)
//   5. Existing scheme catalogue APIs (GET /api/schemes)
//   6. Existing eligibility APIs (GET /api/eligibility/:schemeId)
//   7. Personalized scheme results (GET /api/personalized-schemes)
//   8. Personalized scheme detail (GET /api/personalized-schemes/:schemeId)
//   9. Document checklist reconciliation (required, available, missing)
//   10. Application creation for eligible scheme (POST /api/applications)
//   11. Application listing (GET /api/applications)
//   12. Application detail view (GET /api/applications/:id)
//   13. Unauthorized access rejected (HTTP 401 across endpoints)
//   14. Cross-farmer access protection (RLS tenant isolation)
//   15. Invalid ID handling (400 malformed, 404 non-existent)
//   16. Business rule rejections (not_eligible, needs_verification, duplicate 409)
// ============================================================

import './src/config/env.js'
import assert from 'node:assert'
import { createClient } from '@supabase/supabase-js'
import app from './src/app.js'
import eligibilityService from './src/services/eligibilityService.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🧪 RUNNING STEP 9 PHASE 2 COMPREHENSIVE TEST SUITE')
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

// ── Test Context Variables ───────────────────────────────────
let server = null
let port = null
let serviceClient = null
let publicClient = null

// Start ephemeral Express server immediately so port is always initialized
server = app.listen(0)
port = server.address().port

let farmerA = null // Eligible farmer
let tokenA = null

let farmerB = null // Needs verification farmer
let tokenB = null

let farmerC = null // Ineligible farmer (tenant)
let tokenC = null

const PM_KISAN_ID = '9b46b004-8c63-4d94-9bc7-4e5f8e0c02e6'

// Resource tracking for teardown
const createdAppIds = []
const createdDocIds = []
const createdLandRecordIds = []

try {
  serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  publicClient = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Ensure verified PM-KISAN rule is seeded
  await eligibilityService.seedVerifiedRules(serviceClient)

  // 1. Create Farmer A (Eligible Profile)
  const emailA = `farmer_step9_a_${Date.now()}@kisansarthi.internal`
  const pwd = 'TestPass!12345678'
  const { data: uA } = await serviceClient.auth.admin.createUser({
    email: emailA,
    password: pwd,
    email_confirm: true,
  })
  farmerA = uA.user

  await serviceClient.from('farmer_profiles').upsert({
    id: farmerA.id,
    state: 'Uttar Pradesh',
    district: 'Gorakhpur',
    village: 'Pipraich',
    pincode: '273001',
  })

  // Insert verified & confirmed cultivable land for Farmer A
  const { data: lrA } = await serviceClient
    .from('land_records')
    .insert({
      farmer_id: farmerA.id,
      survey_number: '104/A-CONFIRMED',
      land_area: 2.5,
      area_unit: 'acres',
      state: 'Uttar Pradesh',
      district: 'Gorakhpur',
      village: 'Pipraich',
      verification_status: 'pending',
      extracted_data: {
        ownership_type: 'individual',
        land_type: 'agricultural_cultivable',
        land_mutation_date: '2018-05-10', // Pre-cutoff (01-02-2019)
        statutory_exclusion_declared: true,
        aadhaar_verified_demo: true,
        land_document_available_demo: true,
        confirmation_status: 'confirmed_by_farmer',
      },
    })
    .select('id')
    .single()

  createdLandRecordIds.push(lrA.id)

  // Upload an attached document for Farmer A (Khatauni extract)
  const { data: docA } = await serviceClient
    .from('documents')
    .insert({
      farmer_id: farmerA.id,
      land_record_id: lrA.id,
      document_type: 'khatauni',
      file_name: 'khatauni_extract.pdf',
      storage_path: `${farmerA.id}/khatauni_extract.pdf`,
    })
    .select('id')
    .single()

  createdDocIds.push(docA.id)

  // Sign in Farmer A
  const { data: sA } = await publicClient.auth.signInWithPassword({ email: emailA, password: pwd })
  tokenA = sA.session.access_token

  // Evaluate Farmer A for PM-KISAN to establish 'eligible' result in eligibility_results
  const aClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${tokenA}` } },
  })
  await eligibilityService.evaluateSchemeForFarmer(aClient, farmerA.id, PM_KISAN_ID)

  // 2. Create Farmer B (Needs Verification Profile)
  const emailB = `farmer_step9_b_${Date.now()}@kisansarthi.internal`
  const { data: uB } = await serviceClient.auth.admin.createUser({
    email: emailB,
    password: pwd,
    email_confirm: true,
  })
  farmerB = uB.user

  await serviceClient.from('farmer_profiles').upsert({
    id: farmerB.id,
    state: 'Uttar Pradesh',
    district: 'Bareilly',
    village: 'Nawabganj',
    pincode: '243001',
  })

  // Land record missing mutation date and exclusion declaration
  const { data: lrB } = await serviceClient
    .from('land_records')
    .insert({
      farmer_id: farmerB.id,
      survey_number: '202/B',
      land_area: 1.5,
      area_unit: 'acres',
      state: 'Uttar Pradesh',
      district: 'Bareilly',
      village: 'Nawabganj',
      verification_status: 'pending',
      extracted_data: {
        ownership_type: 'individual',
        land_type: 'agricultural_cultivable',
        confirmation_status: 'confirmed_by_farmer',
        // missing mutation date, missing statutory declaration
      },
    })
    .select('id')
    .single()

  createdLandRecordIds.push(lrB.id)

  // Sign in Farmer B
  const { data: sB } = await publicClient.auth.signInWithPassword({ email: emailB, password: pwd })
  tokenB = sB.session.access_token

  // Evaluate Farmer B for PM-KISAN -> 'needs_verification'
  const bClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${tokenB}` } },
  })
  await eligibilityService.evaluateSchemeForFarmer(bClient, farmerB.id, PM_KISAN_ID)

  // 3. Create Farmer C (Ineligible / Disqualified Profile)
  const emailC = `farmer_step9_c_${Date.now()}@kisansarthi.internal`
  const { data: uC } = await serviceClient.auth.admin.createUser({
    email: emailC,
    password: pwd,
    email_confirm: true,
  })
  farmerC = uC.user

  await serviceClient.from('farmer_profiles').upsert({
    id: farmerC.id,
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    village: 'Shivpur',
  })

  // Disqualified: Tenant / Sharecropper
  const { data: lrC } = await serviceClient
    .from('land_records')
    .insert({
      farmer_id: farmerC.id,
      survey_number: '303/TENANT',
      land_area: 2.0,
      area_unit: 'acres',
      state: 'Uttar Pradesh',
      district: 'Varanasi',
      village: 'Shivpur',
      verification_status: 'pending',
      extracted_data: {
        ownership_type: 'tenant', // Statutory exclusion
        land_type: 'agricultural_cultivable',
        confirmation_status: 'confirmed_by_farmer',
      },
    })
    .select('id')
    .single()

  createdLandRecordIds.push(lrC.id)

  // Sign in Farmer C
  const { data: sC } = await publicClient.auth.signInWithPassword({ email: emailC, password: pwd })
  tokenC = sC.session.access_token

  // Evaluate Farmer C for PM-KISAN -> 'not_eligible'
  const cClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${tokenC}` } },
  })
  await eligibilityService.evaluateSchemeForFarmer(cClient, farmerC.id, PM_KISAN_ID)

  // 4. Ephemeral Express server is already listening on port
} catch (setupErr) {
  console.error('Fatal test setup error:', setupErr.message)
}

// ─────────────────────────────────────────────────────────────
// Test 1: Existing Health Check API (Regression)
// ─────────────────────────────────────────────────────────────
console.log('[Test 1] Existing Health Endpoint Verification')
try {
  const res = await fetch(`http://localhost:${port}/api/health`)
  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.strictEqual(json.message, 'KisanSarthi API is running')
  reportResult('Existing health endpoint /api/health responds with HTTP 200', true)
} catch (err) {
  reportResult('Health endpoint regression test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 2: Existing Auth Middleware Verification (Regression)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 2] Existing Auth Middleware Verification')
try {
  // With valid token
  const validRes = await fetch(`http://localhost:${port}/api/protected-test`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(validRes.status, 200)

  // Without token
  const anonRes = await fetch(`http://localhost:${port}/api/protected-test`)
  assert.strictEqual(anonRes.status, 401)

  reportResult('Existing auth middleware validates JWT and rejects unauthenticated requests', true)
} catch (err) {
  reportResult('Auth middleware regression test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 3: Existing Farmer Profile APIs (Regression)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 3] Existing Farmer Profile APIs')
try {
  const res = await fetch(`http://localhost:${port}/api/farmer/profile`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.strictEqual(json.data.farmer_profile.district, 'Gorakhpur')
  reportResult('Existing farmer profile API /api/farmer/profile retrieves profile accurately', true)
} catch (err) {
  reportResult('Farmer profile API regression test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 4: Existing Land Record APIs (Regression)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 4] Existing Land Record APIs')
try {
  const res = await fetch(`http://localhost:${port}/api/land-records`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.ok(json.count >= 1)
  reportResult('Existing land record API /api/land-records operates normally', true)
} catch (err) {
  reportResult('Land records API regression test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 5: Existing Scheme Catalogue APIs (Regression)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 5] Existing Scheme Catalogue APIs')
try {
  const res = await fetch(`http://localhost:${port}/api/schemes`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.strictEqual(json.count, 5)
  reportResult('Existing scheme catalogue GET /api/schemes retrieves all 5 verified database schemes', true)
} catch (err) {
  reportResult('Scheme catalogue API regression test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 6: Existing Eligibility Evaluation API (Regression)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 6] Existing Eligibility API')
try {
  const res = await fetch(`http://localhost:${port}/api/eligibility/${PM_KISAN_ID}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.strictEqual(json.data.result_status, 'eligible')
  reportResult('Existing eligibility endpoint GET /api/eligibility/:id evaluates eligibility accurately', true)
} catch (err) {
  reportResult('Eligibility API regression test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 7: Personalized Scheme Results (GET /api/personalized-schemes)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 7] Personalized Scheme Results (GET /api/personalized-schemes)')
try {
  const res = await fetch(`http://localhost:${port}/api/personalized-schemes`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.strictEqual(json.count, 5)

  // Find PM-KISAN in results
  const pmKisanResult = json.data.find((s) => s.scheme_id === PM_KISAN_ID)
  assert.ok(pmKisanResult, 'PM-KISAN must be present')
  assert.strictEqual(pmKisanResult.eligibility_status, 'eligible')
  assert.ok(pmKisanResult.benefits)
  assert.ok(pmKisanResult.official_source_url)

  // Unevaluated schemes should be marked 'not_evaluated' safely
  const otherSchemes = json.data.filter((s) => s.scheme_id !== PM_KISAN_ID)
  const unevaluated = otherSchemes.find((s) => s.eligibility_status === 'not_evaluated')
  assert.ok(unevaluated, 'Unevaluated schemes must safely report not_evaluated')

  reportResult(
    'GET /api/personalized-schemes returns all schemes with personalized status for farmer',
    true,
    `PM-KISAN Status: ${pmKisanResult.eligibility_status}, Unevaluated handled safely: ${unevaluated.scheme_name}`
  )
} catch (err) {
  reportResult('Personalized scheme results test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 8: Personalized Scheme Detail (GET /api/personalized-schemes/:schemeId)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 8] Personalized Scheme Detail (GET /api/personalized-schemes/:schemeId)')
try {
  const res = await fetch(`http://localhost:${port}/api/personalized-schemes/${PM_KISAN_ID}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)

  assert.strictEqual(json.data.scheme.id, PM_KISAN_ID)
  assert.strictEqual(json.data.eligibility.status, 'eligible')
  assert.strictEqual(json.data.can_apply, true)
  assert.ok(json.data.checklist)
  assert.ok(json.data.checklist_summary)

  reportResult(
    'GET /api/personalized-schemes/:id returns complete detail breakdown with can_apply: true for eligible farmer',
    true
  )
} catch (err) {
  reportResult('Personalized scheme detail test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 9: Document Checklist Reconciliation
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 9] Document Checklist Reconciliation')
try {
  const res = await fetch(`http://localhost:${port}/api/personalized-schemes/${PM_KISAN_ID}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(res.status, 200)
  const json = await res.json()
  const checklist = json.data.checklist

  // Check required documents
  assert.strictEqual(checklist.required_documents.length, 4)

  // Farmer A uploaded a khatauni document -> matches land_record
  const hasMatchedLandRecord = checklist.available_documents.some((d) => d.doc_type === 'land_record')
  assert.ok(hasMatchedLandRecord, 'Khatauni upload must match land_record requirement')

  // Aadhaar, Bank Passbook, Self-Declaration are missing for Farmer A
  const missingSlugs = checklist.missing_documents.map((d) => d.doc_type)
  assert.ok(missingSlugs.includes('aadhaar'))
  assert.ok(missingSlugs.includes('bank_passbook'))
  assert.ok(missingSlugs.includes('statutory_self_declaration'))

  reportResult(
    'Document checklist reconciles uploaded documents against statutory requirements accurately',
    true,
    `Available: ${checklist.available_documents.length}, Missing: ${checklist.missing_documents.length}`
  )
} catch (err) {
  reportResult('Document checklist reconciliation test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 10: Application Creation for Eligible Scheme (POST /api/applications)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 10] Application Creation for Eligible Scheme')
let createdAppAId = null
try {
  const res = await fetch(`http://localhost:${port}/api/applications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scheme_id: PM_KISAN_ID,
      document_ids: [createdDocIds[0]], // Link Farmer A's uploaded Khatauni document
    }),
  })

  assert.strictEqual(res.status, 201)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.strictEqual(json.data.status, 'draft')
  assert.strictEqual(json.data.scheme_id, PM_KISAN_ID)
  assert.strictEqual(json.data.farmer_id, farmerA.id)
  assert.ok(json.data.id)
  assert.ok(json.data.timeline)

  createdAppAId = json.data.id
  createdAppIds.push(createdAppAId)

  // Verify document was linked in `documents` table
  const { data: linkedDoc } = await serviceClient
    .from('documents')
    .select('application_id')
    .eq('id', createdDocIds[0])
    .single()

  assert.strictEqual(linkedDoc.application_id, createdAppAId)

  reportResult(
    'POST /api/applications successfully creates application draft and links attached documents (HTTP 201)',
    true,
    `Application ID: ${createdAppAId}, Status: draft`
  )
} catch (err) {
  reportResult('Application creation test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 11: Application Listing (GET /api/applications)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 11] Application Listing (GET /api/applications)')
try {
  const res = await fetch(`http://localhost:${port}/api/applications`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.ok(json.count >= 1)

  const appItem = json.data.find((a) => a.id === createdAppAId)
  assert.ok(appItem)
  assert.strictEqual(appItem.scheme_name, 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)')
  assert.strictEqual(appItem.status, 'draft')
  assert.strictEqual(appItem.attached_documents_count, 1)

  reportResult(
    'GET /api/applications retrieves farmer applications with joined scheme metadata and document count',
    true
  )
} catch (err) {
  reportResult('Application listing test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 12: Application Detail View (GET /api/applications/:id)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 12] Application Detail View (GET /api/applications/:id)')
try {
  assert.ok(createdAppAId)
  const res = await fetch(`http://localhost:${port}/api/applications/${createdAppAId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.strictEqual(json.data.id, createdAppAId)
  assert.strictEqual(json.data.status, 'draft')
  assert.strictEqual(json.data.attached_documents.length, 1)
  assert.ok(json.data.timeline.length >= 4)

  reportResult(
    'GET /api/applications/:id retrieves complete application record with attached documents & timeline',
    true
  )
} catch (err) {
  reportResult('Application detail view test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 13: Unauthorized Access Rejected (HTTP 401)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 13] Unauthorized Access Rejection (HTTP 401)')
try {
  const endpoints = [
    { method: 'GET', url: `http://localhost:${port}/api/personalized-schemes` },
    { method: 'GET', url: `http://localhost:${port}/api/personalized-schemes/${PM_KISAN_ID}` },
    { method: 'GET', url: `http://localhost:${port}/api/applications` },
    { method: 'POST', url: `http://localhost:${port}/api/applications`, body: JSON.stringify({ scheme_id: PM_KISAN_ID }) },
  ]

  for (const ep of endpoints) {
    const res = await fetch(ep.url, {
      method: ep.method,
      headers: ep.body ? { 'Content-Type': 'application/json' } : {},
      body: ep.body,
    })
    assert.strictEqual(res.status, 401)
  }

  reportResult('All endpoints reject unauthenticated requests with HTTP 401', true)
} catch (err) {
  reportResult('Unauthorized access test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 14: Cross-Farmer Access Protection (RLS Tenant Isolation)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 14] Cross-Farmer Access Protection (RLS)')
try {
  assert.ok(createdAppAId)

  // Farmer B attempts to access Farmer A's application by ID
  const viewRes = await fetch(`http://localhost:${port}/api/applications/${createdAppAId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert.strictEqual(viewRes.status, 404)
  const viewJson = await viewRes.json()
  assert.strictEqual(viewJson.success, false)

  // Farmer B lists applications -> receives 0 (cannot see Farmer A's applications)
  const listRes = await fetch(`http://localhost:${port}/api/applications`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert.strictEqual(listRes.status, 200)
  const listJson = await listRes.json()
  assert.strictEqual(listJson.count, 0)

  // Farmer B attempts to submit Farmer A's application
  const submitRes = await fetch(`http://localhost:${port}/api/applications/${createdAppAId}/submit`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert.strictEqual(submitRes.status, 404)

  reportResult('Cross-farmer isolation enforced: Farmer B cannot view, list, or submit Farmer A applications', true)
} catch (err) {
  reportResult('Cross-farmer protection test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 15: Invalid ID Handling (400 and 404)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 15] Invalid ID Handling')
try {
  // Malformed scheme UUID
  const badSchemeRes = await fetch(`http://localhost:${port}/api/personalized-schemes/not-a-uuid`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(badSchemeRes.status, 400)

  // Non-existent scheme UUID
  const missingSchemeRes = await fetch(
    `http://localhost:${port}/api/personalized-schemes/00000000-0000-0000-0000-000000000000`,
    {
      headers: { Authorization: `Bearer ${tokenA}` },
    }
  )
  assert.strictEqual(missingSchemeRes.status, 404)

  // Malformed application UUID
  const badAppRes = await fetch(`http://localhost:${port}/api/applications/invalid-app-uuid`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(badAppRes.status, 400)

  // Non-existent application UUID
  const missingAppRes = await fetch(
    `http://localhost:${port}/api/applications/00000000-0000-0000-0000-000000000000`,
    {
      headers: { Authorization: `Bearer ${tokenA}` },
    }
  )
  assert.strictEqual(missingAppRes.status, 404)

  reportResult('Input validation correctly returns 400 for malformed UUIDs and 404 for non-existent entities', true)
} catch (err) {
  reportResult('Invalid ID handling test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 16: Business Rule Rejections (not_eligible, needs_verification, duplicate 409)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 16] Business Rule Rejections')
try {
  // Subcase A: Farmer C (Not Eligible / Tenant) attempts to create application
  const notEligibleRes = await fetch(`http://localhost:${port}/api/applications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenC}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scheme_id: PM_KISAN_ID }),
  })
  assert.strictEqual(notEligibleRes.status, 400)
  const notEligibleJson = await notEligibleRes.json()
  assert.strictEqual(notEligibleJson.success, false)
  assert.ok(notEligibleJson.message.includes('not meet the statutory eligibility requirements'))

  // Subcase B: Farmer B (Needs Verification) attempts to create application
  const needsVerifRes = await fetch(`http://localhost:${port}/api/applications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scheme_id: PM_KISAN_ID }),
  })
  assert.strictEqual(needsVerifRes.status, 400)
  const needsVerifJson = await needsVerifRes.json()
  assert.strictEqual(needsVerifJson.success, false)
  assert.ok(needsVerifJson.message.includes('requires completing verification checkpoints'))

  // Subcase C: Farmer A attempts to create duplicate application for PM-KISAN
  // (Farmer A already has createdAppAId in draft status)
  const dupRes = await fetch(`http://localhost:${port}/api/applications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scheme_id: PM_KISAN_ID }),
  })
  assert.strictEqual(dupRes.status, 409)
  const dupJson = await dupRes.json()
  assert.strictEqual(dupJson.success, false)
  assert.ok(dupJson.message.includes('An active application'))

  // Subcase D: Application submission by Farmer A
  const submitRes = await fetch(`http://localhost:${port}/api/applications/${createdAppAId}/submit`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(submitRes.status, 200)
  const submitJson = await submitRes.json()
  assert.strictEqual(submitJson.success, true)
  assert.strictEqual(submitJson.data.status, 'submitted')
  assert.ok(submitJson.data.submitted_at)

  reportResult(
    'Business rules strictly enforced: Ineligible & incomplete applications rejected, duplicates blocked (409)',
    true,
    'not_eligible rejected (400), needs_verification rejected (400), duplicate rejected (409), submission verified (200)'
  )
} catch (err) {
  reportResult('Business rule rejections test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Teardown & Resource Cleanup
// ─────────────────────────────────────────────────────────────
if (server) {
  server.close()
}

if (serviceClient) {
  try {
    // 1. Delete created applications
    if (createdAppIds.length > 0) {
      await serviceClient.from('applications').delete().in('id', createdAppIds)
    }

    // 2. Delete created documents
    if (createdDocIds.length > 0) {
      await serviceClient.from('documents').delete().in('id', createdDocIds)
    }

    // 3. Delete created land records
    if (createdLandRecordIds.length > 0) {
      await serviceClient.from('land_records').delete().in('id', createdLandRecordIds)
    }

    // 4. Delete eligibility results & farmer profiles for test users
    const testUserIds = [farmerA?.id, farmerB?.id, farmerC?.id].filter(Boolean)
    for (const uid of testUserIds) {
      await serviceClient.from('eligibility_results').delete().eq('farmer_id', uid)
      await serviceClient.from('farmer_profiles').delete().eq('id', uid)
      await serviceClient.auth.admin.deleteUser(uid)
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
