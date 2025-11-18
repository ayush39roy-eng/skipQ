"use client"
import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const onboardingSteps = [
  { title: 'Campus verification', detail: 'Use your official college email so we can activate loyalty perks.' },
  { title: 'Personalise menus', detail: 'Save diet preferences and top canteens for instant suggestions.' },
  { title: 'Collect in minutes', detail: 'We notify you when the order hits the counter—no queueing.' }
]

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage(data.error ?? 'Registration failed')
        return
      }
      const login = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (login.ok) {
        window.location.href = '/canteens'
      } else {
        setMessage('Registered, but auto-login failed. Please login manually.')
      }
    } catch (error) {
      console.error('Registration request failed', error)
      setMessage('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-gradient-to-br from-[#0f172a] via-[#111927] to-[#05070f] px-6 py-12 shadow-[0_40px_160px_-80px_rgba(76,29,149,0.8)] sm:px-10 lg:px-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_45%)]" aria-hidden />
      <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6 text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-violet-200">Join SkipQ</span>
          <div className="space-y-4">
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">Create an account. Unlock instant dining.</h1>
            <p className="text-base text-white/80 sm:text-lg">All your canteens, wallets, and loyalty perks live here. Personalise once and glide past the queue forever.</p>
          </div>
          <ol className="space-y-4">
            {onboardingSteps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="text-sm font-mono text-white/50">0{index + 1}</span>
                <div>
                  <p className="text-base font-semibold text-white">{step.title}</p>
                  <p className="text-sm text-white/70">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-4 text-sm text-white/80">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Food ready faster</p>
              <p className="text-2xl font-bold">6 min avg</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Canteens onboard</p>
              <p className="text-2xl font-bold">38</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Students satisfied</p>
              <p className="text-2xl font-bold">97%</p>
            </div>
          </div>
        </div>

        <Card className="space-y-6 border-white/10 bg-[rgb(var(--bg))]/80 p-8 text-[rgb(var(--text))] backdrop-blur">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.5em] text-[rgb(var(--text-muted))]">Step 1</p>
            <h2 className="text-2xl font-semibold tracking-tight">Create account</h2>
            <p className="text-sm text-[rgb(var(--text-muted))]">Use your campus email so we can secure your profile.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Input label="Full name" value={name} onChange={e => setName(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" loading={loading}>{loading ? 'Creating…' : 'Sign up'}</Button>
          </form>
          {message && <p className="text-sm text-red-500">{message}</p>}
          <p className="text-sm text-[rgb(var(--text-muted))]">Already have an account? <Link href="/login" className="text-violet-400 hover:underline">Log in</Link></p>
        </Card>
      </div>
    </div>
  )
}
