'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/admin/StatusBadge'

type SettlementDetail = {
  id: string
  vendorId: string
  vendorName: string
  periodStartDate: string
  periodEndDate: string
  totalFoodAmount: number
  totalTaxAmount: number
  totalPlatformFee: number
  totalVendorPayable: number
  totalOrders: number
  status: string
  createdAt: string
  exportedAt: string | null
  ledgerEntries: Array<{
    id: string
    orderId: string | null
    type: string
    timestamp: string
    grossAmount: number
    taxAmount: number
    platformFee: number
    netAmount: number
  }>
}

export default function SettlementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [settlement, setSettlement] = useState<SettlementDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettlement()
  }, [id])

  const fetchSettlement = async () => {
    try {
      const response = await fetch(`/api/admin/settlements/${id}`)
      const data = await response.json()
      
      if (!response.ok || !data.settlement) {
        console.error('Failed to fetch settlement:', data)
        throw new Error(data.error || 'Settlement not found')
      }
      
      setSettlement(data.settlement)
    } catch (error) {
      console.error('Failed to fetch settlement:', error)
      alert('Failed to load settlement details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading settlement details...</div>
  if (!settlement) return <div>Settlement not found</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settlement #{settlement.id.substring(0, 8)}</h1>
          <p className="page-subtitle">Settlement batch details and ledger entries</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => window.open(`/api/admin/settlements/${settlement.id}/export?format=excel`, '_blank')}
          >
            📊 Download Excel Report
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => window.open(`/api/admin/settlements/${settlement.id}/export?format=bank`, '_blank')}
          >
            💰 Bank Transfer CSV
          </button>
          {/* <button 
            className="btn btn-secondary" 
            onClick={() => window.open(`/api/admin/settlements/${settlement.id}/invoice`, '_blank')}
          >
            📄 Download Tax Invoice
          </button> */}
          <button className="btn btn-secondary" onClick={() => router.push('/admin/settlements')}>
            ← Back
          </button>
        </div>
      </div>

      {/* Settlement Info */}
      <section className="section">
        <h2 className="section-title">Settlement Information</h2>
        <div className="card">
          <div className="detail-row">
            <span className="detail-label">Settlement ID</span>
            <span className="detail-value mono">{settlement.id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Vendor</span>
            <span className="detail-value">{settlement.vendorName}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Period</span>
            <span className="detail-value">
              {new Date(settlement.periodStartDate).toLocaleDateString()} - {new Date(settlement.periodEndDate).toLocaleDateString()}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <StatusBadge status={settlement.status} />
          </div>
          <div className="detail-row">
            <span className="detail-label">Created</span>
            <span className="detail-value">{new Date(settlement.createdAt).toLocaleString()}</span>
          </div>
          {settlement.exportedAt && (
            <div className="detail-row">
              <span className="detail-label">Exported</span>
              <span className="detail-value">{new Date(settlement.exportedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </section>

      {/* Financial Summary */}
      <section className="section">
        <h2 className="section-title">Financial Summary</h2>
        <div className="card">
          <div className="detail-row">
            <span className="detail-label">Total Orders</span>
            <span className="detail-value">{settlement.totalOrders}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Food Amount</span>
            <span className="detail-value currency">₹{(settlement.totalFoodAmount / 100).toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Tax Amount</span>
            <span className="detail-value currency">₹{(settlement.totalTaxAmount / 100).toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Platform Fee</span>
            <span className="detail-value currency">₹{(settlement.totalPlatformFee / 100).toFixed(2)}</span>
          </div>
          <div className="detail-row highlight">
            <span className="detail-label">Vendor Payable</span>
            <span className="detail-value currency">₹{(settlement.totalVendorPayable / 100).toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* Ledger Entries */}
      <section className="section">
        <h2 className="section-title">Ledger Entries ({settlement.ledgerEntries.length})</h2>
        <div className="card">
          <table className="entries-table">
            <thead>
              <tr>
                <th>Entry ID</th>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Gross</th>
                <th>Platform Fee</th>
                <th>Net Vendor</th>
              </tr>
            </thead>
            <tbody>
              {settlement.ledgerEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="mono">{entry.id.substring(0, 8)}...</td>
                  <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td><StatusBadge status={entry.type} variant="info" /></td>
                  <td>₹{(entry.grossAmount / 100).toFixed(2)}</td>
                  <td>₹{(entry.platformFee / 100).toFixed(2)}</td>
                  <td>₹{(entry.netAmount / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 10px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #2563EB;
          color: white;
        }

        .btn-primary:hover {
          background: #1D4ED8;
        }

        .btn-secondary {
          background: #F3F4F6;
          color: #1A1A1A;
        }

        .btn-secondary:hover {
          background: #E5E7EB;
        }

        .section {
          margin-bottom: 32px;
        }

        .card {
          background: #FFFFFF;
          border: 1px solid #E5E5E5;
          border-radius: 8px;
          padding: 24px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #F3F4F6;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row.highlight {
          background: #F0F9FF;
          padding: 16px;
          border-radius: 6px;
          margin-top: 8px;
          font-weight: 600;
        }

        .detail-label {
          font-size: 14px;
          font-weight: 500;
          color: #666666;
        }

        .detail-value {
          font-size: 14px;
          color: #1A1A1A;
        }

        .mono {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }

        .currency {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          color: #059669;
        }

        .entries-table {
          width: 100%;
          border-collapse: collapse;
        }

        .entries-table th {
          text-align: left;
          padding: 12px;
          border-bottom: 2px solid #E5E5E5;
          font-size: 14px;
          font-weight: 600;
          color: #666666;
        }

        .entries-table td {
          padding: 12px;
          border-bottom: 1px solid #F3F4F6;
          font-size: 14px;
        }

        .entries-table tbody tr:last-child td {
          border-bottom: none;
        }

        .entries-table th:last-child,
        .entries-table td:last-child {
          text-align: right;
        }
      `}</style>
    </div>
  )
}
