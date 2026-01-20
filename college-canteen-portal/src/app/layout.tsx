import './globals.css'
import { getSession } from '@/lib/session'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from "@vercel/speed-insights/next"
import SiteShell from '@/components/SiteShell'

export const metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://skipq.vercel.app'),
    title: {
      default: 'SkipQ - College Canteen Ordering',
      template: '%s | SkipQ'
    },
    description: 'Skip the queue at your college canteen. Pre-order food, track live status, and pay online. The smartest way to eat on campus.',
    keywords: ['college canteen', 'food ordering', 'skip queue', 'campus food', 'skipq'],
    authors: [{ name: 'SkipQ Team' }],
    creator: 'SkipQ',
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      title: 'SkipQ - College Canteen Ordering',
      description: 'Order food from your college canteen without standing in line.',
      siteName: 'SkipQ',
      images: [
        {
          url: '/brand-logo.png',
          width: 512,
          height: 512,
          alt: 'SkipQ Logo',
        },
      ],
    },
    twitter: {
      card: 'summary',
      title: 'SkipQ',
      description: 'Skip the queue at your college canteen.',
      images: ['/brand-logo.png'],
      creator: '@skipq',
    },
    icons: {
        icon: '/brand-logo.png',
        apple: '/brand-logo.png',
    },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession()
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="bg-[rgb(var(--bg))]">
                <SiteShell userRole={session?.role}>
                    {children}
                </SiteShell>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    )
}
