"use client"
import { useState } from 'react'

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
    <div className="max-w-sm">
      <h1 className="mb-4 text-xl font-semibold">Login</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded border p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full rounded border p-2" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn w-full" type="submit">Login</button>
      </form>
      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
      <p className="mt-4 text-sm text-gray-600">Demo users: student@college.local/user123, vendor@college.local/vendor123, admin@college.local/admin123</p>
    </div>
  )
}
