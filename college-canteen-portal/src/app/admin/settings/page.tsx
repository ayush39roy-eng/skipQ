'use client'

import { useState, useEffect } from 'react'

export default function PlatformSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [gstRate, setGstRate] = useState('18') // Default 18%
  const [ordersPaused, setOrdersPaused] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      const data = await response.json()
      
        if (response.ok && data.settings) {
        setGstRate((data.settings.platformGstRate * 100).toString())
        setOrdersPaused(data.settings.ordersPaused || false)
        setLastUpdated(data.settings.updatedAt)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      alert('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const rateDecimal = parseFloat(gstRate) / 100
      
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformGstRate: rateDecimal,
          ordersPaused
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('Settings updated successfully!')
        setLastUpdated(data.settings.updatedAt)
      } else {
        alert(data.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading settings...</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Platform Settings</h1>
        <p className="page-subtitle">Configure global platform parameters (GST, Fees, etc.)</p>
      </div>

      <div className="card">
        <h2 className="section-title" style={{ marginTop: 0 }}>Financial Configuration</h2>
        
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Platform GST Rate (%)</label>
            <div className="input-with-hint">
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                max="100" 
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="input"
                placeholder="18"
              />
            </div>
            <p className="help-text">
              GST charged on the Platform Fee (Commission). 
              Example: If GST is 18% and Platform Fee is ₹100, Total Deduction = ₹118.
            </p>
          </div>

          <div className="form-group">
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '24px 0 12px 0', color: '#B91C1C' }}>Danger Zone</h3>
            <label className="checkbox-label" style={{ alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={ordersPaused}
                onChange={(e) => setOrdersPaused(e.target.checked)}
                style={{ marginTop: '4px' }}
              />
              <div>
                <span style={{ display: 'block', fontWeight: 600, color: '#B91C1C' }}>Pause All Orders</span>
                <span className="help-text" style={{ marginTop: '0' }}>
                  If enabled, the entire platform will reject new orders. Existing orders can still be processed.
                </span>
              </div>
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>

        {lastUpdated && (
          <div className="meta-info">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </div>
        )}
      </div>

      <style jsx>{`
        .card {
          background: #FFFFFF;
          border: 1px solid #E5E5E5;
          border-radius: 8px;
          padding: 32px;
          max-width: 600px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          font-weight: 500;
          margin-bottom: 8px;
          color: #374151;
        }

        .input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          font-size: 16px;
        }
        
        .input:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .help-text {
          font-size: 14px;
          color: #6B7280;
          margin-top: 6px;
          line-height: 1.5;
        }

        .form-actions {
          margin-top: 32px;
        }

        .meta-info {
          margin-top: 24px;
          border-top: 1px solid #F3F4F6;
          padding-top: 16px;
          font-size: 13px;
          color: #9CA3AF;
        }
      `}</style>
    </div>
  )
}
