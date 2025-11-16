// Attempt Prisma generate but don't fail build if engine DLL is locked (Windows EPERM workaround)
const { execSync } = require('child_process')
try {
  console.log('[prebuild] Running prisma generate...')
  execSync('npx prisma generate', { stdio: 'inherit' })
  console.log('[prebuild] Prisma client ready.')
} catch (e) {
  console.warn('[prebuild] Warning: prisma generate failed, continuing:', e.message)
}
