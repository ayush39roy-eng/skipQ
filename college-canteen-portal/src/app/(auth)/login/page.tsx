"use client"
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function LoginPage() {
  const [email, setEmail] = useState('student@college.local')
  const [password, setPassword] = useState('user123')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    if (res.ok) {
      window.location.href = '/canteens'
    } else {
      const data = await res.json().catch(() => ({}))
      setMessage(data.error ?? 'Login failed')
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-6">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted">Sign in to continue ordering.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" variant="primary">Login</Button>
        </form>
        {message && <p className="text-sm text-red-600">{message}</p>}
        <div className="space-y-2 text-xs text-muted">
          <p>Demo: student@college.local / user123</p>
          <p>Vendor: vendor@college.local / vendor123</p>
          <p>Admin: admin@college.local / admin123</p>
        </div>
        <p className="text-sm">New here? <a href="/register" className="text-indigo-600 hover:underline">Create an account</a></p>
      </Card>
    </div>
  )
}
