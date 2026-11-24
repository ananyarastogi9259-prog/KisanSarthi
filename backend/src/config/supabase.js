// ============================================================
// src/config/supabase.js
// Supabase Client Configuration
// ============================================================
// This file creates one shared Supabase client for the backend.
//
// CREDENTIALS & SECURITY:
//   - SUPABASE_URL: The base URL of your Supabase project.
//   - SUPABASE_PUBLISHABLE_KEY: The public/publishable key used for
//     general client requests and identity verification.
//   - SUPABASE_SERVICE_ROLE_KEY: A sensitive administrative secret that
//     bypasses Row Level Security (RLS). Kept in .env for backend-only
//     administrative operations and must NEVER be exposed to the frontend.
//
//   ⚠️  NEVER send SUPABASE_SERVICE_ROLE_KEY to the frontend.
//   ⚠️  NEVER commit .env to GitHub.
//
// HOW IT WORKS:
//   Unlike Mongoose (which opens a persistent TCP connection),
//   the Supabase client does not "connect" at startup.
//   It prepares an HTTP/API client. When queries or auth calls are made,
//   it issues HTTPS requests to your Supabase project URL.
// ============================================================

import './env.js'
import { createClient } from '@supabase/supabase-js'

// Read Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY

// Check configuration
const urlIsValid =
  supabaseUrl &&
  supabaseUrl.startsWith('https://')

const keyIsValid =
  supabasePublishableKey &&
  supabasePublishableKey.trim().length > 0

let supabase = null

if (urlIsValid && keyIsValid) {
  try {
    supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    console.log('✅ Supabase client initialized successfully.')
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error.message)
  }
} else {
  console.warn(
    '⚠️ Supabase configuration missing. Check SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env'
  )
}

/**
 * Creates a scoped Supabase client authenticated under the caller's JWT.
 * When queries run with this client, PostgREST evaluates PostgreSQL
 * Row Level Security (RLS) policies as that specific authenticated user.
 *
 * @param {string} token - Supabase JWT access token
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export const getAuthenticatedClient = (token) => {
  if (!urlIsValid || !keyIsValid) {
    throw new Error('Supabase client is not configured.')
  }

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

export const isServiceRoleConfigured = () => {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPAYBASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  return Boolean(urlIsValid && serviceKey && serviceKey.trim().length > 0)
}

/**
 * Creates an administrative Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * Bypasses RLS for secure administrative tasks (e.g. auto-confirming farmer accounts).
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export const getServiceClient = () => {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPAYBASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  if (!urlIsValid || !serviceKey) {
    console.warn('Supabase service role client is not configured; administrative features will use fallback.')
    return null
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export default supabase
