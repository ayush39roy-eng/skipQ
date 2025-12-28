import './globals.css'
import { getSession } from '@/lib/session'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from "@vercel/speed-insights/next"
import SiteShell from '@/components/SiteShell'

export const metadata = {
    title: 'SkipQ',
    icons: {
        icon: '/skipq-logo.png',
        apple: '/skipq-logo.png',
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
