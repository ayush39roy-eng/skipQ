"use client"
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const benefits = [
  'Real-time menus & wait times',
  'WhatsApp-ready order alerts',
  'Cashfree, UPI & card checkout'
]

const demoUsers = [
  { label: 'Student', email: 'student@college.local', password: 'user123' },
  { label: 'Vendor', email: 'vendor@college.local', password: 'vendor123' },
  { label: 'Admin', email: 'admin@college.local', password: 'admin123' }
]

export default function LoginPage() {
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? '/canteens'
  const encodedNext = encodeURIComponent(nextParam)
  const [email, setEmail] = useState('student@college.local')
  const [password, setPassword] = useState('user123')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (res.ok) {
      window.location.href = nextParam
    } else {
      const data = await res.json().catch(() => ({}))
      setMessage(data.error ?? 'Login failed')
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-12 shadow-[0_30px_120px_-60px_rgba(15,118,255,0.8)] sm:px-10 lg:px-16">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-sky-500/20 via-emerald-400/10 to-transparent blur-3xl" aria-hidden />
      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 text-white">
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
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Demo access</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {demoUsers.map(user => (
                <button
                  key={user.label}
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white transition hover:border-sky-400/60"
                  onClick={() => { setEmail(user.email); setPassword(user.password); }}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">{user.label}</p>
                  <p className="text-sm font-semibold">{user.email}</p>
                  <p className="text-xs text-white/70">{user.password}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <Card className="space-y-6 border-white/10 bg-[rgb(var(--bg))]/80 p-8 text-[rgb(var(--text))] backdrop-blur">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.5em] text-[rgb(var(--text-muted))]">Account</p>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-[rgb(var(--text-muted))]">Enter your campus email to access SkipQ.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" variant="primary">Login</Button>
          </form>
          {message && <p className="text-sm text-red-500">{message}</p>}
          <p className="text-sm text-[rgb(var(--text-muted))]">Forgot password? <Link href="/privacy" className="text-sky-400 hover:underline">Contact admin</Link></p>
          <p className="text-sm text-[rgb(var(--text-muted))]">New here? <Link href={`/register?next=${encodedNext}`} className="text-sky-400 hover:underline">Create an account</Link></p>
        </Card>
      </div>
    </div>
  )
}
