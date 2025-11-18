import Link from 'next/link'

const CONTACT_INFO = {
  name: 'AYUSH ROY',
  address: 'S-2, D-6, Apartment, Shyam Park Ext, Sahibabad, Ghaziabad, Uttar Pradesh, 201005, India',
  email: 'skipq39@gmail.com',
  phone: '+91-XXXXXXXXXX' // TODO: replace with the official phone number
}

type SiteFooterProps = { className?: string }

export function SiteFooter({ className }: SiteFooterProps = {}) {
  const footerClass = [
    'border-t border-[rgb(var(--border))] bg-[rgb(var(--bg-alt))] text-[rgb(var(--text))]',
    className
  ]
    .filter(Boolean)
    .join(' ')

  const telHref = CONTACT_INFO.phone.replace(/[^+\d]/g, '')

  return (
    <footer className={footerClass}>
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="grid gap-4 text-sm md:grid-cols-2 md:items-start">
          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-muted))]">Contact</p>
            <div className="space-y-1">
              <p className="text-base font-semibold tracking-tight">{CONTACT_INFO.name}</p>
              <p className="text-[13px] leading-relaxed text-[rgb(var(--text-muted))]">{CONTACT_INFO.address}</p>
            </div>
            <div className="flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-4">
              <a href={`mailto:${CONTACT_INFO.email}`} className="hover:underline">
                {CONTACT_INFO.email}
              </a>
              <a href={`tel:${telHref}`} className="hover:underline">
                {CONTACT_INFO.phone}
              </a>
            </div>
          </section>
          <section className="flex flex-col justify-start space-y-2 text-sm md:items-end">
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-muted))]">Legal</span>
            <Link
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[rgb(var(--text))] underline-offset-4 hover:underline"
              prefetch={false}
            >
              Privacy Policy
            </Link>
          </section>
        </div>
      </div>
      <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))]/60 px-6 py-3 text-center text-xs text-[rgb(var(--text-muted))]">
        © 2025 AYUSH ROY. All rights reserved.
      </div>
    </footer>
  )
}
