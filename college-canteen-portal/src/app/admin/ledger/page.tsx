'use client'

import { useState, useEffect } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Calendar, Filter, Lock, Download, ChevronDown } from 'lucide-react'

/**
 * Ledger View Page
 * 
 * Read-only view of all ledger entries.
 * IMMUTABLE - No edits, no deletes.
 */

type LedgerEntry = {
  id: string
  timestamp: string
  vendorId: string
  vendorName: string
  type: string
  grossAmount: number
  taxAmount: number
  platformFee: number
  netAmount: number
  settlementStatus: string
  settlementBatchId: string | null
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 100,
    offset: 0,
    hasMore: false
  })
  const [filters, setFilters] = useState({
    vendorId: '',
    startDate: '',
    endDate: '',
    settlementStatus: '',
    entryType: ''
  })

  useEffect(() => {
    fetchLedger(true)
  }, [filters])

  const fetchLedger = async (reset = false) => {
    if (reset) {
      setLoading(true)
      setPagination(prev => ({ ...prev, offset: 0 }))
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams()
      if (filters.vendorId) params.append('vendorId', filters.vendorId)
      if (filters.startDate) params.append('start', filters.startDate)
      if (filters.endDate) params.append('end', filters.endDate)
      if (filters.settlementStatus) params.append('settlementStatus', filters.settlementStatus)
      if (filters.entryType) params.append('type', filters.entryType)
      
      const currentOffset = reset ? 0 : pagination.offset
      params.append('limit', pagination.limit.toString())
      params.append('offset', currentOffset.toString())

      const response = await fetch(`/api/admin/ledger?${params}`)
      const data = await response.json()
      
      if (reset) {
        setEntries(data.entries || [])
      } else {
        setEntries(prev => [...prev, ...(data.entries || [])])
      }
      
      setPagination({
        total: data.pagination?.total || 0,
        limit: data.pagination?.limit || 100,
        offset: currentOffset + (data.entries?.length || 0),
        hasMore: data.pagination?.hasMore || false
      })
    } catch (error) {
      console.error('Failed to fetch ledger:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    fetchLedger(false)
  }

  const columns = [
    {
      key: 'id',
      header: 'Entry ID',
      render: (entry: LedgerEntry) => (
        <span className="font-mono text-xs text-slate-500">#{entry.id.substring(0, 8)}</span>
      )
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (entry: LedgerEntry) => (
        <span className="text-sm text-slate-600">
          {new Date(entry.timestamp).toLocaleDateString()}
          <span className="text-slate-400 ml-1">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </span>
      )
    },
    {
      key: 'vendorName',
      header: 'Vendor',
      render: (entry: LedgerEntry) => (
        <span className="font-medium text-slate-900">{entry.vendorName}</span>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (entry: LedgerEntry) => <StatusBadge status={entry.type} />
    },
    {
      key: 'grossAmount',
      header: 'Gross',
      align: 'right' as const,
      render: (entry: LedgerEntry) => (
        <span className="font-mono text-slate-600">₹{(entry.grossAmount / 100).toFixed(2)}</span>
      )
    },
    {
      key: 'platformFee',
      header: 'Platform Fee',
      align: 'right' as const,
      render: (entry: LedgerEntry) => (
        <span className="font-mono text-slate-500">₹{(entry.platformFee / 100).toFixed(2)}</span>
      )
    },
    {
      key: 'netAmount',
      header: 'Net Vendor',
      align: 'right' as const,
      render: (entry: LedgerEntry) => (
        <span className={entry.type === 'REFUND' ? "font-mono text-rose-600 font-medium" : "font-mono text-emerald-600 font-medium"}>
          {entry.type === 'REFUND' ? '-' : ''}₹{(entry.netAmount / 100).toFixed(2)}
        </span>
      )
    },
    {
      key: 'settlementStatus',
      header: 'Settlement',
      render: (entry: LedgerEntry) => <StatusBadge status={entry.settlementStatus} />
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">Immutable ledger entries ({pagination.total} total)</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-amber-900">Read-Only Ledger</h3>
          <p className="text-sm text-amber-700 mt-1">
            Ledger entries cannot be edited or deleted. This is the source of truth for all financial transactions.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={filters.settlementStatus}
              onChange={(e) => setFilters({ ...filters, settlementStatus: e.target.value })}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
            >
              <option value="">All Settlement Status</option>
              <option value="UNSETTLED">Unsettled</option>
              <option value="SETTLED">Settled</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={filters.entryType}
              onChange={(e) => setFilters({ ...filters, entryType: e.target.value })}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
            >
              <option value="">All Entry Types</option>
              <option value="SALE">Sale</option>
              <option value="REFUND">Refund</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={entries}
            emptyMessage="No ledger entries found"
          />
          
          {/* Load More Button */}
          {pagination.hasMore && (
            <div className="flex justify-center pt-4 pb-8">
              <button 
                onClick={loadMore} 
                className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : `Load More (${entries.length} of ${pagination.total})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
