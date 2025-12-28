import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { sendEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      // Return 200 even if user doesn't exist to prevent enumeration
      return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' })
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

    // Store token
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt
      }
    })

    // Send Email
    await sendEmail(
      email,
      'Reset your password',
      `Your reset token is: ${token}`,
      `<p>You requested a password reset. Use this code to reset your password:</p><h3>${token}</h3><p>This code expires in 1 hour.</p>`
    )

    return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
