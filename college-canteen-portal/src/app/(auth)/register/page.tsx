"use client"
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

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
      // Auto login after successful registration
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
    } catch (e) {
      setMessage('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-6">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="text-sm text-muted">Start ordering from your canteen.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Full name" value={name} onChange={e=>setName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" loading={loading}>{loading ? 'Creating…' : 'Sign up'}</Button>
        </form>
        {message && <p className="text-sm text-red-600">{message}</p>}
        <p className="text-sm">Already have an account? <a href="/login" className="text-indigo-600 hover:underline">Log in</a></p>
      </Card>
    </div>
  )
}
