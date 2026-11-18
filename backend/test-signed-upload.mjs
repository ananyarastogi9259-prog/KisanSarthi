// ============================================================
// test-signed-upload.mjs
// Test Suite for Direct Signed Storage Upload & Processing
// ============================================================

import './src/config/env.js'
import assert from 'node:assert'
import { createClient } from '@supabase/supabase-js'
import app from './src/app.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Testing direct signed storage upload flow...')

const server = app.listen(0)
const port = server.address().port

try {
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const publicClient = createClient(SUPABASE_URL, SUPABASE_KEY)

  // 1. Create test user
  const email = `farmer_upload_test_${Date.now()}@kisansarthi.internal`
  const password = 'Pass!12345678'
  const { data: u } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  const user = u.user

  // 2. Provision profile
  await serviceClient.from('farmer_profiles').upsert({
    id: user.id,
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    village: 'Shivpur',
  })

  // 3. Sign in
  const { data: sign } = await publicClient.auth.signInWithPassword({
    email,
    password,
  })
  const token = sign.session.access_token

  // 4. Request signed upload URL
  const urlRes = await fetch(`http://localhost:${port}/api/land-records/signed-upload-url`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_name: 'khatauni_test.jpg',
      mime_type: 'image/jpeg',
      file_size: 1024,
    }),
  })

  assert.strictEqual(urlRes.status, 200)
  const urlJson = await urlRes.json()
  assert.strictEqual(urlJson.success, true)
  assert.ok(urlJson.data.signed_upload_url)
  assert.ok(urlJson.data.storage_path)
  assert.ok(urlJson.data.storage_path.startsWith(`${user.id}/`))
  console.log('✅ PASS: Signed upload URL created with farmer isolation prefix')

  // 5. Upload a mock JPEG directly to the signed URL
  const dummyJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0xff, 0xd9,
  ])

  // Upload to Supabase Storage using the signed URL
  const uploadRes = await fetch(urlJson.data.signed_upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/jpeg',
    },
    body: dummyJpeg,
  })
  assert.ok(uploadRes.status === 200 || uploadRes.status === 201)
  console.log('✅ PASS: Direct upload to private Supabase Storage succeeded (HTTP ' + uploadRes.status + ')')

  // 6. Request backend to process the uploaded storage document
  const processRes = await fetch(`http://localhost:${port}/api/land-records/process-uploaded-storage`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      storage_path: urlJson.data.storage_path,
      file_name: 'khatauni_test.jpg',
      document_type: 'khatauni',
    }),
  })

  assert.strictEqual(processRes.status, 201)
  const processJson = await processRes.json()
  assert.strictEqual(processJson.success, true)
  assert.ok(processJson.data.land_record_id)
  assert.strictEqual(processJson.data.confirmation_status, 'unconfirmed')
  assert.strictEqual(processJson.data.status, 'draft')
  console.log('✅ PASS: Backend processed storage document & created draft land record (HTTP 201)')

  // 7. Test cross-tenant attack: Request processing for another farmer's path
  const crossRes = await fetch(`http://localhost:${port}/api/land-records/process-uploaded-storage`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      storage_path: `00000000-0000-0000-0000-000000000000/stolen-doc.jpg`,
    }),
  })
  assert.strictEqual(crossRes.status, 403)
  console.log('✅ PASS: Cross-tenant storage path manipulation rejected (HTTP 403)')

  // Cleanup
  await serviceClient.from('land_records').delete().eq('id', processJson.data.land_record_id)
  await serviceClient.from('documents').delete().eq('storage_path', urlJson.data.storage_path)
  await serviceClient.storage.from('land-records').remove([urlJson.data.storage_path])
  await serviceClient.auth.admin.deleteUser(user.id)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('ALL SIGNED STORAGE UPLOAD TESTS PASSED (4/4)!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
} catch (err) {
  console.error('❌ FAILED:', err.message)
  process.exit(1)
} finally {
  server.close()
  process.exit(0)
}
