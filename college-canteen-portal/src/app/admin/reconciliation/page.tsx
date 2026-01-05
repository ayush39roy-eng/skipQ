'use client'

import { useState, useEffect } from 'react'
import { StatusBadge } from '@/components/admin/StatusBadge'

type ReconciliationReport = {
  assertions: {
    name: string
    expected: number
    actual: number
    passed: boolean
    difference: number
  }[]
  overallStatus: 'PASS' | 'FAIL'
  criticalFailures: string[]
}

export default function ReconciliationPage() {
  const [report, setReport] = useState<ReconciliationReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 24h default
    end: new Date().toISOString().split('T')[0]
  })

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/reports/reconciliation?start=${dateRange.start}&end=${dateRange.end}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reconciliation report')
      }
      
      setReport(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [dateRange])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount / 100)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Reconciliation</h1>
          <p className="page-subtitle">Critical financial integrity checks</p>
        </div>
        <div className="actions">
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="date-input"
          />
          <span className="separator">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="date-input"
          />
          <button onClick={fetchReport} className="btn btn-secondary">Refresh</button>
        </div>
      </div>

      {error ? (
        <div className="error-banner">
          <h3>⚠️ Unable to run reconciliation</h3>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="loading">Running integrity checks...</div>
      ) : report ? (
        <div className="report-container">
          {/* Status Header */}
          <div className={`status-banner ${report.overallStatus.toLowerCase()}`}>
            <div className="status-label">Overall Status</div>
            <div className="status-value">{report.overallStatus}</div>
            {report.overallStatus === 'FAIL' && (
              <div className="status-message">
                Critical mismatches detected. Settlements are halted.
              </div>
            )}
          </div>

          {/* Critical Failures */}
          {report.criticalFailures.length > 0 && (
            <div className="failures-section">
              <h3>Critical Failures</h3>
              <ul>
                {report.criticalFailures.map((fail, idx) => (
                  <li key={idx}>{fail}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Assertions Table */}
          <div className="assertions-table">
            <div className="table-header">
              <div>Check Name</div>
              <div className="text-right">Expected</div>
              <div className="text-right">Actual</div>
              <div className="text-right">Diff</div>
              <div className="text-center">Status</div>
            </div>
            {report.assertions.map((assertion, idx) => (
              <div key={idx} className="table-row">
                <div className="assertion-name">{assertion.name}</div>
                <div className="text-right font-mono">{formatCurrency(assertion.expected)}</div>
                <div className="text-right font-mono">{formatCurrency(assertion.actual)}</div>
                <div className={`text-right font-mono ${assertion.difference !== 0 ? 'text-red' : 'text-gray'}`}>
                  {formatCurrency(assertion.difference)}
                </div>
                <div className="text-center">
                  <StatusBadge status={assertion.passed ? 'PASS' : 'FAIL'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .date-input {
          padding: 8px 12px;
          border: 1px solid #E5E5E5;
          border-radius: 6px;
        }
        .status-banner {
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          text-align: center;
        }
        .status-banner.pass {
          background: #ECFDF5;
          border: 1px solid #059669;
          color: #065F46;
        }
        .status-banner.fail {
          background: #FEF2F2;
          border: 1px solid #DC2626;
          color: #991B1B;
        }
        .status-value {
          font-size: 24px;
          font-weight: 700;
          margin: 8px 0;
        }
        .failures-section {
          background: #FEF2F2;
          border: 1px solid #FCA5A5;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .failures-section h3 {
          color: #991B1B;
          margin: 0 0 12px 0;
        }
        .assertions-table {
          background: white;
          border: 1px solid #E5E5E5;
          border-radius: 8px;
          overflow: hidden;
        }
        .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          padding: 12px 16px;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E5E5;
          font-weight: 600;
          font-size: 14px;
          color: #6B7280;
        }
        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          padding: 16px;
          border-bottom: 1px solid #F3F4F6;
          align-items: center;
          font-size: 14px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-family: monospace; }
        .text-red { color: #DC2626; }
        .text-gray { color: #6B7280; }
        .error-banner {
          background: #FEF2F2;
          color: #B91C1C;
          padding: 16px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  )
}
