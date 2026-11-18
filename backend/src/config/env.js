import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Resolve the absolute path to backend/.env
// This ensures environment variables are loaded reliably regardless of the working directory
const envPath = path.resolve(__dirname, '../../.env')

dotenv.config({ path: envPath })

export default process.env

