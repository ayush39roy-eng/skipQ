import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — College Canteen Portal' }

const lastUpdated = '18 November 2025'

const sections = [
  {
    title: '1. Information We Collect',
    body: [
      'Personal Information: Name, email address, phone number, or any details you provide through contact forms.',
      'Automatic Data: IP address, browser type, device information, and pages visited.'
    ]
  },
  {
    title: '2. How We Use Your Information',
    body: [
      'Respond to your inquiries or messages.',
      'Improve our website and user experience.',
      'Provide updates, if you subscribe to them.',
      'Maintain security and prevent fraud.'
    ]
  },
  {
    title: '3. Sharing of Information',
    body: [
      'We do not sell, trade, or rent your personal information.',
      'We may share data only with trusted service providers (hosting, analytics) or authorities if required by law.'
    ]
  },
  {
    title: '4. Cookies',
    body: [
      'Our website may use cookies to improve loading speed, remember user preferences, and analyze traffic.',
      'You can disable cookies in your browser at any time.'
    ]
  },
  {
    title: '5. Data Protection',
    body: [
      'We follow industry-standard security measures to protect your information.',
      'However, no internet transmission is 100% secure, so we cannot guarantee absolute safety.'
    ]
  },
  {
    title: '6. Your Rights',
    body: [
      'You can request to access your personal data, correct inaccurate information, or delete your information.',
      'Contact us at skipq39@gmail.com for any such requests.'
    ]
  },
  {
    title: '7. Changes to This Policy',
    body: [
      'We may update this Privacy Policy occasionally.',
      'Changes will be posted on this page with the updated date.'
    ]
  },
  {
    title: '8. Contact Us',
    body: ['If you have questions about this Privacy Policy, contact us at skipq39@gmail.com.']
  }
]

export default function PrivacyPolicyPage() {
  return (
    <section className="prose prose-invert max-w-3xl py-8">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-[rgb(var(--text-muted))]">Last updated: {lastUpdated}</p>
      <p>This Privacy Policy explains how we collect, use, and protect your information when you use our website.</p>
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
        For cancellations or refunds, please review our{' '}
        <Link href="/cancellation-refund" className="underline-offset-4 hover:underline">Cancellation &amp; Refund Policy</Link>.
      </p>
    </section>
  )
}

