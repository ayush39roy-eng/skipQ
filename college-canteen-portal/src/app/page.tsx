import Link from 'next/link'
import { getSession } from '@/lib/session'
import { Zap, Bell, CreditCard, BarChart3 } from 'lucide-react'

const features = [
  {
    title: 'Live sync',
    description: 'Realtime menus, availability, prep times, and allergen info straight from each canteen station.',
    accent: 'Realtime',
    icon: Zap,
    color: 'bg-yellow-400'
  },
  {
    title: 'Automation',
    description: 'Vendors receive WhatsApp alerts with confirm / cancel buttons to keep queues short.',
    accent: 'Faster fulfilment',
    icon: Bell,
    color: 'bg-green-400'
  },
  {
    title: 'Multi-pay',
    description: 'Cashfree, UPI, cards and staff wallets—all reconciled automatically.',
    accent: 'Unified payments',
    icon: CreditCard,
    color: 'bg-pink-400'
  },
  {
    title: 'Analytics',
    description: 'Admins track rush hours, order conversion and vendor SLAs in one dashboard.',
    accent: 'Campus insights',
    icon: BarChart3,
    color: 'bg-blue-400'
  }
]



export default async function HomePage() {
  const session = await getSession()

  const quickLinks = [
    { label: 'Browse Menus', href: '/canteens', description: 'Find something delicious in seconds.' },
    { label: 'Vendor Hub', href: '/vendor', description: 'Manage prep times and live orders.', requireRole: 'VENDOR' as const },
    { label: 'Admin Overview', href: '/admin', description: 'Monitor all outlets and KPIs.', requireRole: 'ADMIN' as const }
  ].filter(link => !link.requireRole || link.requireRole === session?.role)

  return (
    <div className="space-y-8 py-4 sm:space-y-16 sm:py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border-4 border-black bg-[#FF9F1C] px-4 py-10 shadow-[4px_4px_0px_0px_#000000] sm:shadow-[8px_8px_0px_0px_#000000] sm:px-12 sm:py-20 relative text-black group">
        
        {/* Abstract Shapes & "Spark" Elements */}
        {/* Retro Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
        
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-white/10 rotate-12 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[120%] bg-black/5 -rotate-12 blur-2xl pointer-events-none"></div>
        
        {/* Floating Background Icons for "Live" Feel */}
        <div className="absolute top-10 left-10 opacity-20 animate-float pointer-events-none">
           <Zap className="w-16 h-16 text-black rotate-[-12deg]" />
        </div>
        <div className="absolute bottom-20 right-20 opacity-20 animate-wiggle pointer-events-none">
           <Bell className="w-20 h-20 text-white rotate-[12deg]" />
        </div>
        <div className="absolute top-1/2 right-10 opacity-10 animate-float pointer-events-none" style={{ animationDelay: '1s' }}>
           <CreditCard className="w-24 h-24 text-black rotate-[45deg]" />
        </div>

        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none"></div>

        <div className="relative flex flex-col items-center gap-8 text-center z-10">
          <div className="max-w-4xl space-y-6">
            <div className="space-y-4">
              <div className="inline-block bg-black text-white px-3 py-1 text-[10px] sm:px-6 sm:py-2 sm:text-sm font-black uppercase tracking-[0.2em] transform -rotate-2 shadow-[2px_2px_0px_white] sm:shadow-[4px_4px_0px_white] animate-pulse-slow border-2 border-white">
                Level 1: The Canteen
              </div>
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none drop-shadow-[2px_2px_0px_rgba(255,255,255,0.5)] sm:drop-shadow-[4px_4px_0px_rgba(255,255,255,0.5)]">
                Hungry?<br/>
                <span className="text-white text-stroke-1 sm:text-stroke-3 drop-shadow-[2px_2px_0px_#000] sm:drop-shadow-[4px_4px_0px_#000] relative inline-block">
                    Skip The Queue.
                    {/* Underline Squiggle */}
                    <svg className="absolute -bottom-4 left-0 w-full h-4 text-black" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
                    </svg>
                </span>
              </h1>
            </div>
            <p className="text-lg sm:text-2xl font-bold max-w-2xl mx-auto opacity-90 bg-white/20 p-2 rounded-lg border-2 border-black/10 backdrop-blur-sm">
              Pre-order from your phone, beat the rush, and <span className="text-[#EF476F] underline decoration-wavy decoration-2 underline-offset-8 font-black [text-decoration-skip-ink:none]">level up</span> your lunch break.
            </p>

            <div className="flex flex-wrap justify-center gap-6 pt-6">
              <Link href="/canteens" className="text-base px-6 py-3 sm:text-xl sm:px-10 sm:py-5 bg-white border-4 border-black font-black uppercase tracking-wide shadow-[4px_4px_0px_0px_#000000] sm:shadow-[8px_8px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] sm:hover:shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] sm:hover:translate-x-[4px] sm:hover:translate-y-[4px] active:translate-x-[4px] active:translate-y-[4px] sm:active:translate-x-[8px] sm:active:translate-y-[8px] active:shadow-none transition-all rounded-xl sm:rounded-2xl flex items-center gap-2 group/btn">
                <span>Start Ordering</span>
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 group-hover/btn:fill-black transition-colors" />
              </Link>
              {!session?.role && (
                 <Link href="/register" className="text-base px-6 py-3 sm:text-xl sm:px-10 sm:py-5 bg-[#06D6A0] text-black border-4 border-black font-black uppercase tracking-wide shadow-[4px_4px_0px_0px_#000000] sm:shadow-[8px_8px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] sm:hover:shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] sm:hover:translate-x-[4px] sm:hover:translate-y-[4px] active:translate-x-[4px] active:translate-y-[4px] sm:active:translate-x-[8px] sm:active:translate-y-[8px] active:shadow-none transition-all rounded-xl sm:rounded-2xl">
                  Join Game
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* User Dashboard / Welcome Back */}
      {session && (
        <section className="rounded-2xl border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_#000000]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">Welcome Back, Player</p>
              <h2 className="text-4xl font-black text-black uppercase">{session.user.name}</h2>
              <div className="inline-block px-3 py-1 bg-[#FFD166] border-2 border-black text-xs font-bold uppercase rounded-lg">
                Role: {session.role}
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-4 sm:w-auto">
              {quickLinks.map(link => (
                <Link key={link.href} href={link.href} className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all rounded-lg font-bold uppercase text-sm text-center">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Grid - Clean / Mature Neo-Brutalism */}
      <section className="grid gap-6 md:grid-cols-2">
        {features.map((feature, i) => (
          <article key={feature.title} className="group flex flex-col rounded-xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:translate-y-[-2px] transition-all">
             <div className="mb-4 flex items-center justify-between">
                <div className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 border-black ${feature.color} shadow-[2px_2px_0px_0px_#000000]`}>
                    <feature.icon className="w-6 h-6 text-black" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest border-2 border-black px-2 py-1 rounded bg-slate-100">
                    {feature.accent}
                </span>
             </div>
             
             <h3 className="text-2xl font-black text-black uppercase mb-2">{feature.title}</h3>
             <p className="text-base font-bold text-slate-600 leading-relaxed">
                {feature.description}
             </p>
          </article>
        ))}
      </section>

      {/* CTA Section */}
      {!session && (
        <section className="rounded-[2rem] border-4 border-black bg-[#FFD166] p-10 text-center shadow-[8px_8px_0px_0px_#000000] relative overflow-hidden">
           <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-4xl font-black text-black uppercase tracking-tight">Ready to Skip the Queue?</h2>
              <p className="text-xl font-bold">Sign in with your campus email to unlock personalised menus, loyalty perks and seamless checkout.</p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Link href="/login" className="px-8 py-3 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all rounded-xl font-black uppercase">
                    Login
                </Link>
                <Link href="/register" className="px-8 py-3 bg-black text-white border-2 border-black shadow-[4px_4px_0px_0px_white] hover:bg-slate-900 transition-all rounded-xl font-black uppercase">
                    Create Account
                </Link>
              </div>
           </div>
        </section>
      )}
    </div>
  )
}
