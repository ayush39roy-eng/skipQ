import Link from 'next/link'
import { getSession } from '@/lib/session'

const features = [
  {
    title: 'Realtime menus',
    description: 'Live availability, prep times, and allergen info straight from each canteen station.',
    accent: 'Live sync'
  },
  {
    title: 'Faster fulfilment',
    description: 'Vendors receive WhatsApp alerts with confirm / cancel buttons to keep queues short.',
    accent: 'Automation'
  },
  {
    title: 'Unified payments',
    description: 'Cashfree, UPI, cards and staff wallets—all reconciled automatically.',
    accent: 'Multi-pay'
  },
  {
    title: 'Campus-grade insights',
    description: 'Admins track rush hours, order conversion and vendor SLAs in one dashboard.',
    accent: 'Analytics'
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
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2rem] border-4 border-black bg-[#FF9F1C] px-6 py-16 shadow-[8px_8px_0px_0px_#000000] sm:px-12 sm:py-20 relative text-black group">
        
        {/* Abstract Shapes */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-white/20 rotate-12 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[120%] bg-black/10 -rotate-12 blur-2xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none"></div>

        <div className="relative flex flex-col items-center gap-8 text-center z-10">
          <div className="max-w-4xl space-y-6">
            <div className="space-y-2">
              <div className="inline-block bg-black text-white px-4 py-1 text-sm font-black uppercase tracking-[0.2em] transform -rotate-2 shadow-[4px_4px_0px_white]">
                Level 1: The Canteen
              </div>
              <h1 className="text-5xl font-black tracking-tighter sm:text-7xl uppercase leading-none drop-shadow-sm">
                Hungry?<br/>
                <span className="text-white text-stroke-2">Skip The Queue.</span>
              </h1>
            </div>
            <p className="text-xl font-bold max-w-2xl mx-auto opacity-90">
              Pre-order from your phone, beat the rush, and level up your lunch break.
            </p>

            <div className="flex flex-wrap justify-center gap-6 pt-4">
              <Link href="/canteens" className="text-xl px-8 py-4 bg-white border-2 border-black font-black uppercase tracking-wide shadow-[6px_6px_0px_0px_#000000] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all rounded-xl">
                Start Ordering
              </Link>
              {!session?.role && (
                 <Link href="/register" className="text-xl px-8 py-4 bg-[#06D6A0] border-2 border-black font-black uppercase tracking-wide shadow-[6px_6px_0px_0px_#000000] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all rounded-xl">
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

      {/* Features Grid */}
      <section className="grid gap-8 md:grid-cols-2">
        {features.map((feature, i) => (
          <article key={feature.title} className={`group rounded-2xl border-4 border-black p-8 shadow-[8px_8px_0px_0px_#000000] hover:shadow-[12px_12px_0px_0px_#000000] hover:-translate-y-1 transition-all bg-white overflow-hidden relative`}>
             <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-9xl leading-none select-none pointer-events-none group-hover:opacity-20 transition-opacity">
                {i + 1}
             </div>
             
             <div className="relative z-10">
                <div className="mb-6 inline-flex items-center gap-3">
                  <div className={`w-12 h-12 border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_#000000] flex items-center justify-center text-2xl ${featureColors[i % featureColors.length]}`}>
                    {featureIcons[i % featureIcons.length]}
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest bg-black text-white px-2 py-1 transform -skew-x-12">
                     {feature.accent}
                  </span>
                </div>
                <h3 className="text-3xl font-black text-black uppercase mb-3">{feature.title}</h3>
                <p className="text-lg font-bold text-slate-600 leading-relaxed border-l-4 border-slate-200 pl-4">
                    {feature.description}
                </p>
            </div>
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

const featureColors = [
    "bg-[#FF9F1C]",
    "bg-[#06D6A0]",
    "bg-[#EF476F]",
    "bg-[#118AB2]"
]

const featureIcons = [
    "⚡",
    "🔔",
    "💳",
    "📊"
]
