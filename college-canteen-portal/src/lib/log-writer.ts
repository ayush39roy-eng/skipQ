import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const logDir = process.env.APP_LOG_DIR || path.resolve(process.cwd(), 'logs')
const logFile = process.env.APP_LOG_FILE || path.join(logDir, 'whatsapp.log')
let ensureDirPromise: Promise<void> | null = null

async function ensureDirectory() {
  if (!ensureDirPromise) {
    ensureDirPromise = mkdir(path.dirname(logFile), { recursive: true })
      .then(() => undefined)
      .catch((error) => {
      ensureDirPromise = null
      throw error
      })
  }
  return ensureDirPromise
}

export async function writeLog(tag: string, payload: unknown) {
  try {
    await ensureDirectory()
    const entry = `[${new Date().toISOString()}] ${tag} ${JSON.stringify(payload)}\n`
    await appendFile(logFile, entry, { encoding: 'utf8' })
  } catch (error) {
    console.error('[LogWriter] Failed to persist log', { tag, error })
  }
}
