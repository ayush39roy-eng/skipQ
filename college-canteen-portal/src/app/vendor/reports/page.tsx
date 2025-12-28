import ReportsClient from './ReportsClient'

export default function VendorReportsPage() {
  return (
    <div className="flex-1 p-8 bg-vendor-bg text-vendor-text-primary">
       <div className="max-w-5xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-vendor-text-primary">Reports & Insights</h1>
            <p className="text-vendor-text-secondary mt-2">Deep dive into your sales, growth and product performance.</p>
          </header>
          
          <ReportsClient />
       </div>
    </div>
  )
}
