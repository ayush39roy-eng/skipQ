'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Search, Filter, Calendar, Download, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Orders Page
 * 
 * Global view of all orders with advanced filters.
 */

type Order = {
  id: string
  createdAt: string
  vendorId: string
  vendorName: string
  userPaid: number
  platformFee: number
  vendorReceivable: number
  orderType: string
  paymentStatus: string
  refundStatus: string
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  })
  const [filters, setFilters] = useState({
    vendorId: '',
    startDate: '',
    endDate: '',
    orderType: '',
    paymentStatus: ''
  })

  useEffect(() => {
    fetchOrders(true)
  }, [filters])

  const fetchOrders = async (reset = false) => {
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
      if (filters.orderType) params.append('orderType', filters.orderType)
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus)
      
      const currentOffset = reset ? 0 : pagination.offset
      params.append('limit', pagination.limit.toString())
      params.append('offset', currentOffset.toString())

      const response = await fetch(`/api/admin/orders?${params}`)
      const data = await response.json()
      
      if (reset) {
        setOrders(data.orders || [])
      } else {
        setOrders(prev => [...prev, ...(data.orders || [])])
      }
      
      setPagination({
        total: data.pagination?.total || 0,
        limit: data.pagination?.limit || 50,
        offset: currentOffset + (data.orders?.length || 0),
        hasMore: data.pagination?.hasMore || false
      })
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    fetchOrders(false)
  }

  const columns = [
    {
      key: 'id',
      header: 'Order ID',
      render: (order: Order) => (
        <span className="font-mono text-xs text-slate-500">#{order.id.substring(0, 8)}</span>
      )
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (order: Order) => (
        <span className="text-sm text-slate-600">
          {new Date(order.createdAt).toLocaleDateString()}
          <span className="text-slate-400 ml-1">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </span>
      )
    },
    {
      key: 'vendorName',
      header: 'Vendor',
      render: (order: Order) => (
        <span className="font-medium text-slate-900">{order.vendorName}</span>
      )
    },
    {
      key: 'userPaid',
      header: 'User Paid',
      align: 'right' as const,
      render: (order: Order) => (
        <span className="font-mono text-slate-900 font-medium">₹{(order.userPaid / 100).toFixed(2)}</span>
      )
    },
    {
      key: 'platformFee',
      header: 'Platform Fee',
      align: 'right' as const,
      render: (order: Order) => (
        <span className="font-mono text-slate-500">₹{(order.platformFee / 100).toFixed(2)}</span>
      )
    },
    {
      key: 'vendorReceivable',
      header: 'Vendor Gets',
      align: 'right' as const,
      render: (order: Order) => (
        <span className="font-mono text-emerald-600 font-medium">₹{(order.vendorReceivable / 100).toFixed(2)}</span>
      )
    },
    {
      key: 'orderType',
      header: 'Type',
      render: (order: Order) => <StatusBadge status={order.orderType} variant="info" />
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (order: Order) => <StatusBadge status={order.paymentStatus} />
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Global view of all orders ({pagination.total} total)</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
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
              value={filters.orderType}
              onChange={(e) => setFilters({ ...filters, orderType: e.target.value })}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
            >
              <option value="">All Order Types</option>
              <option value="SELF_ORDER">Self Order</option>
              <option value="PRE_ORDER">Pre-Order</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer"
            >
              <option value="">All Payment Status</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={orders}
            onRowClick={(order) => router.push(`/admin/orders/${order.id}`)}
            emptyMessage="No orders found matching your filters"
          />
          
          {/* Load More Button */}
          {pagination.hasMore && (
            <div className="flex justify-center pt-4 pb-8">
              <button 
                onClick={loadMore} 
                className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : `Load More (${orders.length} of ${pagination.total})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
