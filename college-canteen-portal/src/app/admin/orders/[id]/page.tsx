'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/admin/StatusBadge'

type OrderDetail = {
  id: string
  createdAt: string
  status: string
  totalCents: number
  commissionCents: number
  vendorTakeCents: number
  guestName: string | null
  vendor: {
    name: string
    phone: string | null
  } | null
  user: {
    name: string
    phone: string | null
  } | null
  items: Array<{
    id: string
    quantity: number
    priceCents: number
    menuItem: {
      name: string
    } | null
  }>
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/admin/orders/${id}`)
      const data = await response.json()
      
      if (!response.ok || !data.order) {
        console.error('Failed to fetch order:', data)
        throw new Error(data.error || 'Order not found')
      }
      
      setOrder(data.order)
    } catch (error) {
      console.error('Failed to fetch order:', error)
      alert('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading order details...</div>
  if (!order) return <div>Order not found</div>

  const customerName = order.user?.name || order.guestName || 'Guest'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Order #{order.id.substring(0, 8)}</h1>
          <p className="page-subtitle">Order details and audit trail</p>
        </div>
        <button className="btn btn-secondary" onClick={() => router.push('/admin/orders')}>
          ← Back to Orders
        </button>
      </div>

      {/* Order Info */}
      <section className="section">
        <h2 className="section-title">Order Information</h2>
        <div className="card">
          <div className="detail-row">
            <span className="detail-label">Order ID</span>
            <span className="detail-value mono">{order.id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="detail-row">
            <span className="detail-label">Created</span>
            <span className="detail-value">{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Customer</span>
            <span className="detail-value">{customerName}</span>
          </div>
          {order.user?.phone && (
            <div className="detail-row">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{order.user.phone}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">Vendor</span>
            <span className="detail-value">{order.vendor?.name || 'Unknown'}</span>
          </div>
        </div>
      </section>

      {/* Order Items */}
      <section className="section">
        <h2 className="section-title">Order Items</h2>
        <div className="card">
          <table className="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.menuItem?.name || 'Unknown Item'}</td>
                  <td>{item.quantity}x</td>
                  <td>₹{(item.priceCents / 100).toFixed(2)}</td>
                  <td>₹{(item.quantity * item.priceCents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Financial Breakdown */}
      <section className="section">
        <h2 className="section-title">Financial Breakdown</h2>
        <div className="card">
          <div className="detail-row">
            <span className="detail-label">User Paid (Total)</span>
            <span className="detail-value currency">₹{(order.totalCents / 100).toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Platform Fee</span>
            <span className="detail-value currency">₹{(order.commissionCents / 100).toFixed(2)}</span>
          </div>
          <div className="detail-row highlight">
            <span className="detail-label">Vendor Receivable</span>
            <span className="detail-value currency">₹{(order.vendorTakeCents / 100).toFixed(2)}</span>
          </div>
        </div>
      </section>

      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
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

        .items-table {
          width: 100%;
          border-collapse: collapse;
        }

        .items-table th {
          text-align: left;
          padding: 12px;
          border-bottom: 2px solid #E5E5E5;
          font-size: 14px;
          font-weight: 600;
          color: #666666;
        }

        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #F3F4F6;
          font-size: 14px;
        }

        .items-table tbody tr:last-child td {
          border-bottom: none;
        }

        .items-table th:last-child,
        .items-table td:last-child {
          text-align: right;
        }
      `}</style>
    </div>
  )
}
