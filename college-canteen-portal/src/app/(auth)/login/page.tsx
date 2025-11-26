"use client"
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loader } from '@/components/ui/Loader'

const benefits = [
  'Real-time menus & wait times',
  'WhatsApp-ready order alerts',
  'Cashfree, UPI & card checkout'
]

export default function LoginPage() {
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? '/canteens'
  const encodedNext = encodeURIComponent(nextParam)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    // On small screens, bring the login form into view so users don't have to scroll.
    try {
      if (typeof window !== 'undefined') {
        const isMobile = window.matchMedia && window.matchMedia('(max-width: 640px)').matches
        if (isMobile) {
          // Allow layout to settle before scrolling
          setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 120)
        }
      }
    } catch { }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (res.ok) {
        // Redirect on success. Loading state will be cleared if navigation doesn't occur.
        window.location.href = nextParam
        return
      }

      const data = await res.json().catch(() => ({}))
      setMessage(data.error ?? 'Login failed')
    } catch {
      setMessage('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 shadow-[0_30px_120px_-60px_rgba(15,118,255,0.8)] sm:px-10 sm:py-12 lg:px-16">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-sky-500/20 via-emerald-400/10 to-transparent blur-3xl" aria-hidden />
      <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Mobile Header - Visible only on small screens */}
        <div className="lg:hidden text-center space-y-2 mb-[-1rem]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">SkipQ Access</span>
          <h1 className="text-2xl font-black text-white">Sign in</h1>
        </div>

        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden lg:block space-y-6 text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">SkipQ Access</span>
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Sign in. Skip every queue.</h1>
            <p className="text-base text-white/80 sm:text-lg">
              Manage orders, reconcile payments, and keep vendors in sync from one beautiful control room built for campus dining.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-white/80">
            {benefits.map(item => (
              <li key={item} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Secure access</p>
            <p className="mt-3 text-sm text-white/70">
              Student and vendor accounts now use the credentials shared with them directly. If you need an account or reset, contact the SkipQ admin team.
            </p>
          </div>
        </div>

        <Card className="space-y-4 border-white/10 bg-[rgb(var(--bg))]/80 p-5 text-[rgb(var(--text))] backdrop-blur sm:p-8">
          <div className="space-y-1 lg:block hidden">
            <p className="text-xs uppercase tracking-[0.5em] text-[rgb(var(--text-muted))]">Account</p>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          </div>
          <form ref={formRef} onSubmit={submit} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" variant="primary" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader size="small" />
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[rgb(var(--border))]"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[rgb(var(--bg))] px-2 text-[rgb(var(--text-muted))]">Or continue with</span>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/api/auth/google'}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </form>
          {message && <p className="text-sm text-red-500">{message}</p>}
          <p className="text-base text-[rgb(var(--text-muted))]">New here? <Link href={`/register?next=${encodedNext}`} className="text-sky-400 hover:underline font-semibold">Create an account</Link></p>
          <p className="text-sm text-[rgb(var(--text-muted))]">Forgot password? <Link href="/privacy" className="text-sky-400 hover:underline">Contact admin</Link></p>
        </Card>
      </div>
    </div>
  )
}
