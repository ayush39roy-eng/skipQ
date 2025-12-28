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

  // Fetch real statistics
  // const [totalOrders, vendorCount, avgPrepData] = await Promise.all([
  //   prisma.order.count(),
  //   prisma.vendor.count(),
  //   prisma.order.aggregate({
  //     where: {
  //       prepMinutes: { not: null }
  //     },
  //     _avg: {
  //       prepMinutes: true
  //     }
  //   })
  // ])

  // const avgPrepTime = avgPrepData._avg.prepMinutes 
  //   ? Math.round(avgPrepData._avg.prepMinutes) 
  //   : 0

  // // Format order count
  // const formatOrderCount = (count: number) => {
  //   if (count >= 1000) {
  //     return `${(count / 1000).toFixed(1)}k+`
  //   }
  //   return count.toString()
  // }

  const quickLinks = [
    { label: 'Browse menus', href: '/canteens', description: 'Find something delicious in seconds.' },
    { label: 'Vendor hub', href: '/vendor', description: 'Manage prep times and live orders.', requireRole: 'VENDOR' as const },
    { label: 'Admin overview', href: '/admin', description: 'Monitor all outlets and KPIs.', requireRole: 'ADMIN' as const }
  ].filter(link => !link.requireRole || link.requireRole === session?.role)

  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-3xl border-2 border-black bg-gradient-to-br from-brand-primary to-brand-secondary px-5 py-8 shadow-game-md sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-20 blur-3xl lg:block" aria-hidden>
          <div className="h-full w-full bg-gradient-to-br from-white to-brand-accent" />
        </div>
        <div className="relative flex flex-col items-center gap-6 text-center">
          <div className="max-w-3xl space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
                Hungry and have your work due? Preorder and skip the queue.
              </h1>

            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/canteens" className="game-btn text-lg">
                Start Ordering
              </Link>
              <Link href="/register" className="inline-flex items-center justify-center font-bold text-black border-2 border-black bg-white shadow-game-sm hover:shadow-game-md hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-game-sm transition-all px-8 py-3 rounded-lg text-lg">
                Become a Vendor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {session && (
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-alt))] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-[rgb(var(--text-muted))]">Welcome back</p>
              <h2 className="text-2xl font-bold text-[rgb(var(--text))]">{session.user.name}</h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">You&apos;re signed in as {session.role.toLowerCase()}.</p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              {quickLinks.map(link => (
                <Link key={link.href} href={link.href} className="btn-secondary w-full px-4 py-2 text-sm sm:w-auto">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        {features.map(feature => (
          <article key={feature.title} className="game-card group rounded-xl p-6 transition">
            <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-black">
              <span className="h-2 w-2 rounded-full bg-brand-primary border border-black" />
              {feature.accent}
            </div>
            <h3 className="text-xl font-bold text-black">{feature.title}</h3>
            <p className="mt-2 text-sm font-medium text-gray-600">{feature.description}</p>
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
            <Link href="/register" className="btn-secondary px-5 py-2.5">Create account</Link>
          </div>
        </section>
      )}
    </div>
  )
}
