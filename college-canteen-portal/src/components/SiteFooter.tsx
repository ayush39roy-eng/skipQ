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
    'border-t-2 border-black bg-[#F9F4EF] text-black',
    className
  ]
    .filter(Boolean)
    .join(' ')

  const telHref = CONTACT_INFO.phone.replace(/[^+\d]/g, '')

  return (
    <footer className={footerClass}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 text-sm md:grid-cols-2 md:items-start">
          <section className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-gray-500">Contact</p>
            <div className="space-y-1">
              <p className="text-base font-bold tracking-tight">{CONTACT_INFO.name}</p>
              <p className="text-[13px] font-medium leading-relaxed text-gray-600">{CONTACT_INFO.address}</p>
            </div>
            <div className="flex flex-col gap-1 text-sm font-bold sm:flex-row sm:flex-wrap sm:gap-4">
              <a href={`mailto:${CONTACT_INFO.email}`} className="hover:underline">
                {CONTACT_INFO.email}
              </a>
              <a href={`tel:${telHref}`} className="hover:underline">
                {CONTACT_INFO.phone}
              </a>
            </div>
          </section>
          <section className="space-y-2 text-sm md:items-end md:text-right">
            <span className="text-[11px] font-black uppercase tracking-[0.35em] text-gray-500">Legal</span>
            <ul className="space-y-2 font-bold">
              {[{ href: '/privacy-policy', label: 'Privacy Policy' }, { href: '/terms-and-conditions', label: 'Terms & Conditions' }, { href: '/cancellation-refund', label: 'Cancellation & Refund Policy' }].map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black underline-offset-4 hover:underline"
                    prefetch={false}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <div className="border-t-2 border-black bg-white px-6 py-3 text-center text-xs font-bold text-gray-500">
        © 2025 AYUSH ROY. All rights reserved.
      </div>
    </footer>
  )
}
