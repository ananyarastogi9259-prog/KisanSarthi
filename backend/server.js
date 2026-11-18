// ============================================================
// server.js  (backend root — entry point)
// ============================================================
// This is the first file Node.js runs when you do `npm run dev`.
//
// Responsibilities:
//   1. Load environment variables from .env into process.env
//   2. Import the configured Express application from src/app.js
//   3. Start the HTTP server on the port defined in .env
//   4. Initialize background sync schedulers
//   5. Handle graceful shutdown
// ============================================================

// ── 1. Load .env variables FIRST ──────────────────────────────
import './src/config/env.js'

// ── 2. Import Express app & background scheduler ──────────────
import app from './src/app.js'
import schemeScheduler from './src/services/schemeSync/schemeScheduler.js'

// ── 3. Read PORT from environment ─────────────────────────────
const PORT = process.env.PORT || 5000

// ── 4. Start the HTTP server ───────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 KisanSarthi API server started')
  console.log(`   Mode        : ${process.env.NODE_ENV || 'development'}`)
  console.log(`   Port        : ${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/api/health`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Start background scheme sync scheduler unless explicitly disabled (e.g. in test runs)
  if (process.env.ENABLE_SCHEME_CRON !== 'false') {
    schemeScheduler.start()
  }
})

// ── 5. Graceful shutdown handler ───────────────────────────────
const gracefulShutdown = () => {
  console.log('\n🛑 Shutting down server gracefully...')
  schemeScheduler.stop()
  server.close(() => {
    console.log('✅ Server closed cleanly.')
    process.exit(0)
  })
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

export default server
