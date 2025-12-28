/**
 * Session Cleanup Script
 * 
 * Deletes expired sessions from the database.
 * Run via: npx tsx scripts/cleanup-sessions.ts
 * 
 * Can be scheduled via cron job or Vercel Cron for periodic cleanup.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupExpiredSessions() {
  const now = new Date()
  
  console.log(`[${now.toISOString()}] Starting session cleanup...`)
  
  try {
    // Delete all sessions where expiresAt is in the past
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    })
    
    console.log(`[${now.toISOString()}] Deleted ${result.count} expired sessions`)
    
    // Log to console for visibility
    if (result.count > 0) {
      console.log(`Cleanup successful: ${result.count} sessions removed`)
    } else {
      console.log('No expired sessions found')
    }
    
    return result.count
  } catch (error) {
    console.error('Session cleanup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if executed directly
cleanupExpiredSessions()
  .then((count) => {
    console.log(`Session cleanup completed. Removed ${count} expired sessions.`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('Session cleanup failed:', error)
    process.exit(1)
  })
