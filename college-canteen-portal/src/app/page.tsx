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

const journey = [
  { step: '01', title: 'Discover canteens', text: 'Filter by cuisine, wait time or diet preference.' },
  { step: '02', title: 'Order & pay online', text: 'Secure checkout with saved favourites and group carts.' },
  { step: '03', title: 'Pick up without queues', text: 'Smart notifications let you collect right on time.' }
]

export default async function HomePage() {
  const session = await getSession()
  const quickLinks = [
    { label: 'Browse menus', href: '/canteens', description: 'Find something delicious in seconds.' },
    { label: 'Vendor hub', href: '/vendor', description: 'Manage prep times and live orders.', requireRole: 'VENDOR' as const },
    { label: 'Admin overview', href: '/admin', description: 'Monitor all outlets and KPIs.', requireRole: 'ADMIN' as const }
  ].filter(link => !link.requireRole || link.requireRole === session?.role)

  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-gradient-to-br from-sky-500/20 via-purple-500/10 to-transparent px-8 py-10 shadow-[0_25px_70px_-35px_rgba(15,118,255,0.6)]">
        <div className="absolute inset-y-0 right-0 w-1/2 opacity-40 blur-3xl" aria-hidden>
          <div className="h-full w-full bg-gradient-to-br from-sky-400/40 to-emerald-400/20" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-200">
              New • 2025 rollout
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                Skip queues. Delight hungry students.
              </h1>
              <p className="text-base text-white/80 sm:text-lg">
                The SkipQ Canteen Portal unifies ordering, payments and vendor workflows so campus dining feels instant, transparent and human.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/canteens" className="btn px-6 py-3 text-base">
                Start Ordering
              </Link>
              <Link href="/register" className="btn-secondary px-6 py-3 text-base">
                Become a Vendor
              </Link>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-white/80 sm:grid-cols-3">
              <div>
                <dt className="text-sm uppercase tracking-wide text-white/60">Orders processed</dt>
                <dd className="text-2xl font-bold">52k+</dd>
              </div>
              <div>
                <dt className="text-sm uppercase tracking-wide text-white/60">Avg pickup time</dt>
                <dd className="text-2xl font-bold">6 min</dd>
              </div>
              <div>
                <dt className="text-sm uppercase tracking-wide text-white/60">Vendors onboarded</dt>
                <dd className="text-2xl font-bold">38</dd>
              </div>
            </dl>
          </div>
          <div className="flex-1 rounded-2xl border border-white/10 bg-[rgb(var(--bg))]/90 p-6 backdrop-blur">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Today&apos;s flow</h2>
            <ul className="space-y-4">
              {journey.map((item) => (
                <li key={item.step} className="flex items-start gap-4">
                  <span className="text-sm font-mono text-white/60">{item.step}</span>
                  <div>
                    <p className="text-base font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-white/70">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {session && (
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-alt))] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-[rgb(var(--text-muted))]">Welcome back</p>
              <h2 className="text-2xl font-bold text-[rgb(var(--text))]">{session.user.name}</h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">You&apos;re signed in as {session.role.toLowerCase()}.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickLinks.map(link => (
                <Link key={link.href} href={link.href} className="btn-secondary px-4 py-2 text-sm">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        {features.map(feature => (
          <article key={feature.title} className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-alt))] p-6 transition hover:border-sky-400/60 hover:bg-sky-400/10">
            <div className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              {feature.accent}
            </div>
            <h3 className="text-xl font-semibold text-[rgb(var(--text))]">{feature.title}</h3>
            <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">{feature.description}</p>
          </article>
        ))}
      </section>

      {!session && (
        <section className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--bg-alt))]/60 p-6 text-center">
          <p className="text-sm uppercase tracking-[0.5em] text-[rgb(var(--text-muted))]">Get started</p>
          <h2 className="mt-2 text-2xl font-bold text-[rgb(var(--text))]">Create an account to skip queues</h2>
          <p className="mt-2 text-[rgb(var(--text-muted))]">Sign in with your campus email to unlock personalised menus, loyalty perks and seamless checkout.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn px-5 py-2.5">Login</Link>
            <Link href="/auth/register" className="btn-secondary px-5 py-2.5">Create account</Link>
          </div>
        </section>
      )}
    </div>
  )
}
