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
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#FFF8F0] text-black font-sans">
      {/* Left Side - Game Art / Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center relative p-12 bg-[#FF9F1C]/10 border-r-4 border-black border-dashed">
         
         {/* Floating Elements */}
         <div className="relative z-10 text-center space-y-6 max-w-lg">
            <div className="inline-flex items-center justify-center p-8 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-3xl mb-8 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
               {/* Chef Hat Icon Replacement since Lucide might not be available or we use text */}
               <span className="text-6xl">🍔</span>
            </div>
            <h1 className="text-7xl font-black uppercase tracking-tighter drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] leading-none text-black">
              Skip The <br/>
              <span className="text-[#FFF8F0] px-4 bg-[#FF9F1C] border-2 border-black transform -skew-x-6 inline-block shadow-[4px_4px_0px_rgba(0,0,0,1)] mt-2">Queue</span>
            </h1>
            <p className="text-2xl font-bold text-slate-700 bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              "The cheat code for your hunger!"
            </p>
         </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex flex-col justify-center items-center p-8 bg-[#FFF8F0]">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-block p-4 bg-[#FFD166] border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-full mb-4">
               <span className="text-3xl">🎮</span>
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tight text-black">Player Login</h2>
            <p className="text-slate-600 font-bold border-b-2 border-slate-200 inline-block pb-1">Enter credentials to start</p>
          </div>

          <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl relative overflow-hidden">
            <form ref={formRef} onSubmit={submit} className="space-y-6 relative z-10">
              
              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-wider ml-1">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="w-full bg-slate-50 border-2 border-black p-3 rounded-lg font-bold focus:outline-none focus:shadow-[4px_4px_0px_#FF9F1C] focus:bg-white transition-all"
                  placeholder="player@skipq.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-wider ml-1">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  className="w-full bg-slate-50 border-2 border-black p-3 rounded-lg font-bold focus:outline-none focus:shadow-[4px_4px_0px_#FF9F1C] focus:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#FF9F1C] border-2 border-black text-black font-black uppercase tracking-widest py-4 rounded-xl shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[0px_0px_0px_0px_#000000] active:translate-x-[4px] active:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'LOADING...' : 'START GAME'}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t-2 border-dashed border-slate-300"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase font-black">
                  <span className="bg-white px-2 text-slate-400">OR</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full bg-white border-2 border-black text-black font-bold uppercase tracking-wide py-3 rounded-xl shadow-[4px_4px_0px_0px_#000000] hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                onClick={() => window.location.href = '/api/auth/google'}
              >
                <span>Google Login</span>
              </button>

            </form>
          </div>

          {message && (
             <div className="bg-[#FF6B6B] text-white p-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_#000000] font-bold text-center animate-bounce">
                {message}
             </div>
          )}

          <p className="text-center text-slate-600 font-bold">
            New Player?{' '}
            <Link href={`/register?next=${encodedNext}`} className="text-[#FF9F1C] underline decoration-4 underline-offset-4 hover:text-black transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
