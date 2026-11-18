// ============================================================
// test-step7-eligibility.mjs
// Step 7 Phase 2 Comprehensive Test Suite: Eligibility Engine
// ============================================================
// Tests all 11 required scenarios:
//   1. Farmer clearly eligible (all automated & verified criteria pass)
//   2. Farmer clearly not eligible (definitive statutory disqualification)
//   3. Farmer missing required information -> needs_verification
//   4. Multiple land records aggregation
//   5. Invalid scheme ID (400 for malformed, 404 for non-existent)
//   6. Scheme with no eligibility rules (graceful fallback)
//   7. Unauthorized request (401 without token)
//   8. Attempt to access another farmer's data (RLS isolation)
//   9. Existing authentication verification
//   10. Existing farmer profile and land-record APIs
//   11. Existing scheme catalogue APIs
// ============================================================

import './src/config/env.js'
import assert from 'node:assert'
import { createClient } from '@supabase/supabase-js'
import { EligibilityEngine } from './src/services/eligibilityEngine.js'
import eligibilityService from './src/services/eligibilityService.js'
import { VERIFIED_RULES } from './src/data/verifiedRules.js'
import app from './src/app.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🧪 RUNNING STEP 7 PHASE 2 COMPREHENSIVE TEST SUITE')
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

const PM_KISAN_SCHEME = {
  id: '9b46b004-8c63-4d94-9bc7-4e5f8e0c02e6',
  name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
  state: 'Central / All India',
  is_active: true,
}

const PM_KISAN_RULE = VERIFIED_RULES.find(
  (r) => r.scheme_id === '9b46b004-8c63-4d94-9bc7-4e5f8e0c02e6'
)

// ─────────────────────────────────────────────────────────────
// Test 1: Farmer Clearly Eligible (Synthetic Data)
// ─────────────────────────────────────────────────────────────
console.log('[Test 1] Farmer Clearly Eligible (Synthetic Verified Profile)')
try {
  const eligibleProfile = {
    id: '11111111-1111-1111-1111-111111111111',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    village: 'Shivpur',
    full_name: 'Ram Kumar (Synthetic Demo)',
  }

  const eligibleLandRecords = [
    {
      id: '22222222-2222-2222-2222-222222222222',
      farmer_id: eligibleProfile.id,
      survey_number: '104/2',
      land_area: 2.5,
      area_unit: 'acres',
      verification_status: 'verified',
      extracted_data: {
        ownership_type: 'individual',
        land_type: 'agricultural_cultivable',
        land_mutation_date: '2018-06-15', // Pre 2019-02-01 cutoff
        statutory_exclusion_declared: true,
        aadhaar_verified_demo: true,
        land_document_available_demo: true,
        age: 42,
      },
    },
  ]

  const result = EligibilityEngine.evaluate({
    farmerProfile: eligibleProfile,
    landRecords: eligibleLandRecords,
    scheme: PM_KISAN_SCHEME,
    rule: PM_KISAN_RULE,
  })

  assert.strictEqual(result.result_status, 'eligible')
  assert.strictEqual(result.reasons.missing_information.length, 0)
  assert.ok(result.reasons.criteria_evaluated.every((c) => c.status === 'PASS'))

  reportResult(
    'Farmer clearly eligible: All criteria & verification checkpoints pass [Synthetic Data]',
    true,
    result.reasons.summary
  )
} catch (err) {
  reportResult('Farmer clearly eligible test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 2: Farmer Clearly Not Eligible (Synthetic Data)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 2] Farmer Clearly Not Eligible (Definitive Disqualifications)')
try {
  const baseProfile = {
    id: '11111111-1111-1111-1111-111111111111',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
  }

  // Subcase A: Tenant farmer (no land ownership)
  const tenantLandRecords = [
    {
      id: '33333333-3333-3333-3333-333333333333',
      land_area: 3.0,
      area_unit: 'acres',
      extracted_data: {
        ownership_type: 'tenant', // Disallowed
        land_type: 'agricultural_cultivable',
      },
    },
  ]
  const tenantResult = EligibilityEngine.evaluate({
    farmerProfile: baseProfile,
    landRecords: tenantLandRecords,
    scheme: PM_KISAN_SCHEME,
    rule: PM_KISAN_RULE,
  })
  assert.strictEqual(tenantResult.result_status, 'not_eligible')
  assert.ok(tenantResult.reasons.criteria_evaluated.some((c) => c.criterion === 'land_ownership_type' && c.status === 'FAIL'))

  // Subcase B: Landless farmer (0 parcels)
  const landlessResult = EligibilityEngine.evaluate({
    farmerProfile: baseProfile,
    landRecords: [],
    scheme: PM_KISAN_SCHEME,
    rule: PM_KISAN_RULE,
  })
  assert.strictEqual(landlessResult.result_status, 'not_eligible')
  assert.ok(landlessResult.reasons.criteria_evaluated.some((c) => c.criterion === 'land_ownership' && c.status === 'FAIL'))

  // Subcase C: Minor applicant (age 16)
  const minorRecords = [
    {
      land_area: 1.5,
      area_unit: 'acres',
      extracted_data: {
        ownership_type: 'individual',
        land_type: 'agricultural_cultivable',
        age: 16, // Under 18
      },
    },
  ]
  const minorResult = EligibilityEngine.evaluate({
    farmerProfile: baseProfile,
    landRecords: minorRecords,
    scheme: PM_KISAN_SCHEME,
    rule: PM_KISAN_RULE,
  })
  assert.strictEqual(minorResult.result_status, 'not_eligible')
  assert.ok(minorResult.reasons.criteria_evaluated.some((c) => c.criterion === 'applicant_age' && c.status === 'FAIL'))

  reportResult(
    'Farmer clearly not eligible: Tenant, Landless, and Minor disqualified [Synthetic Data]',
    true,
    'Confirmed all 3 statutory disqualifications return not_eligible'
  )
} catch (err) {
  reportResult('Farmer clearly not eligible test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 3: Farmer Missing Information -> needs_verification (Synthetic Data)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 3] Farmer Missing Information -> needs_verification')
try {
  const profile = {
    id: '11111111-1111-1111-1111-111111111111',
    state: 'Uttar Pradesh',
    district: 'Kanpur',
  }

  // Farmer has valid land ownership, but mutation cutoff & exclusion declaration are unconfirmed
  const unverifiedRecords = [
    {
      id: '44444444-4444-4444-4444-444444444444',
      land_area: 2.0,
      area_unit: 'acres',
      verification_status: 'pending',
      extracted_data: {
        ownership_type: 'individual',
        land_type: 'agricultural_cultivable',
        // Missing mutation date, missing exclusion declaration
        aadhaar_verified_demo: true,
      },
    },
  ]

  const result = EligibilityEngine.evaluate({
    farmerProfile: profile,
    landRecords: unverifiedRecords,
    scheme: PM_KISAN_SCHEME,
    rule: PM_KISAN_RULE,
  })

  assert.strictEqual(result.result_status, 'needs_verification')
  assert.ok(result.reasons.missing_information.includes('land_ownership_cutoff_verification'))
  assert.ok(result.reasons.missing_information.includes('statutory_exclusion_self_declaration'))

  reportResult(
    'Missing information triggers needs_verification with checkpoint list [Synthetic Data]',
    true,
    `Missing checkpoints: ${result.reasons.missing_information.join(', ')}`
  )
} catch (err) {
  reportResult('Missing information test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 4: Multiple Land Records Aggregation (Synthetic Data)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 4] Multiple Land Records Aggregation')
try {
  const profile = {
    id: '11111111-1111-1111-1111-111111111111',
    state: 'Uttar Pradesh',
    district: 'Ayodhya',
  }

  const multiParcels = [
    {
      id: '55555555-5555-5555-5555-555555555551',
      land_area: 1.25,
      area_unit: 'acres',
      extracted_data: {
        ownership_type: 'individual',
        land_type: 'agricultural_cultivable',
        land_mutation_date: '2017-03-10',
        statutory_exclusion_declared: true,
        aadhaar_verified_demo: true,
        land_document_available_demo: true,
      },
    },
    {
      id: '55555555-5555-5555-5555-555555555552',
      land_area: 1.75,
      area_unit: 'acres',
      extracted_data: {
        ownership_type: 'joint',
        land_type: 'agricultural_irrigated',
        land_mutation_date: '2016-11-20',
        statutory_exclusion_declared: true,
        aadhaar_verified_demo: true,
        land_document_available_demo: true,
      },
    },
  ]

  const result = EligibilityEngine.evaluate({
    farmerProfile: profile,
    landRecords: multiParcels,
    scheme: PM_KISAN_SCHEME,
    rule: PM_KISAN_RULE,
  })

  assert.strictEqual(result.result_status, 'eligible')
  const landCriterion = result.reasons.criteria_evaluated.find(
    (c) => c.criterion === 'cultivable_land_ownership'
  )
  assert.ok(landCriterion.reason.includes('3 acres across 2 registered parcel(s)'))

  reportResult(
    'Multiple land records aggregated successfully (1.25 + 1.75 = 3.0 acres) [Synthetic Data]',
    true,
    landCriterion.reason
  )
} catch (err) {
  reportResult('Multiple land records aggregation test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Live Supabase Authentication Setup for HTTP Integration Tests
// ─────────────────────────────────────────────────────────────
let server = null
let port = null
let serviceClient = null
let publicClient = null
let testUserA = null
let testUserB = null
let tokenA = null
let tokenB = null

try {
  serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  publicClient = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Ensure verified PM-KISAN rule is seeded
  await eligibilityService.seedVerifiedRules(serviceClient)

  // Create confirmed Test Farmer A
  const emailA = `farmer_eval_a_${Date.now()}@kisansarthi.internal`
  const passwordA = 'Pass!12345678'
  const { data: uA } = await serviceClient.auth.admin.createUser({
    email: emailA,
    password: passwordA,
    email_confirm: true,
  })
  testUserA = uA.user

  // Create confirmed Test Farmer B (for cross-tenant checks)
  const emailB = `farmer_eval_b_${Date.now()}@kisansarthi.internal`
  const passwordB = 'Pass!12345678'
  const { data: uB } = await serviceClient.auth.admin.createUser({
    email: emailB,
    password: passwordB,
    email_confirm: true,
  })
  testUserB = uB.user

  // Setup Farmer Profile A
  await serviceClient.from('farmer_profiles').upsert({
    id: testUserA.id,
    state: 'Uttar Pradesh',
    district: 'Gorakhpur',
    village: 'Pipraich',
    pincode: '273001',
  })

  // Setup Farmer Profile B
  await serviceClient.from('farmer_profiles').upsert({
    id: testUserB.id,
    state: 'Uttar Pradesh',
    district: 'Bareilly',
    village: 'Nawabganj',
    pincode: '243001',
  })

  // Setup a valid land record for Farmer A
  const { data: lrA, error: lrErr } = await serviceClient.from('land_records').insert({
    farmer_id: testUserA.id,
    survey_number: '786/A',
    land_area: 2.2,
    area_unit: 'acres',
    state: 'Uttar Pradesh',
    district: 'Gorakhpur',
    village: 'Pipraich',
    verification_status: 'pending',
    extracted_data: {
      ownership_type: 'individual',
      land_type: 'agricultural_cultivable',
      land_mutation_date: '2018-04-12',
      statutory_exclusion_declared: true,
      aadhaar_verified_demo: true,
      land_document_available_demo: true,
      age: 38,
    },
  }).select()

  if (lrErr) {
    console.error('Error inserting land record A in test setup:', lrErr)
  }

  // Sign in Farmer A
  const { data: signA } = await publicClient.auth.signInWithPassword({
    email: emailA,
    password: passwordA,
  })
  tokenA = signA.session.access_token

  // Sign in Farmer B
  const { data: signB } = await publicClient.auth.signInWithPassword({
    email: emailB,
    password: passwordB,
  })
  tokenB = signB.session.access_token

  // Start ephemeral Express app
  server = app.listen(0)
  port = server.address().port
} catch (setupErr) {
  console.error('Fatal test setup error:', setupErr.message)
}

// ─────────────────────────────────────────────────────────────
// Test 5: Invalid Scheme ID Handling (400 and 404)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 5] Invalid Scheme ID Handling')
try {
  // Subcase A: Malformed UUID
  const malformedRes = await fetch(`http://localhost:${port}/api/eligibility/invalid-uuid-format`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(malformedRes.status, 400)
  const malformedJson = await malformedRes.json()
  assert.strictEqual(malformedJson.success, false)

  // Subcase B: Non-existent scheme UUID
  const missingRes = await fetch(
    `http://localhost:${port}/api/eligibility/00000000-0000-0000-0000-000000000000`,
    {
      headers: { Authorization: `Bearer ${tokenA}` },
    }
  )
  assert.strictEqual(missingRes.status, 404)
  const missingJson = await missingRes.json()
  assert.strictEqual(missingJson.success, false)

  reportResult('Invalid scheme ID returns 400 for malformed UUID and 404 for non-existent UUID', true)
} catch (err) {
  reportResult('Invalid scheme ID handling test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 6: Scheme with No Eligibility Rules (Graceful Fallback)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 6] Scheme with No Eligibility Rules')
try {
  // PMFBY is in DB but has no eligibility_rules row seeded yet
  const pmfbyId = '566cc552-121e-4fe9-876f-414abcfb452d'
  const res = await fetch(`http://localhost:${port}/api/eligibility/${pmfbyId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(res.status, 200)
  const json = await res.json()
  assert.strictEqual(json.success, true)
  assert.strictEqual(json.data.result_status, 'needs_verification')
  assert.ok(json.data.reasons.summary.includes('No automated eligibility rules have been configured'))

  reportResult(
    'Scheme without rules returns needs_verification with human-readable reason',
    true,
    json.data.reasons.summary
  )
} catch (err) {
  reportResult('Scheme with no eligibility rules test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 7: Unauthorized Request (401 Missing/Invalid Token)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 7] Unauthorized Request Handling')
try {
  const pmKisanId = '9b46b004-8c63-4d94-9bc7-4e5f8e0c02e6'
  const noTokenRes = await fetch(`http://localhost:${port}/api/eligibility/${pmKisanId}`)
  assert.strictEqual(noTokenRes.status, 401)
  const noTokenJson = await noTokenRes.json()
  assert.strictEqual(noTokenJson.success, false)

  const badTokenRes = await fetch(`http://localhost:${port}/api/eligibility/${pmKisanId}`, {
    headers: { Authorization: 'Bearer invalid.bogus.jwt' },
  })
  assert.strictEqual(badTokenRes.status, 401)

  reportResult('Unauthorized requests correctly rejected with HTTP 401', true)
} catch (err) {
  reportResult('Unauthorized request handling test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 8: Cross-Tenant Protection (Cannot Access Another Farmer)
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 8] Cross-Tenant Isolation & RLS Protection')
try {
  const pmKisanId = '9b46b004-8c63-4d94-9bc7-4e5f8e0c02e6'

  // Farmer A evaluates PM-KISAN
  const evalResA = await fetch(`http://localhost:${port}/api/eligibility/${pmKisanId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(evalResA.status, 200)
  const evalJsonA = await evalResA.json()
  assert.strictEqual(evalJsonA.data.result_status, 'eligible')

  // Farmer B attempts to query Farmer A's result from eligibility_results
  const clientB = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${tokenB}` } },
  })

  const { data: rowsFoundForA, error: rlsError } = await clientB
    .from('eligibility_results')
    .select('*')
    .eq('farmer_id', testUserA.id)

  // Supabase RLS must return 0 rows for another farmer
  assert.strictEqual(rowsFoundForA.length, 0)

  // Farmer B evaluates PM-KISAN (Farmer B has 0 land records, must be not_eligible)
  const evalResB = await fetch(`http://localhost:${port}/api/eligibility/${pmKisanId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert.strictEqual(evalResB.status, 200)
  const evalJsonB = await evalResB.json()
  assert.strictEqual(evalJsonB.data.result_status, 'not_eligible')

  reportResult(
    'Cross-tenant isolation enforced: Farmer B receives 0 rows of Farmer A data; evaluations isolated',
    true,
    'RLS prevents cross-farmer inspection'
  )
} catch (err) {
  reportResult('Cross-tenant protection test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 9: Existing Authentication Verification
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 9] Existing Authentication Verification')
try {
  const testRes = await fetch(`http://localhost:${port}/api/protected-test`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(testRes.status, 200)
  const testJson = await testRes.json()
  assert.strictEqual(testJson.success, true)
  assert.strictEqual(testJson.user.id, testUserA.id)

  reportResult('Existing authentication route /api/protected-test remains 100% operational', true)
} catch (err) {
  reportResult('Existing authentication verification test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 10: Existing Farmer Profile & Land Record APIs Verification
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 10] Existing Profile and Land Record APIs')
try {
  // Test GET /api/farmer/profile
  const profileRes = await fetch(`http://localhost:${port}/api/farmer/profile`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(profileRes.status, 200)
  const profileJson = await profileRes.json()
  assert.strictEqual(profileJson.success, true)
  assert.strictEqual(profileJson.data.farmer_profile.district, 'Gorakhpur')

  // Test GET /api/land-records
  const landRes = await fetch(`http://localhost:${port}/api/land-records`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(landRes.status, 200)
  const landJson = await landRes.json()
  assert.strictEqual(landJson.success, true)
  assert.strictEqual(landJson.count, 1)

  reportResult('Existing profile & land-record APIs operate normally without regressions', true)
} catch (err) {
  reportResult('Existing profile & land-record APIs test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Test 11: Existing Scheme Catalogue APIs Verification
// ─────────────────────────────────────────────────────────────
console.log('\n[Test 11] Existing Scheme Catalogue APIs')
try {
  const schemesRes = await fetch(`http://localhost:${port}/api/schemes`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.strictEqual(schemesRes.status, 200)
  const schemesJson = await schemesRes.json()
  assert.strictEqual(schemesJson.success, true)
  assert.strictEqual(schemesJson.count, 5)

  reportResult('Existing scheme catalogue GET /api/schemes retrieves all 5 verified database records', true)
} catch (err) {
  reportResult('Existing scheme catalogue APIs test', false, err.message)
}

// ─────────────────────────────────────────────────────────────
// Cleanup & Teardown
// ─────────────────────────────────────────────────────────────
if (server) {
  server.close()
}

if (serviceClient && testUserA && testUserB) {
  try {
    // Delete test land records and profiles
    await serviceClient.from('land_records').delete().eq('farmer_id', testUserA.id)
    await serviceClient.from('eligibility_results').delete().eq('farmer_id', testUserA.id)
    await serviceClient.from('eligibility_results').delete().eq('farmer_id', testUserB.id)
    await serviceClient.from('farmer_profiles').delete().eq('id', testUserA.id)
    await serviceClient.from('farmer_profiles').delete().eq('id', testUserB.id)
    await serviceClient.auth.admin.deleteUser(testUserA.id)
    await serviceClient.auth.admin.deleteUser(testUserB.id)
  } catch {
    // Ignore cleanup error
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
