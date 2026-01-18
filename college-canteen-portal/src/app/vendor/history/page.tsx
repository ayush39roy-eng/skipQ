'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Calendar, Clock, Receipt, MoreHorizontal } from 'lucide-react'
import { getTicketNumber } from '@/lib/order-ticket'

// Reusing VendorBadge from Dashboard (inline for simplicity or import if refactored)
function HistoryBadge({ status }: { status: string }) {
    const styles = {
        COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        READY: 'bg-blue-50 text-blue-700 border-blue-100',
        CONFIRMED: 'bg-amber-50 text-amber-700 border-amber-100',
        CANCELLED: 'bg-rose-50 text-rose-700 border-rose-100',
        PENDING: 'bg-gray-50 text-gray-600 border-gray-100'
    }
    const style = styles[status as keyof typeof styles] || styles.PENDING
    return (
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${style}`}>
            {status}
        </span>
    )
}

type HistoryOrder = {
    id: string
    date: string
    status: string
    totalValue: number
    items: Array<{ name: string; quantity: number; unitPrice: number }>
}

export default function VendorHistoryPage() {
    const [orders, setOrders] = useState<HistoryOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/vendor/history')
            if (res.ok) {
                const data = await res.json()
                setOrders(data.orders || [])
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [])

    const formatCurrency = (cents: number) => `₹${(cents / 100).toFixed(2)}`
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    })

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans text-slate-900">
            {/* Header */}
            <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/vendor" className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-lg font-bold leading-none">Order History</h1>
                    </div>
                    <button onClick={fetchHistory} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                {orders.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <div className="bg-slate-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Receipt className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium">No order history found</p>
                    </div>
                )}

                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300">
                            <div 
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50"
                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            >
                                <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-col flex-col items-center justify-center text-center">
                                         <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-1 rounded-sm uppercase tracking-wide">
                                            {getTicketNumber(order.id)}
                                         </span>
                                     </div>
                                     <div>
                                         <div className="flex items-center gap-2 mb-1">
                                             <HistoryBadge status={order.status} />
                                             <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {formatDate(order.date)}
                                             </span>
                                         </div>
                                         <p className="text-sm text-slate-600">
                                             {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                                         </p>
                                     </div>
                                </div>
                                
                                <div className="text-right">
                                    <p className="text-lg font-bold text-slate-900">{formatCurrency(order.totalValue)}</p>
                                    <p className="text-xs text-emerald-600 font-medium">Earnings</p>
                                </div>
                            </div>

                            {/* Details Expanded */}
                            {expandedId === order.id && (
                                <div className="border-t border-slate-100 bg-slate-50 p-4 animate-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-2">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-slate-700">{item.quantity}x</span>
                                                    <span className="text-slate-600">{item.name}</span>
                                                </div>
                                                <span className="text-slate-500">{formatCurrency(item.unitPrice * item.quantity)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Earnings</span>
                                       <span className="font-bold text-slate-900">{formatCurrency(order.totalValue)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}
