"use client"
import { useState } from 'react'

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
    <div className="max-w-sm">
      <h1 className="mb-4 text-xl font-semibold">Create account</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded border p-2" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required />
        <input className="w-full rounded border p-2" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full rounded border p-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button className="btn w-full" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Sign up'}</button>
      </form>
      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
      <p className="mt-4 text-sm text-gray-600">
        Already have an account? <a href="/login" className="text-indigo-600 hover:underline">Log in</a>
      </p>
    </div>
  )
}
