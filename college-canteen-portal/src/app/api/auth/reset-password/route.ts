import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json()

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
    }

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() }
      }
    })

    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    // Update User Password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash: hashedPassword }
    })

    // Delete used token (and optionally all other tokens for this email)
    await prisma.passwordResetToken.deleteMany({
      where: { email: resetToken.email }
    })

    return NextResponse.json({ message: 'Password reset successful' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
