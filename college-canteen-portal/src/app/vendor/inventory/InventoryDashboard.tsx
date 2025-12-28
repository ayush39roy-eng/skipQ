'use client'

import { VendorCard } from '@/components/vendor/ui/VendorCard'
import { VendorButton } from '@/components/vendor/ui/VendorButton'
import { VendorInput } from '@/components/vendor/ui/VendorInput'

type InventoryItem = {
  id: string
  name: string
  quantity: number
  unit: string
  minThreshold: number
}

export default function InventoryDashboard({ items }: { items: InventoryItem[] }) {
  const lowStockCount = items.filter(i => i.quantity <= i.minThreshold).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <VendorButton size="lg">+ Add New Item</VendorButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <VendorCard>
          <div className="text-sm text-[var(--vendor-text-secondary)]">Total Items</div>
          <div className="text-3xl font-bold">{items.length}</div>
        </VendorCard>
        <VendorCard>
          <div className="text-sm text-[var(--vendor-text-secondary)]">Low Stock Alerts</div>
          <div className="text-3xl font-bold text-[var(--vendor-danger)]">
            {lowStockCount}
          </div>
        </VendorCard>
        <VendorCard>
          <div className="text-sm text-[var(--vendor-text-secondary)]">Pending Orders</div>
          <div className="text-3xl font-bold">0</div>
        </VendorCard>
      </div>

      {/* Main Table */}
      <VendorCard className="overflow-hidden p-0">
        <div className="border-b border-[var(--vendor-border)] p-4 flex gap-4">
             <VendorInput placeholder="Search inventory..." className="max-w-md" />
             <div className="flex gap-2">
                <VendorButton variant="outline" size="sm">Filter</VendorButton>
                <VendorButton variant="outline" size="sm">Export CSV</VendorButton>
             </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--vendor-bg)] text-[var(--vendor-text-secondary)]">
              <tr>
                <th className="px-6 py-3 font-medium">Item Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Stock Level</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--vendor-border)]">
              {items.length === 0 ? (
                 <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-[var(--vendor-text-secondary)]">
                       No inventory items found. Add some to get started.
                    </td>
                 </tr>
              ) : (
                  items.map((item) => {
                    const isLow = item.quantity <= item.minThreshold
                    return (
                      <tr key={item.id} className="hover:bg-[var(--vendor-surface-muted)]">
                        <td className="px-6 py-4 font-medium">{item.name}</td>
                        <td className="px-6 py-4">
                          {isLow ? (
                             <span className="inline-flex items-center rounded-full bg-[var(--vendor-danger)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--vendor-danger)]">
                               Low Stock
                             </span>
                          ) : (
                             <span className="inline-flex items-center rounded-full bg-[var(--vendor-success)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--vendor-success)]">
                               Healthy
                             </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          {item.quantity} <span className="text-[var(--vendor-text-secondary)]">{item.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <VendorButton size="sm" variant="secondary">Restock</VendorButton>
                        </td>
                      </tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
      </VendorCard>
    </div>
  )
}
