"use client"
import Link from 'next/link'
// Removed unused import
// Actually, for server actions we can't use 'use client'. 
// But the previous file was 'use client'.
// Let's stick to a client component for interactivity or standard server actions if possible.
// The user's request implies we can just use standard HTML forms or client handlers.
// Let's use standard client-side handlers or wrapping server actions if available.
// Given the previous file used 'use client' and `fetch` to `/api/auth/login`, I will stick to that pattern but with new UI.

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? '/canteens'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (res.ok) {
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
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4 overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FF9F1C] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FFD166] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-[#06D6A0] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-sm w-full relative">
        {/* Floating Game Elements - Repositioned/Resized for compactness */}
        <div className="absolute -top-8 -left-8 animate-bounce delay-700 hidden md:block">
          <NeoIcon icon="🎮" size="text-5xl" rotate="-6deg" />
        </div>
        <div className="absolute -bottom-6 -right-8 animate-bounce delay-100 hidden md:block">
          <NeoIcon icon="🍔" size="text-5xl" rotate="12deg" />
        </div>

        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000000] rounded-xl overflow-hidden relative z-10">
          
          {/* Header Section - Reduced padding */}
          <div className="bg-[#FF9F1C] p-4 border-b-4 border-black text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10"></div>
            <div className="relative z-10 transform transition-transform group-hover:scale-105">
              <div className="inline-block bg-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#000000] mb-1 transform -rotate-2">
                 <span className="font-bold text-[10px] uppercase tracking-widest">Skip The Queue</span>
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-black drop-shadow-sm leading-none">
                Player<br/><span className="text-white text-stroke-1 text-4xl">Login</span>
              </h1>
              <p className="font-bold mt-1 text-xs">The cheat code for your hunger!</p>
            </div>
          </div>

          {/* Form Section - Compact spacing */}
          <div className="p-5 space-y-3">
            
            {/* Google Login Button - Compact */}
            <button 
              onClick={() => window.location.href = '/api/auth/google'}
              className="w-full bg-white border-2 border-black p-2 rounded-lg shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-2 font-bold text-sm group"
            >
              <div className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center bg-[#FFF8F0] group-hover:bg-[#FFD166] transition-colors">
                <svg className="w-3 h-3" viewBox="0 0 24 24">
                 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              </div>
              <span>Google Login</span>
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-black"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 font-bold text-[10px] uppercase border-2 border-black shadow-[2px_2px_0px_0px_#000000]">OR SKIP LEVEL</span>
              </div>
            </div>

            {/* Manual Login - Compact */}
            <form onSubmit={handleManualLogin} className="space-y-2">
              <div className="space-y-1">
                <label className="font-bold text-[10px] uppercase ml-1">Player Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player1@example.com"
                  className="w-full bg-white border-2 border-black p-2 rounded-lg focus:outline-none focus:ring-0 focus:border-[#FF9F1C] focus:shadow-[3px_3px_0px_0px_#000000] transition-all font-mono text-xs placeholder:text-gray-400"
                  required
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                   <label className="font-bold text-[10px] uppercase">Secret Key</label>
                   <Link href="/forgot-password" className="text-[10px] font-bold text-[#FF9F1C] hover:underline hover:text-black">Forgot?</Link>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border-2 border-black p-2 rounded-lg focus:outline-none focus:ring-0 focus:border-[#FF9F1C] focus:shadow-[3px_3px_0px_0px_#000000] transition-all font-mono text-xs placeholder:text-gray-400"
                  required
                />
              </div>

              {message && (
                <div className="text-red-500 text-xs font-bold text-center bg-red-50 p-1 border-2 border-red-500 rounded">
                  {message}
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#06D6A0] border-2 border-black p-2 rounded-lg shadow-[3px_3px_0px_0px_#000000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all font-black text-base uppercase tracking-wide flex justify-center"
              >
                {isLoading ? 'Loading...' : 'Start Game'}
              </button>
            </form>
          </div>
          
          {/* Footer - Compact */}
          <div className="bg-gray-100 p-2 border-t-4 border-black text-center">
            <p className="font-bold text-[10px]">
              New Player? <Link href="/register" className="text-[#FF9F1C] underline decoration-2 underline-offset-2 hover:bg-[#FF9F1C] hover:text-black transition-colors px-1">Create Character</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function NeoIcon({ icon, size, rotate }: { icon: string, size: string, rotate: string }) {
  return (
    <div className={`transform ${rotate} hover:scale-110 transition-transform cursor-default select-none`}>
       <span className={`${size} filter drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]`}>{icon}</span>
    </div>
  )
}
