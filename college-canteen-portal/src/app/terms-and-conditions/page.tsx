import Link from 'next/link'

export const metadata = { title: 'Terms & Conditions — College Canteen Portal' }

const lastUpdated = '19 November 2025'

const sections = [
  {
    title: '1. Eligibility & Accounts',
    body: [
      'By accessing the SkipQ College Canteen Portal you confirm that you are at least 13 years old and authorized to accept these Terms.',
      'You must keep credentials confidential and remain responsible for all actions performed through your account.'
    ]
  },
  {
    title: '2. Platform Role',
    body: [
      'SkipQ offers the ordering interface, vendor dashboards, and payment link generation for campus canteens.',
      'Food preparation, availability, and service quality are managed solely by the participating vendor.'
    ]
  },
  {
    title: '3. Ordering & Payments',
    body: [
      'Orders are confirmed after payment authorization via supported gateways (UPI, cards, net banking).',
      'Payment disputes, chargebacks, or settlement timelines remain subject to the relevant banking partners.'
    ]
  },
  {
    title: '4. Fees & Taxes',
    body: [
      'Menu pricing may include campus taxes or convenience fees which are disclosed before checkout.',
      'SkipQ service/convenience fees support infrastructure costs and are non-refundable unless a platform error is validated.'
    ]
  },
  {
    title: '5. Cancellations & Refunds',
    body: [
      'Cancellation requests must reach the vendor before the order is marked Preparing, Ready, or Dispatched.',
      'Refund decisions and timelines follow the standalone Cancellation & Refund Policy linked below.'
    ]
  },
  {
    title: '6. Vendor Obligations',
    body: [
      'Vendors must maintain accurate menus, allergen info, and prep times visible to students.',
      'Vendors are solely responsible for hygiene, fulfilment, and resolving product-quality issues.'
    ]
  },
  {
    title: '7. User Conduct',
    body: [
      'Users must not attempt unauthorized access, exploit vulnerabilities, or automate abusive traffic.',
      'Harassment of vendors, admins, or support staff through chat/notes may result in immediate suspension.'
    ]
  },
  {
    title: '8. Data & Privacy',
    body: [
      'Operational data (queue status, wait times) may be shared with vendors to improve service.',
      'Personal information is collected and processed in line with the SkipQ Privacy Policy.'
    ]
  },
  {
    title: '9. Downtime & Liability',
    body: [
      'SkipQ targets >99% uptime but may schedule maintenance or experience outages beyond its control.',
      'SkipQ is not liable for indirect or consequential damages; liability is capped at the amount paid for the affected order.'
    ]
  },
  {
    title: '10. Updates & Governing Law',
    body: [
      'We may update these Terms when regulations change or when new product capabilities launch; continued use means acceptance.',
      'These Terms are governed by the laws of India with disputes subject to competent courts in Ghaziabad, Uttar Pradesh.'
    ]
  },
  {
    title: '11. Contact',
    body: [
      'Support email: skipq39@gmail.com',
      'Phone: +91 83839 34397'
    ]
  }
]

export default function TermsAndConditionsPage() {
  return (
    <section className="prose prose-invert max-w-3xl py-8">
      <h1>Terms &amp; Conditions</h1>
      <p className="text-sm text-[rgb(var(--text-muted))]">Last updated: {lastUpdated}</p>
      <p>These Terms explain the obligations of students, vendors, and administrators when they access ordering, billing, and fulfilment tools on SkipQ.</p>
      {sections.map(section => (
        <div key={section.title}>
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <ul className="ml-5 list-disc space-y-1">
            {section.body.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-sm text-[rgb(var(--text-muted))]">
        For more details read our{' '}
        <Link href="/cancellation-refund" className="underline-offset-4 hover:underline">Cancellation &amp; Refund Policy</Link>{' '}
        and{' '}
        <Link href="/privacy-policy" className="underline-offset-4 hover:underline">Privacy Policy</Link>. You can always contact support at skipq39@gmail.com.
      </p>
    </section>
  )
}
