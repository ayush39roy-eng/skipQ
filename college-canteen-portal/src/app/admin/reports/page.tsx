'use client'

import { useState, useEffect } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'

/**
 * Financial Reports Page
 * 
 * Admin-only view of company financial reports.
 */

type ReportTab = 'revenue' | 'gst' | 'cashflow' | 'liability' | 'reconciliation'

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('revenue')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const { start, end } = dateRange
      let endpoint = ''
      
      switch (activeTab) {
        case 'revenue':
          endpoint = `/api/admin/reports/revenue?start=${start}&end=${end}`
          break
        case 'gst':
          endpoint = `/api/admin/reports/gst-liability?start=${start}&end=${end}`
          break
        case 'cashflow':
          endpoint = `/api/admin/reports/cash-flow?start=${start}&end=${end}`
          break
        case 'liability':
          endpoint = `/api/admin/reports/vendor-liability?start=${start}&end=${end}`
          break
        case 'reconciliation':
          endpoint = `/api/admin/reports/reconciliation?start=${start}&end=${end}`
          break
      }

      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report')
      }
      
      setReportData(data.report)
    } catch (error) {
      console.error('Failed to fetch report:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [activeTab, dateRange])

  const exportCSV = () => {
    const { start, end } = dateRange
    const endpoint = `/api/admin/reports/${activeTab}?start=${start}&end=${end}&export=csv`
    window.open(endpoint, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Financial Reports</h1>
        <p className="page-subtitle">Company-level reports derived from ledger</p>
      </div>

      {/* Date Range Selector */}
      <div className="filters">
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="date-input"
          />
        </div>
        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="date-input"
          />
        </div>
        <button onClick={fetchReport} className="btn btn-primary">
          Refresh
        </button>
        <button onClick={exportCSV} className="btn btn-secondary">
          Export CSV
        </button>
      </div>

      {/* Report Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          Revenue
        </button>
        <button
          className={`tab ${activeTab === 'gst' ? 'active' : ''}`}
          onClick={() => setActiveTab('gst')}
        >
          GST Liability
        </button>
        <button
          className={`tab ${activeTab === 'cashflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('cashflow')}
        >
          Cash Flow
        </button>
        <button
          className={`tab ${activeTab === 'liability' ? 'active' : ''}`}
          onClick={() => setActiveTab('liability')}
        >
          Vendor Liability
        </button>
        <button
          className={`tab ${activeTab === 'reconciliation' ? 'active' : ''}`}
          onClick={() => setActiveTab('reconciliation')}
        >
          Reconciliation
        </button>
      </div>

      {/* Report Content */}
      <div className="report-content">
        {error ? (
          <div className="error-message">
            <span className="icon">⚠️</span>
            {error}
            <button onClick={fetchReport} className="retry-btn">Retry</button>
          </div>
        ) : loading ? (
          <p>Loading report...</p>
        ) : reportData ? (
          <ReportDisplay tab={activeTab} data={reportData} />
        ) : (
          <p>No data available</p>
        )}
      </div>

      <style jsx>{`
        .error-message {
          color: #DC2626;
          background: #FEE2E2;
          padding: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .retry-btn {
          margin-left: auto;
          padding: 4px 12px;
          background: #FFFFFF;
          border: 1px solid #DC2626;
          color: #DC2626;
          border-radius: 4px;
          cursor: pointer;
        }
        .filters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          align-items: flex-end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group label {
          font-size: 13px;
          font-weight: 500;
          color: #666666;
        }

        .date-input {
          padding: 8px 12px;
          border: 1px solid #E5E5E5;
          border-radius: 6px;
          font-size: 14px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #E5E5E5;
          margin-bottom: 24px;
        }

        .tab {
          padding: 12px 20px;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #666666;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
        }

        .tab:hover {
          color: #1A1A1A;
        }

        .tab.active {
          color: #2563EB;
          border-bottom-color: #2563EB;
        }

        .report-content {
          background: #FFFFFF;
          border: 1px solid #E5E5E5;
          border-radius: 8px;
          padding: 24px;
          min-height: 400px;
        }
      `}</style>
    </div>
  )
}

function ReportDisplay({ tab, data }: { tab: ReportTab, data: any }) {
  switch (tab) {
    case 'revenue':
      return (
        <div className="metrics-grid">
          <MetricRow label="Gross Platform Fees" value={`₹${(data.grossPlatformFees / 100).toFixed(2)}`} />
          <MetricRow label="Platform GST Collected" value={`₹${(data.platformGSTCollected / 100).toFixed(2)}`} />
          <MetricRow label="Net Platform Revenue" value={`₹${(data.netPlatformRevenue / 100).toFixed(2)}`} highlight />
          <MetricRow label="Orders Count" value={data.ordersCount} />
          <MetricRow label="Average Fee per Order" value={`₹${(data.averageFeePerOrder / 100).toFixed(2)}`} />
        </div>
      )
    
    case 'gst':
      return (
        <div>
          <div className="notice">
            ⚠️ This report includes ONLY platform fee GST ({data.effectiveGstRate}%). Vendor food GST is EXCLUDED.
          </div>
          <div className="metrics-grid">
            <MetricRow label="Platform Fee GST Collected" value={`₹${(data.platformFeeGSTCollected / 100).toFixed(2)}`} />
            <MetricRow label="GST Paid" value={`₹${(data.gstPaid / 100).toFixed(2)}`} />
            <MetricRow label="Net GST Liability" value={`₹${(data.netGSTLiability / 100).toFixed(2)}`} highlight />
          </div>
        </div>
      )
    
    case 'reconciliation':
      return (
        <div className="space-y-6">
            <div className={`p-4 rounded-lg flex items-center justify-between ${data.overallStatus === 'PASS' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                <div className="font-semibold text-lg flex items-center gap-2">
                    <span className="text-2xl">{data.overallStatus === 'PASS' ? '✅' : '❌'}</span>
                    Reconciliation Status: {data.overallStatus}
                </div>
            </div>

          {data.criticalFailures?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-red-800 font-bold mb-2 flex items-center gap-2">
                  <span>🚨</span> CRITICAL FAILURES
              </h3>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                  {data.criticalFailures.map((failure: string, i: number) => (
                    <li key={i}>{failure}</li>
                  ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">System Integrity Assertions</h3>
            <div className="space-y-2">
                {data.assertions?.map((assertion: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <div>
                        <div className="font-medium text-slate-900">{assertion.name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                            Expected: <span className="font-mono">{assertion.expected}</span> | Actual: <span className="font-mono">{assertion.actual}</span>
                            {assertion.difference !== 0 && <span className="text-red-500 ml-2 font-bold">(Diff: {assertion.difference})</span>}
                        </div>
                    </div>
                    <StatusBadge status={assertion.passed ? 'PASS' : 'FAIL'} />
                </div>
                ))}
            </div>
          </div>
        </div>
      )

    case 'cashflow':
        return (
            <div>
                <div className="metrics-grid">
                    <MetricRow label="Total Inflow (User Payments)" value={`₹${(data.cashIn / 100).toFixed(2)}`} />
                    <MetricRow label="Total Outflow (Vendor Payouts)" value={`₹${(data.cashOut / 100).toFixed(2)}`} />
                    <MetricRow label="Platform Fees Retained" value={`₹${(data.platformFeeRetained / 100).toFixed(2)}`} />
                    <MetricRow label="Pending Liabilities (Unsettled)" value={`₹${(data.pendingLiabilities / 100).toFixed(2)}`} />
                    <MetricRow label="Net System Cash Flow" value={`₹${(data.netCashFlow / 100).toFixed(2)}`} highlight />
                </div>
            </div>
        )

    case 'liability':
        return (
            <div className="space-y-8">
                <div className="metrics-grid">
                    <MetricRow label="Total Unsettled Payables" value={`₹${(data.totalUnsettledPayables / 100).toFixed(2)}`} highlight />
                    <MetricRow label="Total Settled Amount" value={`₹${(data.settledAmount / 100).toFixed(2)}`} />
                </div>

                <div>
                    <h3 className="font-bold text-slate-900 mb-4">Vendor Breakdown</h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">Vendor</th>
                                    <th className="px-4 py-3 text-right">Settled (Paid)</th>
                                    <th className="px-4 py-3 text-right">Unsettled (Due)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(data.vendorBreakdown || []).map((v: any) => (
                                    <tr key={v.vendorId} className="bg-white hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">{v.vendorName}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">₹{(v.settledAmount / 100).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right text-red-600 font-medium">₹{(v.unsettledAmount / 100).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )

    default:
      return <pre className="p-4 bg-slate-50 rounded text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  }
}

function MetricRow({ label, value, highlight }: { label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className={`metric-row ${highlight ? 'highlight' : ''}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value currency">{value}</span>

      <style jsx>{`
        .metric-row {
          display: flex;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid #F3F4F6;
        }

        .metric-row.highlight {
          background: #F0F9FF;
          padding: 16px;
          margin: 0 -16px;
          padding-left: 16px;
          padding-right: 16px;
          border-radius: 6px;
        }

        .metric-label {
          font-size: 14px;
          color: #666666;
        }

        .metric-value {
          font-size: 16px;
          font-weight: 600;
          color: #1A1A1A;
        }

        .metrics-grid {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .notice {
          background: #FEF3C7;
          border: 1px solid #F59E0B;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #92400E;
        }

        .status-indicator {
          padding: 16px;
          border-radius: 8px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .status-indicator.success {
          background: #D1FAE5;
          color: #065F46;
        }

        .status-indicator.error {
          background: #FEE2E2;
          color: #991B1B;
        }

        .failures {
          background: #FEE2E2;
          border: 1px solid #DC2626;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .failures h3 {
          margin: 0 0 12px 0;
          color: #991B1B;
        }

        .assertions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .assertion {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #FAFAFA;
          border-radius: 6px;
        }
      `}</style>
    </div>
  )
}
