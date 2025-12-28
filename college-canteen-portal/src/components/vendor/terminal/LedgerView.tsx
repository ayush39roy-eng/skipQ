'use client'

import { useState, useMemo, ChangeEvent } from 'react'
import { LedgerEntry } from '@/types/vendor'

type FilterType = 'ALL' | 'SALE' | 'REFUND'

function isFilterType(val: string): val is FilterType {
  return val === 'ALL' || val === 'SALE' || val === 'REFUND'
}

interface LedgerViewProps {
  entries: LedgerEntry[]
}

export function LedgerView({ entries }: LedgerViewProps) {
  const [period, setPeriod] = useState<'TODAY' | 'MONTH' | 'ALL'>('TODAY')
  const [filterType, setFilterType] = useState<FilterType>('ALL')

  // Filter Logic
  const filteredEntries = useMemo(() => {
    let res = entries
    const now = new Date()
    
    // Period Filter
    if (period === 'TODAY') {
      res = res.filter(e => 
        e.timestamp.getDate() === now.getDate() && 
        e.timestamp.getMonth() === now.getMonth() &&
        e.timestamp.getFullYear() === now.getFullYear()
      )
    } else if (period === 'MONTH') {
       res = res.filter(e => 
        e.timestamp.getMonth() === now.getMonth() &&
        e.timestamp.getFullYear() === now.getFullYear()
      )
    }

    // Type Filter
    if (filterType !== 'ALL') {
      res = res.filter(e => e.type === filterType)
    }

    return res.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [entries, period, filterType])

  // Summary Stats
  const stats = useMemo(() => {
    const totalSales = filteredEntries
        .filter(e => e.type === 'SALE')
        .reduce((sum, e) => sum + e.amountCents, 0)
        
    const totalRefunds = filteredEntries
        .filter(e => e.type === 'REFUND')
        .reduce((sum, e) => sum + Math.abs(e.amountCents), 0)

    return {
        net: totalSales - totalRefunds,
        count: filteredEntries.length
    }
  }, [filteredEntries])
  
  // Export Handler
  const handleExport = () => {
    if (filteredEntries.length === 0) return

    // 1. Define Headers
    const headers = ['Order ID', 'Date', 'Time', 'Type', 'Description', 'Source', 'Payment Mode', 'Amount (INR)']
    
    // 2. Format Data
    const csvContent = [
      headers.join(','),
      ...filteredEntries.map(e => {
        const date = e.timestamp.toLocaleDateString()
        const time = e.timestamp.toLocaleTimeString()
        const amount = (e.amountCents / 100).toFixed(2)
        const type = e.type === 'REFUND' ? 'Refund' : 'Sale'
        // Escape description for CSV safety (wrap in quotes if contains comma)
        const description = `"${e.description.replace(/"/g, '""')}"`
        
        return [
          e.orderId,
          date,
          time,
          type,
          description,
          e.source,
          e.paymentMode,
          e.type === 'REFUND' ? `-${amount}` : amount
        ].join(',')
      })
    ].join('\n')

    // 3. Create Blob and Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `ledger_export_${period.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col h-full bg-vendor-bg">
      {/* Header / Controls */}
      <div className="bg-vendor-surface border-b border-vendor-border px-6 py-4 flex justify-between items-center shadow-sm">
         <h2 className="text-lg font-bold text-vendor-text-primary tracking-tight">Ledger</h2>
         
         <div className="flex gap-2">
            <div className="flex bg-vendor-bg p-1 rounded-lg border border-vendor-border">
               {(['TODAY', 'MONTH', 'ALL'] as const).map(p => (
                  <button
                     key={p}
                     onClick={() => setPeriod(p)}
                     className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                        period === p 
                           ? 'bg-white text-vendor-text-primary shadow-sm' 
                           : 'text-vendor-text-secondary hover:text-vendor-text-primary'
                     }`}
                  >
                     {p}
                  </button>
               ))}
            </div>
            
            <select 
               className="bg-vendor-surface border border-vendor-border text-vendor-text-primary text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-vendor-accent"
               value={filterType}
               onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  const val = e.target.value
                  if (isFilterType(val)) {
                     setFilterType(val)
                  }
               }}
            >
               <option value="ALL">All Types</option>
               <option value="SALE">Sales Only</option>
               <option value="REFUND">Refunds Only</option>
            </select>
            
            <button 
                onClick={handleExport}
                disabled={filteredEntries.length === 0}
                className="flex items-center gap-2 bg-vendor-accent text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
               Export
            </button>
         </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 px-6 py-4">
         <div className="bg-vendor-surface p-4 rounded-xl border border-vendor-border shadow-sm">
            <div className="text-xs text-vendor-text-secondary font-bold uppercase tracking-wide mb-1">Total Transactions</div>
            <div className="text-2xl font-black text-vendor-text-primary">{stats.count}</div>
         </div>
         <div className="bg-vendor-surface p-4 rounded-xl border border-vendor-border shadow-sm">
            <div className="text-xs text-vendor-text-secondary font-bold uppercase tracking-wide mb-1">Net Revenue</div>
            <div className="text-2xl font-black text-vendor-success font-mono">₹{(stats.net / 100).toFixed(2)}</div>
         </div>
      </div>

      {/* Table */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
         <div className="h-full bg-vendor-surface rounded-xl border border-vendor-border shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1">
               <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-vendor-text-secondary uppercase bg-vendor-bg font-bold sticky top-0 z-10 border-b border-vendor-border">
                     <tr>
                        <th className="px-6 py-3">Time</th>
                        <th className="px-6 py-3">Order ID</th>
                        <th className="px-6 py-3">Details</th>
                        <th className="px-6 py-3">Source</th>
                        <th className="px-6 py-3">Payment</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-vendor-divider">
                     {filteredEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-vendor-bg/50 transition-colors">
                           <td className="px-6 py-3 font-mono text-vendor-text-secondary text-xs">
                              {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </td>
                           <td className="px-6 py-3 font-medium text-vendor-text-primary font-mono text-xs">
                              #{entry.orderId.slice(-4).toUpperCase()}
                           </td>
                           <td className="px-6 py-3 text-vendor-text-secondary">
                              {entry.description}
                           </td>
                           <td className="px-6 py-3">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                 entry.source === 'ONLINE' ? 'bg-blue-50 text-blue-600' : 'bg-vendor-bg text-vendor-text-secondary'
                              }`}>
                                 {entry.source}
                              </span>
                           </td>
                           <td className="px-6 py-3 text-xs font-medium text-vendor-text-secondary uppercase">
                              {entry.paymentMode}
                           </td>
                           <td className={`px-6 py-3 text-right font-mono font-bold ${
                              entry.type === 'REFUND' ? 'text-vendor-danger' : 'text-vendor-text-primary'
                           }`}>
                              {entry.type === 'REFUND' ? '-' : ''}₹{Math.abs(entry.amountCents / 100).toFixed(2)}
                           </td>
                        </tr>
                     ))}
                     {filteredEntries.length === 0 && (
                        <tr>
                           <td colSpan={6} className="px-6 py-12 text-center text-vendor-text-muted text-sm">
                              No records found for this period.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  )
}
