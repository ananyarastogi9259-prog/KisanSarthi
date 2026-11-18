// ============================================================
// src/middleware/authMiddleware.js
// Supabase JWT Authentication Middleware
// ============================================================
//
// WHAT IS MIDDLEWARE?
//   Middleware is a function that runs BETWEEN the request
//   arriving and the route handler responding. It can inspect
//   the request, modify it, or stop it entirely.
//
// WHAT DOES THIS MIDDLEWARE DO?
//   It acts as a security checkpoint. Any route that uses it
//   will require the caller to prove they are a logged-in user
//   by sending a valid Supabase JWT access token.
//
// HOW TO USE IT IN A ROUTE:
//   import authMiddleware from '../middleware/authMiddleware.js'
//   router.get('/my-route', authMiddleware, myController)
//                            ^^^^^^^^^^^^^^
//                            This runs first, before myController
//
// WHAT IS A JWT?
//   A JSON Web Token is a digitally signed string that contains
//   the user's identity. Supabase Auth issues one when a user
//   logs in. It looks like: eyJhbGci...xyz (long random string)
//
// WHY VERIFY WITH SUPABASE INSTEAD OF DECODING LOCALLY?
//   We could decode the JWT ourselves — but then we'd only be
//   reading what the token CLAIMS. We wouldn't know if the token
//   was revoked, forged, or expired on Supabase's end.
//   supabase.auth.getUser(token) makes an HTTP request to the
//   Supabase Auth server and returns the REAL, current user data.
//   This is the only safe way to verify identity.
// ============================================================

// ── Import the shared Supabase client ─────────────────────────
// We reuse the existing client from config/supabase.js.
// No new client is created here.
// Note: supabase.auth.getUser(token) sends the farmer's JWT to
// Supabase Auth for verification via the shared Supabase client
// initialized with SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.
// This is an identity check, not a database query.
import supabase, { getAuthenticatedClient } from '../config/supabase.js'

// ── The middleware function ────────────────────────────────────
// Express middleware always receives three arguments:
//   req  — the incoming request (we read the token from here)
//   res  — the response (we use this to send 401 errors)
//   next — a function we call to pass control to the next handler
//          If we call next(), the route runs.
//          If we call res.json() instead, the route is blocked.
const authMiddleware = async (req, res, next) => {
  try {
    // ── STEP 0: Check if the Supabase client is ready ─────────
    // supabase.js exports null when credentials are not configured.
    // If null, we can't verify any tokens — return 503 clearly.
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message:
          'Authentication service is not configured. ' +
          'Check SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env and restart.',
      })
    }

    // ── STEP 1: Read the Authorization header ─────────────────
    // The frontend must send the token in this exact format:
    //   Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
    //
    // req.headers is an object of all HTTP headers.
    // req.headers.authorization reads the Authorization header.
    // Note: Express lowercases all header names automatically.
    const authHeader = req.headers.authorization

    // ── STEP 2: Check if the header is present at all ─────────
    // If no Authorization header was sent, the user is not logged in.
    // Return 401 Unauthorized immediately.
    // 401 means "I don't know who you are — please authenticate."
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          'Authorization header is missing. Please log in and include your Bearer token.',
      })
    }

    // ── STEP 3: Validate the "Bearer " prefix ─────────────────
    // The header must start with "Bearer " (with a space after it).
    // This is the standard HTTP Authorization scheme for token-based auth.
    // Examples of WRONG formats:
    //   "Token eyJ..."        → missing "Bearer"
    //   "eyJ..."              → no prefix at all
    //   "Bearer"              → prefix with no token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid authorization format. The expected format is: Bearer <your_token>',
      })
    }

    // ── STEP 4: Extract the token from the header ──────────────
    // authHeader looks like: "Bearer eyJhbGciOiJIUzI1NiJ9..."
    // We split on the space and take the second part (index 1).
    // "Bearer eyJ...".split(' ') → ["Bearer", "eyJ..."]
    //                                            ^^^^^^ this is [1]
    const token = authHeader.split(' ')[1]

    // Extra guard: ensure the token is not empty after splitting.
    // e.g. "Bearer " with a trailing space but no actual token.
    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Token is missing after Bearer. Please log in again.',
      })
    }

    // ── STEP 5: Verify the token with Supabase Auth ────────────
    // supabase.auth.getUser(token) sends an HTTPS request to the
    // Supabase Auth server with the farmer's token.
    //
    // Supabase will:
    //   a) Check the token's signature (is it really from Supabase?)
    //   b) Check the expiry (is it still valid, or has it expired?)
    //   c) Return the real, current user data from its database
    //
    // It returns an object: { data: { user }, error }
    //   - On success: data.user = { id, email, ... }, error = null
    //   - On failure: data.user = null, error = { message: ... }
    const { data, error } = await supabase.auth.getUser(token)

    // ── STEP 6: Handle a failed verification ──────────────────
    // If Supabase returned an error, or if data.user is null/undefined,
    // the token is invalid, expired, or forged.
    // We return 401 with a safe, generic message.
    // We do NOT reveal the specific reason (expired vs forged)
    // to prevent attackers from gaining information.
    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.',
      })
    }

    // ── STEP 7: Attach the verified user to the request ───────
    // req.user is a custom property we add to the request object.
    // Every route handler that runs AFTER this middleware can now
    // read req.user to know WHO is making the request.
    //
    // data.user contains fields like:
    //   {
    //     id: "uuid-of-the-user",
    //     email: "ramesh@example.com",
    //     role: "authenticated",
    //     ...
    //   }
    req.user = data.user
    req.token = token
    req.supabase = getAuthenticatedClient(token)

    // ── STEP 8: Pass control to the next handler ───────────────
    // next() tells Express: "this middleware is done, run the route."
    // Without calling next(), the request would hang forever.
    next()
  } catch (err) {
    // ── STEP 9: Handle unexpected server errors ────────────────
    // If anything unexpected happens (network failure talking to
    // Supabase, code bug, etc.), we catch it here.
    //
    // We log the error server-side for debugging, but send a
    // generic message to the client so we don't leak internals.
    console.error('❌ authMiddleware unexpected error:', err.message)
    return res.status(500).json({
      success: false,
      message: 'Authentication check failed due to a server error. Try again later.',
    })
  }
}

export default authMiddleware
