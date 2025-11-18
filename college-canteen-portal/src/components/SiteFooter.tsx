import Link from 'next/link'

const CONTACT_INFO = {
  name: 'AYUSH ROY',
  address: 'S-2, D-6, Apartment, Shyam Park Ext, Sahibabad, Ghaziabad, Uttar Pradesh, 201005, India',
  email: 'skipq39@gmail.com',
  phone: '+91-XXXXXXXXXX' // TODO: replace with the official phone number
}

export function SiteFooter() {
  return (
    <footer className="relative left-1/2 right-1/2 -ml-[50vw] w-screen border-t border-[rgb(var(--border))] bg-[rgb(var(--bg-alt))]/90 text-[rgb(var(--text))]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-6 py-10 md:flex-row md:items-start md:justify-between">
        <section className="max-w-xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">Contact</p>
          <p className="text-lg font-semibold">{CONTACT_INFO.name}</p>
          <p className="text-sm leading-relaxed text-[rgb(var(--text-muted))]">{CONTACT_INFO.address}</p>
          <div className="space-y-1 text-sm">
            <a href={`mailto:${CONTACT_INFO.email}`} className="text-[rgb(var(--text))] hover:underline">
              {CONTACT_INFO.email}
            </a>
            <div>
              <a href={`tel:${CONTACT_INFO.phone.replace(/[^+\d]/g, '')}`} className="text-[rgb(var(--text))] hover:underline">
                {CONTACT_INFO.phone}
              </a>
            </div>
          </div>
        </section>
        <section className="flex flex-col gap-2 text-sm md:items-end">
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
      <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))]/60 px-6 py-4 text-center text-xs text-[rgb(var(--text-muted))]">
        © 2025 AYUSH ROY. All rights reserved.
      </div>
    </footer>
  )
}
