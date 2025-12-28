'use client'

import { useState, useEffect } from 'react'
import { getVendorReports, type TimeRange, type ReportData } from './actions'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'

export default function ReportsClient() {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    
    async function fetchData() {
      setLoading(true)
      try {
        const res = await getVendorReports(timeRange)
        if (mounted) {
          if (res.success && res.data) {
            setData(res.data)
            setError(null)
          } else {
            setError(res.error || 'Failed to load data')
          }
        }
      } catch {
        if (mounted) setError('An unexpected error occurred')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchData()

    return () => { mounted = false }
  }, [timeRange])

  const handleExportCSV = () => {
    if (!data) return
    
    // Create CSV content
    const headers = ['Date/Time', 'Revenue', 'Orders']
    const rows = data.chartData.map(d => [d.label, (d.revenue).toFixed(2), d.orders].join(','))
    const csvContent = [headers.join(','), ...rows].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vendor_report_${timeRange}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Revoke URL to free memory
    setTimeout(() => {
        URL.revokeObjectURL(url)
    }, 100)
  }

  const formatCurrencyNormal = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
  }

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="h-96 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl">
        <p className="font-semibold">Error loading reports</p>
        <p className="text-sm mt-2">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
         <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            {(['daily', 'weekly', 'monthly'] as const).map((t) => (
                <button
                    key={t}
                    onClick={() => setTimeRange(t)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        timeRange === t
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
            ))}
         </div>

         <button 
           onClick={handleExportCSV}
           className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors"
         >
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
           Export CSV
         </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="Total Revenue" 
          value={formatCurrencyNormal(data.summary.revenue)}
          change={data.summary.revenueRes}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>}
          color="emerald"
        />
        <KPICard 
          title="Total Orders" 
          value={data.summary.orders.toString()}
          change={data.summary.ordersRes}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>}
          color="blue"
        />
        <KPICard 
          title="Avg. Order Value" 
          value={formatCurrencyNormal(data.summary.avgOrderValue)}
          change={data.summary.avgOrderValueRes}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
          color="violet"
        />
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
         <h3 className="text-lg font-bold text-slate-800 mb-6">Sales Trend</h3>
         <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                     <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                     </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                     dataKey="label" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#94a3b8', fontSize: 12 }} 
                     dy={10} 
                     minTickGap={30}
                  />
                  <YAxis 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#94a3b8', fontSize: 12 }} 
                     tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip 
                     contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                     }}
                     formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Area 
                     type="monotone" 
                     dataKey="revenue" 
                     stroke="#10b981" 
                     strokeWidth={3} 
                     fillOpacity={1} 
                     fill="url(#colorRevenue)" 
                  />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Top Products */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
         <h3 className="text-lg font-bold text-slate-800 mb-6">Top Performing Items</h3>
         <div className="overflow-x-auto">
            <table className="w-full">
               <thead>
                  <tr className="border-b border-slate-100">
                     <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rank</th>
                     <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Name</th>
                     <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity Sold</th>
                     <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {data.topProducts.map((product, idx) => (
                     <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 text-sm font-medium text-slate-400">#{idx + 1}</td>
                        <td className="py-4 px-4 text-sm font-semibold text-slate-800">{product.name}</td>
                        <td className="py-4 px-4 text-sm text-slate-600 text-right">{product.quantity}</td>
                        <td className="py-4 px-4 text-sm font-bold text-slate-900 text-right">
                           {formatCurrencyNormal(product.revenue)}
                        </td>
                     </tr>
                  ))}
                  {data.topProducts.length === 0 && (
                     <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                           No sales data available for this period.
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, change, icon, color }: { 
  title: string, value: string, change: number, icon: React.ReactNode, color: 'emerald' | 'blue' | 'violet' 
}) {
  const isPositive = change >= 0
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    violet: 'bg-violet-100 text-violet-600'
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
       <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
             {icon}
          </div>
          <h3 className="text-sm font-medium text-slate-500">{title}</h3>
       </div>
       <div className="flex items-end justify-between">
          <p className="text-3xl font-black text-slate-900">{value}</p>
          <div className={`flex items-center text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-red-500'} mb-1`}>
             {isPositive ? '+' : ''}{change.toFixed(1)}%
             {isPositive ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
             ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
             )}
          </div>
       </div>
       <p className="text-xs text-slate-400 mt-2">vs previous period</p>
    </div>
  )
}
