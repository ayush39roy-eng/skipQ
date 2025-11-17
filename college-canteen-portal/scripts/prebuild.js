// Attempt Prisma generate but don't fail build if engine DLL is locked (Windows EPERM workaround)
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function tryRemoveWindowsEngine() {
  if (process.platform !== 'win32') return
  const enginePath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node')
  try {
    if (fs.existsSync(enginePath)) {
      fs.unlinkSync(enginePath)
      console.log('[prebuild] Removed stale Prisma engine to avoid EPERM rename.')
    }
  } catch (err) {
    console.warn('[prebuild] Could not remove Prisma engine before generate:', err.message)
  }
}
try {
  console.log('[prebuild] Running prisma generate...')
  tryRemoveWindowsEngine()
  execSync('npx prisma generate', { stdio: 'inherit' })
  console.log('[prebuild] Prisma client ready.')
} catch (e) {
  console.warn('[prebuild] Warning: prisma generate failed, continuing:', e.message)
}
