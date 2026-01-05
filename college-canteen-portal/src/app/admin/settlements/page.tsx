'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Plus, Banknote, Calendar, Download, X } from 'lucide-react'

/**
 * Settlements Page
 * 
 * Generate settlement batches and view existing settlements.
 */

type SettlementBatch = {
  id: string
  vendorId: string
  vendorName: string
  periodStartDate: string
  periodEndDate: string
  totalVendorPayable: number
  totalOrders: number
  status: 'CREATED' | 'EXPORTED'
  createdAt: string
}

export default function SettlementsPage() {
  const router = useRouter()
  const [settlements, setSettlements] = useState<SettlementBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerateModal, setShowGenerateModal] = useState(false)

  useEffect(() => {
    fetchSettlements()
  }, [])

  const fetchSettlements = async () => {
    try {
      const response = await fetch('/api/admin/settlements')
      const data = await response.json()
      setSettlements(data.batches || [])
    } catch (error) {
      console.error('Failed to fetch settlements:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      key: 'id',
      header: 'Settlement ID',
      render: (batch: SettlementBatch) => (
        <span className="font-mono text-xs text-slate-500">#{batch.id.substring(0, 8)}</span>
      )
    },
    {
      key: 'vendorName',
      header: 'Vendor',
      render: (batch: SettlementBatch) => (
        <span className="font-medium text-slate-900">{batch.vendorName}</span>
      )
    },
    {
      key: 'period',
      header: 'Period',
      render: (batch: SettlementBatch) => (
        <div className="flex items-center gap-1.5 text-slate-600 text-sm">
          <Calendar className="h-3 w-3 text-slate-400" />
          <span>{new Date(batch.periodStartDate).toLocaleDateString()}</span>
          <span className="text-slate-300 mx-1">→</span>
          <span>{new Date(batch.periodEndDate).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      key: 'totalOrders',
      header: 'Orders',
      align: 'right' as const,
      render: (batch: SettlementBatch) => (
        <span className="font-mono text-slate-600">{batch.totalOrders}</span>
      )
    },
    {
      key: 'totalVendorPayable',
      header: 'Payable Amount',
      align: 'right' as const,
      render: (batch: SettlementBatch) => (
        <span className="font-mono text-slate-900 font-medium">₹{(batch.totalVendorPayable / 100).toFixed(2)}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (batch: SettlementBatch) => <StatusBadge status={batch.status} />
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (batch: SettlementBatch) => (
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              window.open(`/api/admin/settlements/${batch.id}/export?format=bank`, '_blank')
            }}
          >
            <Download className="h-3 w-3" />
            Export CSV
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settlements & Payouts</h1>
          <p className="text-sm text-slate-500 mt-1">Generate settlement batches for vendor payouts</p>
        </div>
        <button 
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Generate Settlement</span>
        </button>
      </div>

      {/* Settlements Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <DataTable
            columns={columns}
            data={settlements}
            onRowClick={(batch) => router.push(`/admin/settlements/${batch.id}`)}
            emptyMessage="No settlements found. Generate your first settlement batch."
          />
        </div>
      )}

      {/* Generate Settlement Modal */}
      {showGenerateModal && (
        <GenerateSettlementModal
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => {
            setShowGenerateModal(false)
            fetchSettlements()
          }}
        />
      )}
    </div>
  )
}

function GenerateSettlementModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [vendorId, setVendorId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [vendors, setVendors] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/vendors')
      .then(res => res.json())
      .then(data => setVendors(data.vendors || []))
  }, [])

  const handleGenerate = async () => {
    if (!vendorId || !startDate || !endDate) {
      setError('Please fill in all fields')
      return
    }

    setGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/admin/settlements/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          periodStartDate: new Date(startDate).toISOString(),
          periodEndDate: new Date(endDate).toISOString()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate settlement')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate settlement')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Generate Settlement Batch</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select vendor and date range for settlement</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Vendor</label>
            <select 
              value={vendorId} 
              onChange={(e) => setVendorId(e.target.value)} 
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            >
              <option value="">Select vendor...</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-600 font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button 
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            onClick={handleGenerate} 
            disabled={generating}
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Banknote className="h-4 w-4" />
                <span>Generate Settlement</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
