// ============================================================
// src/app.js
// Express Application Configuration
// ============================================================
// This file creates and configures the Express application.
// It sets up middleware and mounts all API routes.
//
// It does NOT start the server — that is server.js's job.
// Think of this as "setting up the building interior"
// before opening the front door.
// ============================================================

import './config/env.js'
import express from 'express'
import cors from 'cors'
import authMiddleware from './middleware/authMiddleware.js'
import farmerRoutes from './routes/farmerRoutes.js'
import landRecordRoutes from './routes/landRecordRoutes.js'
import schemeRoutes from './routes/schemeRoutes.js'
import eligibilityRoutes from './routes/eligibilityRoutes.js'
import personalizedSchemeRoutes from './routes/personalizedSchemeRoutes.js'
import applicationRoutes from './routes/applicationRoutes.js'
import authRoutes from './routes/authRoutes.js'

// ── 1. Create the Express application ─────────────────────────
// 'app' is the core object. All middleware and routes attach here.
const app = express()

// ── 2. CORS — Cross-Origin Resource Sharing ───────────────────
// Allows frontend development origins:
//   - http://localhost:3000 (TanStack Start / Vite dev server)
//   - http://localhost:5173 (Vite preview / alternate dev port)
//   - process.env.CLIENT_URL (custom configured environment URL)
// Does NOT use unrestricted CORS (*).
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true)

      if (
        allowedOrigins.includes(origin) ||
        /^https:\/\/.*\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true)
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true, // Allow cookies and Authorization headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// ── 3. Body Parsers ────────────────────────────────────────────
// When a farmer submits a form or the frontend sends data, that
// data travels in the "body" of the HTTP request.
// Express cannot read it without these two lines.

// Parses JSON request bodies:
// e.g. { "state": "Maharashtra", "crop": "Wheat" }
app.use(express.json({ limit: '10kb' }))

// Parses URL-encoded form bodies (classic HTML form submissions):
// e.g. state=Maharashtra&crop=Wheat
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// ── 4. Health Check Endpoint ───────────────────────────────────
// GET /api/health
//
// This route exists to verify that:
//   a) The server started and is accepting requests
//   b) The required Supabase environment variables are present
//
// Open http://localhost:5000/api/health in your browser to test.
app.get('/api/health', (req, res) => {
  // Check whether the Supabase environment variables have been
  // filled in with real values, or are still placeholders.
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY

  const isUrlConfigured = Boolean(
    supabaseUrl &&
    supabaseUrl !== 'your_supabase_project_url' &&
    supabaseUrl.startsWith('https://')
  )

  const isKeyConfigured = Boolean(
    supabaseKey &&
    supabaseKey.trim().length > 0 &&
    supabaseKey !== 'your_supabase_publishable_key'
  )

  res.status(200).json({
    success: true,
    message: 'KisanSarthi API is running',
    environment: process.env.NODE_ENV || 'development',
    supabase: {
      url_configured: isUrlConfigured,
      key_configured: isKeyConfigured,
      status:
        isUrlConfigured && isKeyConfigured
          ? 'ready'
          : 'waiting for credentials — update SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env',
    },
    timestamp: new Date().toISOString(),
  })
})

// ── 5. Protected Test Route ──────────────────────────────────────
// GET /api/protected-test
//
// TEMPORARY ROUTE — used to verify authMiddleware is working.
// Remove or restrict this before deploying to production.
//
// HOW IT WORKS:
//   authMiddleware is passed as the SECOND argument to app.get().
//   Express runs it before the final handler (the arrow function).
//
//   Request flow:
//     [Request arrives]
//       → authMiddleware checks the token
//       → token valid? → next() → final handler → 200 response
//       → token invalid? → middleware sends 401 → handler never runs
//
// After passing authMiddleware, req.user is guaranteed to exist
// and contain the verified Supabase user object.
app.get('/api/protected-test', authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'You have successfully accessed a protected route.',
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  })
})

// ── 6. API Routes ─────────────────────────────────────────────
// Mount auth, farmer profile, land records, schemes, eligibility, personalized schemes, and applications
app.use('/api/auth', authRoutes)
app.use('/api/farmer', farmerRoutes)
app.use('/api/land-records', landRecordRoutes)
app.use('/api/schemes', schemeRoutes)
app.use('/api/eligibility', eligibilityRoutes)
app.use('/api/personalized-schemes', personalizedSchemeRoutes)
app.use('/api/applications', applicationRoutes)

// ── 6. 404 Not Found Handler ───────────────────────────────────
// Any request that doesn't match a route above falls through here.
// We return a clear JSON 404 instead of the default HTML error page.
// IMPORTANT: This must come AFTER all routes.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
})

// ── 7. Global Error Handler ────────────────────────────────────
// Express identifies this as an error handler because it has
// FOUR parameters: (err, req, res, next).
//
// Express 5 (installed) automatically catches async errors and
// forwards them here — no manual try/catch needed in routes.
//
// In development: show the full stack trace for debugging.
// In production: hide internals, show only a safe message.
//
// IMPORTANT: This must be the LAST middleware in the file.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500
  const message = err.message || 'Something went wrong on our end.'

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

export default app
