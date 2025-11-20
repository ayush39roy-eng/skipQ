export const metadata = { title: 'Cancellation & Refund Policy — College Canteen Portal' }

const lastUpdated = '18 November 2025'

const sections = [
  {
    title: '1. Scope',
    body: [
      'This policy covers orders placed through the College Canteen Portal web and mobile experiences.',
      'The vendor is responsible for order preparation while SkipQ facilitates ordering, payments and notifications.'
    ]
  },
  {
    title: '2. Cancellation Window',
    body: [
      'Cancellations are allowed only before the vendor begins preparing the order.',
      'Once an order is marked as “Preparing”, “Ready” or “Dispatched”, the vendor may reject cancellation requests.'
    ]
  },
  {
    title: '3. Refund Eligibility',
    body: [
      'If the vendor approves the cancellation before preparation, the item amount becomes eligible for refund.',
      'Refunds are processed to the original payment method. Bank or payment gateway processing times (typically 5–7 business days) may apply.'
    ]
  },
  {
    title: '4. Service & Convenience Fees',
    body: [
      'Platform convenience or processing fees cover payment handling and notification costs and are non-refundable once the order is placed.',
      'Refunds cover only the vendor-collected portion unless a system error is confirmed by SkipQ support.'
    ]
  },
  {
    title: '5. Order Issues',
    body: [
      'If an order is not fulfilled after payment, contact SkipQ support within 24 hours with the order ID for investigation.',
      'In cases of duplicate charges or payment failures, proof of charge (transaction reference or screenshot) may be requested to expedite refunds.'
    ]
  },
  {
    title: '6. Contact',
    body: [
      'Email support: skipq39@gmail.com',
      'Phone support: +91 83839 34397'
    ]
  }
]

export default function CancellationRefundPolicyPage() {
  return (
    <section className="prose prose-invert max-w-3xl py-8">
      <h1>Cancellation &amp; Refund Policy</h1>
      <p className="text-sm text-[rgb(var(--text-muted))]">Last updated: {lastUpdated}</p>
      <p>These rules explain how cancellations are handled and when refunds are issued for orders placed via SkipQ.</p>
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
      <p className="text-sm text-[rgb(var(--text-muted))]">For unresolved billing disputes, please raise a ticket by emailing skipq39@gmail.com with your order ID.</p>
    </section>
  )
}
