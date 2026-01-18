"use client"
import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Utensils, Gamepad2 } from 'lucide-react'

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
    <div className="min-h-[calc(100vh-160px)] grid lg:grid-cols-2 bg-[#FFF8F0] text-black font-sans">
      {/* Left Side - Game Art / Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center relative p-12 bg-[#FF9F1C]/10 border-r-4 border-black border-dashed">
         
         {/* Floating Elements */}
         <div className="relative z-10 text-center space-y-6 max-w-lg">
            <div className="inline-flex items-center justify-center p-8 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-3xl mb-8 animate-float">
               <Utensils className="w-16 h-16 text-black" strokeWidth={2.5} />
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
      <div className="flex flex-col justify-center items-center p-2 bg-[#FFF8F0]">
        <div className="w-full max-w-sm space-y-3">
          <div className="text-center space-y-0.5">
            <div className="inline-block p-2 bg-[#FFD166] border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-full mb-1 animate-wiggle">
               <Gamepad2 className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-black">Player Login</h2>
            <p className="text-slate-600 font-bold border-b-2 border-slate-200 inline-block pb-0.5 text-xs">Enter credentials to start</p>
          </div>

          <div className="bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl relative overflow-hidden">
            <form ref={formRef} onSubmit={submit} className="space-y-3 relative z-10">
              
              <div className="space-y-0.5">
                <label className="text-[10px] font-black uppercase tracking-wider ml-1">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="w-full bg-slate-50 border-2 border-black p-2 rounded-md font-bold focus:outline-none focus:shadow-[2px_2px_0px_#FF9F1C] focus:bg-white transition-all text-sm"
                  placeholder="player@skipq.com"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-black uppercase tracking-wider ml-1">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  className="w-full bg-slate-50 border-2 border-black p-2 rounded-md font-bold focus:outline-none focus:shadow-[2px_2px_0px_#FF9F1C] focus:bg-white transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#FF9F1C] border-2 border-black text-black font-black uppercase tracking-widest py-2.5 rounded-lg shadow-[2px_2px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[0px_0px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                {isLoading ? 'LOADING...' : 'START GAME'}
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t-2 border-dashed border-slate-300"></span>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black">
                  <span className="bg-white px-2 text-slate-400">OR</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full bg-white border-2 border-black text-black font-bold uppercase tracking-wide py-2 rounded-lg shadow-[2px_2px_0px_0px_#000000] hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-xs"
                onClick={() => window.location.href = '/api/auth/google'}
              >
                <span>Google Login</span>
              </button>

            </form>
          </div>

          {message && (
             <div className="bg-[#FF6B6B] text-white p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000000] font-bold text-center animate-bounce text-xs">
                {message}
             </div>
          )}

          <p className="text-center text-slate-600 font-bold text-xs">
            New Player?{' '}
            <Link href={`/register?next=${encodedNext}`} className="text-[#FF9F1C] underline decoration-2 underline-offset-2 hover:text-black transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
