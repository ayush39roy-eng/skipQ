'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AnalyticsDashboardProps {
  data: {
    revenue: number
    orders: number
    activeOrders?: number
    avgValue: number
    hourlyTraffic: { hour: string; sales: number }[]
    topItems: { name: string; count: number }[]
  }
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  return (
    <div className="flex-1 h-full p-8 overflow-y-auto bg-slate-50/50">
       <h2 className="text-2xl font-bold text-slate-800 mb-6">Today's Performance</h2>

       {/* KFC Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <h3 className="text-sm font-medium text-slate-500">Total Revenue</h3>
             </div>
             <p className="text-3xl font-black text-slate-900">₹{data.revenue / 100}</p>          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
                </div>
                <h3 className="text-sm font-medium text-slate-500">Total Orders</h3>
             </div>
             <p className="text-3xl font-black text-slate-900">{data.orders}</p>
             {data.activeOrders !== undefined && (
                <p className="text-xs font-bold text-blue-600 mt-1">{data.activeOrders} Active / {data.orders} Total</p>
             )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <h3 className="text-sm font-medium text-slate-500">Avg. Order Value</h3>
             </div>
             <p className="text-3xl font-black text-slate-900">₹{data.avgValue / 100}</p>
             <p className="text-xs font-medium text-slate-400 mt-1">Per transaction</p>
          </div>
       </div>

       {/* Charts Row */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
             <h3 className="text-lg font-bold text-slate-800 mb-6">Hourly Sales Trend</h3>
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={data.hourlyTraffic}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Top Items */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-bold text-slate-800 mb-6">Top Selling Items</h3>
             <div className="space-y-4">
                {data.topItems.length > 0 ? (
                    data.topItems.map((item, idx) => (
                       <div key={idx} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                                {idx + 1}
                             </div>
                             <span className="font-medium text-slate-700">{item.name}</span>
                          </div>
                          <span className="font-bold text-slate-900">{item.count} sold</span>
                       </div>
                    ))
                ) : (
                    <div className="text-center text-slate-400 py-10">No sales yet</div>
                )}
             </div>
             
             <button className="w-full mt-8 py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm">
                View Full Menu Report
             </button>
          </div>
       </div>
    </div>
  )
}
