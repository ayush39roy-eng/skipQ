'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/admin/StatusBadge'

type VendorDetail = {
  id: string
  name: string
  mode: string
  status?: string
  phone: string | null
  whatsappEnabled: boolean
  createdAt: string
  // Location
  latitude: number | null
  longitude: number | null
  geofenceRadiusMeters: number
  // Pricing
  feePayer: 'USER_PAYS' | 'VENDOR_PAYS'
  selfOrderFeeRate: number
  preOrderFeeRate: number
  feeConfigUpdatedAt: string | null
  // Feature Flags
  enableScheduledOrders: boolean
  enableVendorPaidFees: boolean
  enableAdvancedAnalytics: boolean
  enablePricingOverrides: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canteens?: any[]
}

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [vendor, setVendor] = useState<VendorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    status: 'ACTIVE',
    mode: 'ORDERS_ONLY',
    whatsappEnabled: false,
    latitude: '',
    longitude: '',
    geofenceRadiusMeters: '50',
    feePayer: 'USER_PAYS' as 'USER_PAYS' | 'VENDOR_PAYS',
    selfOrderFeeRate: '1.5',
    preOrderFeeRate: '3',
    enableScheduledOrders: false,
    enableVendorPaidFees: false,
    enableAdvancedAnalytics: false,
    enablePricingOverrides: false
  })

  useEffect(() => {
    fetchVendor()
  }, [id])

  const fetchVendor = async () => {
    try {
      const response = await fetch(`/api/admin/vendors/${id}`)
      const data = await response.json()
      
      if (!response.ok || !data.vendor) {
        console.error('Failed to fetch vendor:', data)
        throw new Error(data.error || 'Vendor not found')
      }
      
      setVendor(data.vendor)
      setFormData({
        name: data.vendor.name || '',
        phone: data.vendor.phone || '',
        status: data.vendor.status || 'ACTIVE',
        mode: data.vendor.mode || 'ORDERS_ONLY',
        whatsappEnabled: data.vendor.whatsappEnabled || false,
        latitude: data.vendor.latitude?.toString() || '',
        longitude: data.vendor.longitude?.toString() || '',
        geofenceRadiusMeters: data.vendor.geofenceRadiusMeters?.toString() || '50',
        feePayer: data.vendor.feePayer || 'USER_PAYS',
        selfOrderFeeRate: ((data.vendor.selfOrderFeeRate || 0.015) * 100).toString(),
        preOrderFeeRate: ((data.vendor.preOrderFeeRate || 0.03) * 100).toString(),
        enableScheduledOrders: data.vendor.enableScheduledOrders || false,
        enableVendorPaidFees: data.vendor.enableVendorPaidFees || false,
        enableAdvancedAnalytics: data.vendor.enableAdvancedAnalytics || false,
        enablePricingOverrides: data.vendor.enablePricingOverrides || false
      })
    } catch (error) {
      console.error('Failed to fetch vendor:', error)
      alert('Failed to load vendor details')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/vendors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          status: formData.status,
          mode: formData.mode,
          whatsappEnabled: formData.whatsappEnabled,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          geofenceRadiusMeters: parseInt(formData.geofenceRadiusMeters) || 50,
          feePayer: formData.feePayer,
          selfOrderFeeRate: parseFloat(formData.selfOrderFeeRate) / 100,
          preOrderFeeRate: parseFloat(formData.preOrderFeeRate) / 100,
          enableScheduledOrders: formData.enableScheduledOrders,
          enableVendorPaidFees: formData.enableVendorPaidFees,
          enableAdvancedAnalytics: formData.enableAdvancedAnalytics,
          enablePricingOverrides: formData.enablePricingOverrides
        })
      })

      if (response.ok) {
        await fetchVendor()
        setEditing(false)
        alert('Vendor updated successfully!')
      } else {
        const data = await response.json()
        alert(`Failed to update: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to update vendor:', error)
      alert('Failed to update vendor')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading vendor details...</div>
  if (!vendor) return <div>Vendor not found</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{vendor.name}</h1> 
          <p className="page-subtitle">Complete vendor configuration</p>
        </div>
        <div className="header-actions">
          {editing ? (
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Save All Changes'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => router.push('/admin/vendors')}>
                ← Back to Vendors
              </button>
              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                Edit Settings
              </button>
            </>
          )}
        </div>
      </div>

      {/* Vendor Profile */}
      <section className="section">
        <h2 className="section-title">Profile</h2>
        <div className="card">
          {editing ? (
            <>
              <div className="form-group">
                <label>Vendor Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input"
                  style={{ borderColor: formData.status === 'SUSPENDED' ? '#EF4444' : '#E5E5E5' }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended (Orders Blocked)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+91XXXXXXXXXX"
                />
              </div>
              <div className="form-group">
                <label>Operation Mode</label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  className="input"
                >
                  <option value="ORDERS_ONLY">Orders Only (Standard)</option>
                  <option value="FULL_POS">Full Queue Management (Premium)</option>
                </select>
                <p className="help-text">Controls availability of POS features like Queue Display</p>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.whatsappEnabled}
                    onChange={(e) => setFormData({ ...formData, whatsappEnabled: e.target.checked })}
                  />
                  <span>WhatsApp Enabled</span>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="detail-row">
                <span className="detail-label">Vendor ID</span>
                <span className="detail-value mono">{vendor.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Name</span>
                <span className="detail-value">{vendor.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <StatusBadge 
                  status={vendor.status || 'ACTIVE'} 
                  variant={vendor.status === 'SUSPENDED' ? 'error' : 'success'} 
                />
              </div>
              <div className="detail-row">
                <span className="detail-label">Mode</span>
                <StatusBadge status={vendor.mode} variant="info" />
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone</span>
                <span className="detail-value">{vendor.phone || 'Not set'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">WhatsApp Enabled</span>
                <span className="detail-value">{vendor.whatsappEnabled ? 'Yes' : 'No'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created</span>
                <span className="detail-value">{new Date(vendor.createdAt).toLocaleDateString()}</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Location & Geofencing */}
      <section className="section">
        <h2 className="section-title">Location & Geofencing</h2>
        <div className="card">
          {editing ? (
            <>
              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="input"
                  placeholder="28.6139"
                />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="input"
                  placeholder="77.2090"
                />
              </div>
              <div className="form-group">
                <label>Geofence Radius (meters)</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={formData.geofenceRadiusMeters}
                  onChange={(e) => setFormData({ ...formData, geofenceRadiusMeters: e.target.value })}
                  className="input"
                  placeholder="50"
                />
                <p className="help-text">Distance within which self-orders are allowed (10-500 meters)</p>
              </div>
            </>
          ) : (
            <>
              <div className="detail-row">
                <span className="detail-label">Latitude</span>
                <span className="detail-value mono">{vendor.latitude || 'Not set'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Longitude</span>
                <span className="detail-value mono">{vendor.longitude || 'Not set'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Geofence Radius</span>
                <span className="detail-value">{vendor.geofenceRadiusMeters} meters</span>
              </div>
              {vendor.latitude && vendor.longitude && (
                <div className="map-link">
                  <a
                    href={`https://www.google.com/maps?q=${vendor.latitude},${vendor.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                  >
                    📍 View on Map
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Pricing & Fees */}
      <section className="section">
        <h2 className="section-title">Pricing & Fee Configuration</h2>
        <div className="card">
          {editing ? (
            <>
              <div className="form-group">
                <label>Fee Payer</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="feePayer"
                      value="USER_PAYS"
                      checked={formData.feePayer === 'USER_PAYS'}
                      onChange={(e) => setFormData({ ...formData, feePayer: 'USER_PAYS' })}
                    />
                    <span>User Pays (Customer pays platform fee)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="feePayer"
                      value="VENDOR_PAYS"
                      checked={formData.feePayer === 'VENDOR_PAYS'}
                      onChange={(e) => setFormData({ ...formData, feePayer: 'VENDOR_PAYS' })}
                    />
                    <span>Vendor Pays (Vendor absorbs platform fee)</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Self-Order Fee Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.selfOrderFeeRate}
                  onChange={(e) => setFormData({ ...formData, selfOrderFeeRate: e.target.value })}
                  className="input"
                  placeholder="1.5"
                />
                <p className="help-text">Platform fee for self-service orders (0-10%)</p>
              </div>
              <div className="form-group">
                <label>Pre-Order Fee Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.preOrderFeeRate}
                  onChange={(e) => setFormData({ ...formData, preOrderFeeRate: e.target.value })}
                  className="input"
                  placeholder="3"
                />
                <p className="help-text">Platform fee for scheduled pre-orders (0-10%)</p>
              </div>
              <p className="warning">⚠️ Changing fee configuration affects all new orders immediately</p>
            </>
          ) : (
            <>
              <div className="detail-row">
                <span className="detail-label">Fee Payer</span>
                <StatusBadge 
                  status={vendor.feePayer === 'USER_PAYS' ? 'User Pays' : 'Vendor Pays'} 
                  variant={vendor.feePayer === 'USER_PAYS' ? 'info' : 'warning'}
                />
              </div>
              <div className="detail-row">
                <span className="detail-label">Self-Order Fee</span>
                <span className="detail-value mono">{(vendor.selfOrderFeeRate * 100).toFixed(2)}%</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Pre-Order Fee</span>
                <span className="detail-value mono">{(vendor.preOrderFeeRate * 100).toFixed(2)}%</span>
              </div>
              {vendor.feeConfigUpdatedAt && (
                <div className="detail-row">
                  <span className="detail-label">Last Updated</span>
                  <span className="detail-value">{new Date(vendor.feeConfigUpdatedAt).toLocaleString()}</span>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Feature Flags */}
      <section className="section">
        <h2 className="section-title">Feature Flags</h2>
        <div className="card">
          {editing ? (
            <>
              <div className="flag-group">
                <label className="flag-label">
                  <input
                    type="checkbox"
                    checked={formData.enableScheduledOrders}
                    onChange={(e) => setFormData({ ...formData, enableScheduledOrders: e.target.checked })}
                  />
                  <div className="flag-content">
                    <span className="flag-title">Enable Scheduled Orders</span>
                    <span className="flag-desc">Allow customers to place orders for future pickup/delivery</span>
                  </div>
                </label>
              </div>
              <div className="flag-group">
                <label className="flag-label">
                  <input
                    type="checkbox"
                    checked={formData.enableVendorPaidFees}
                    onChange={(e) => setFormData({ ...formData, enableVendorPaidFees: e.target.checked })}
                  />
                  <div className="flag-content">
                    <span className="flag-title">Enable Vendor-Paid Fees</span>
                    <span className="flag-desc">Override fee payer setting for specific promotions</span>
                  </div>
                </label>
              </div>
              <div className="flag-group">
                <label className="flag-label">
                  <input
                    type="checkbox"
                    checked={formData.enableAdvancedAnalytics}
                    onChange={(e) => setFormData({ ...formData, enableAdvancedAnalytics: e.target.checked })}
                  />
                  <div className="flag-content">
                    <span className="flag-title">Enable Advanced Analytics</span>
                    <span className="flag-desc">Access to AI-powered insights and forecasting</span>
                  </div>
                </label>
              </div>
              <div className="flag-group">
                <label className="flag-label">
                  <input
                    type="checkbox"
                    checked={formData.enablePricingOverrides}
                    onChange={(e) => setFormData({ ...formData, enablePricingOverrides: e.target.checked })}
                  />
                  <div className="flag-content">
                    <span className="flag-title">Enable Pricing Overrides</span>
                    <span className="flag-desc">Allow vendor to set custom prices (beta)</span>
                  </div>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="detail-row">
                <span className="detail-label">Scheduled Orders</span>
                <StatusBadge 
                  status={vendor.enableScheduledOrders ? 'Enabled' : 'Disabled'} 
                  variant={vendor.enableScheduledOrders ? 'success' : 'neutral'}
                />
              </div>
              <div className="detail-row">
                <span className="detail-label">Vendor-Paid Fees</span>
                <StatusBadge 
                  status={vendor.enableVendorPaidFees ? 'Enabled' : 'Disabled'}
                  variant={vendor.enableVendorPaidFees ? 'success' : 'neutral'}
                />
              </div>
              <div className="detail-row">
                <span className="detail-label">Advanced Analytics</span>
                <StatusBadge 
                  status={vendor.enableAdvancedAnalytics ? 'Enabled' : 'Disabled'}
                  variant={vendor.enableAdvancedAnalytics ? 'success' : 'neutral'}
                />
              </div>
              <div className="detail-row">
                <span className="detail-label">Pricing Overrides</span>
                <StatusBadge
                  status={vendor.enablePricingOverrides ? 'Enabled' : 'Disabled'}
                  variant={vendor.enablePricingOverrides ? 'success' : 'neutral'}
                />
              </div>
            </>
          )}
        </div>
      </section>

       {/* Canteens (Outlets) */}
       <section className="section">
        <div className="section-title-row">
            <h2 className="section-title">Canteens (Outlets)</h2>
            {/* Future: Add 'Create Canteen' button here */}
        </div>
        
        <div className="card">
            {vendor.canteens && vendor.canteens.length > 0 ? (
                <div className="canteen-list">
                    {vendor.canteens.map((canteen: any) => (
                        <div key={canteen.id} className="canteen-card">
                            <div className="canteen-info">
                                <h4>{canteen.name}</h4>
                                <div className="canteen-meta">
                                    {canteen.location} • {canteen.isOpen ? 'Open' : 'Closed'}
                                </div>
                            </div>
                            <div className="canteen-actions">
                                <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => router.push(`/admin/canteen/${canteen.id}`)}
                                >
                                    Manage Menu & Settings
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-500">
                    No canteens found for this vendor.
                </div>
            )}
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

        .section {
          margin-bottom: 32px;
        }

        .section-title-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .card {
          background: #FFFFFF;
          border: 1px solid #E5E5E5;
          border-radius: 8px;
          padding: 24px;
        }
        
        .canteen-list {
            display: grid;
            gap: 16px;
        }
        
        .canteen-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border: 1px solid #E5E5E5;
            border-radius: 8px;
            background: #F9FAFB;
        }
        
        .canteen-info h4 {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 4px 0;
            color: #111827;
        }
        
        .canteen-meta {
            font-size: 14px;
            color: #6B7280;
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

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #666666;
          margin-bottom: 6px;
        }

        .input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #E5E5E5;
          border-radius: 6px;
          font-size: 14px;
        }

        .input:focus {
          outline: none;
          border-color: #2563EB;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: auto;
        }

        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 12px;
          border: 1px solid #E5E5E5;
          border-radius: 6px;
        }

        .radio-label:hover {
          background: #F9FAFB;
        }

        .radio-label input[type="radio"] {
          width: auto;
        }

        .flag-group {
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #F3F4F6;
        }

        .flag-group:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .flag-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }

        .flag-label input[type="checkbox"] {
          margin-top: 4px;
        }

        .flag-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .flag-title {
          font-size: 14px;
          font-weight: 500;
          color: #1A1A1A;
        }

        .flag-desc {
          font-size: 13px;
          color: #666666;
        }

        .help-text {
          font-size: 12px;
          color: #999999;
          margin: 6px 0 0 0;
        }

        .warning {
          background: #FEF3C7;
          border: 1px solid #F59E0B;
          border-radius: 6px;
          padding: 12px;
          font-size: 13px;
          color: #92400E;
          margin: 16px 0 0 0;
        }

        .map-link {
          margin-top: 16px;
        }
      `}</style>
    </div>
  )
}
