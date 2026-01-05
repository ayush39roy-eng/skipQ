'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Search, Plus, Store } from 'lucide-react'

/**
 * Vendors List Page
 * 
 * CRITICAL SECTION: Vendor management overview.
 */

type Vendor = {
  id: string
  name: string
  status: 'ACTIVE' | 'SUSPENDED'
  mode: 'ORDERS_ONLY' | 'FULL_RMS'
  totalOrders: number
  totalGMV: number
  lastSettlementDate: string | null
}

export default function VendorsPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/admin/vendors')
      const data = await response.json()
      setVendors(data.vendors || [])
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const columns = [
    {
      key: 'name',
      header: 'Vendor Name',
      render: (vendor: Vendor) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Store className="h-4 w-4 text-slate-500" />
          </div>
          <span className="font-medium text-slate-900">{vendor.name}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (vendor: Vendor) => <StatusBadge status={vendor.status} />
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (vendor: Vendor) => <StatusBadge status={vendor.mode} variant="info" />
    },
    {
      key: 'totalOrders',
      header: 'Total Orders',
      align: 'right' as const,
      render: (vendor: Vendor) => (
        <span className="font-mono text-slate-600">{vendor.totalOrders}</span>
      )
    },
    {
      key: 'totalGMV',
      header: 'Total GMV',
      align: 'right' as const,
      render: (vendor: Vendor) => (
        <span className="font-mono text-slate-600 font-medium">₹{(vendor.totalGMV / 100).toFixed(2)}</span>
      )
    },
    {
      key: 'lastSettlementDate',
      header: 'Last Settlement',
      render: (vendor: Vendor) => 
        vendor.lastSettlementDate 
          ? <span className="text-slate-600">{new Date(vendor.lastSettlementDate).toLocaleDateString()}</span>
          : <span className="text-slate-400 italic">Never</span>
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendors</h1>
          <p className="text-sm text-slate-500 mt-1">Vendor management and configuration</p>
        </div>
        <button 
          onClick={() => router.push('/admin/vendors/new')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Vendor</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search vendors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
        />
      </div>

      {/* Vendors Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <DataTable
            columns={columns}
            data={filteredVendors}
            onRowClick={(vendor) => router.push(`/admin/vendors/${vendor.id}`)}
            emptyMessage="No vendors found"
          />
        </div>
      )}
    </div>
  )
}
