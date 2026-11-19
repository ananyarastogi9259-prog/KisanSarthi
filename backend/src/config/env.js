import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Resolve the absolute path to backend/.env
// This ensures environment variables are loaded reliably regardless of the working directory
const envPath = path.resolve(__dirname, '../../.env')

dotenv.config({ path: envPath })

// Normalize potential typos in environment variable names
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPAYBASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPAYBASE_SERVICE_ROLE_KEY
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
}

export default process.env

