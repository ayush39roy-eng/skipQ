'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { FormSubmitButton } from '@/components/ui/FormSubmitButton'
import { VendorMode } from '@/types/vendor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import AdminAnalyticsCharts from './AdminAnalyticsCharts'
import Image from 'next/image'
import Link from 'next/link'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Define types for props
type AdminDashboardProps = {
    stats: {
        totalSales: number
        commission: number
        totalOrders: number
    }
    activeCanteensCount: number
    orders: any[] // Using any for complex Prisma types for simplicity in client component
    recentOrders: any[]
    topCanteens: any[]
    vendors: (any & { mode: VendorMode })[]
    vendorUsers: any[]
    canteens: any[]
    actions: {
        createVendor: (formData: FormData) => Promise<void>
        updateVendor: (formData: FormData) => Promise<void>
        updateVendorCredentials: (formData: FormData) => Promise<void>
        createCanteen: (formData: FormData) => Promise<void>
        updateVendorMode: (formData: FormData) => Promise<void>
        deleteVendor: (formData: FormData) => Promise<void>
    }
}

export default function AdminDashboardClient({
    stats,
    activeCanteensCount,
    orders,
    recentOrders,
    topCanteens,
    vendors,
    vendorUsers,
    canteens,
    actions
}: AdminDashboardProps) {
    const formatCurrency = (cents: number) => `₹${(cents / 100).toFixed(2)}`

    return (
        <div className="space-y-8 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-[rgb(var(--text-muted))]">Manage canteens, vendors, and view platform performance.</p>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                    <TabsTrigger value="management">Management</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <Card className="p-6">
                            <div className="text-sm font-medium text-[rgb(var(--text-muted))]">Total Sales</div>
                            <div className="mt-2 text-3xl font-bold">{formatCurrency(stats.totalSales)}</div>
                        </Card>
                        <Card className="p-6">
                            <div className="text-sm font-medium text-[rgb(var(--text-muted))]">Commission (5%)</div>
                            <div className="mt-2 text-3xl font-bold">{formatCurrency(stats.commission)}</div>
                        </Card>
                        <Card className="p-6">
                            <div className="text-sm font-medium text-[rgb(var(--text-muted))]">Total Orders</div>
                            <div className="mt-2 text-3xl font-bold">{stats.totalOrders}</div>
                        </Card>
                        <Card className="p-6">
                            <div className="text-sm font-medium text-[rgb(var(--text-muted))]">Active Canteens</div>
                            <div className="mt-2 text-3xl font-bold">{activeCanteensCount}</div>
                        </Card>
                    </div>

                    {/* Charts Section */}
                    <AdminAnalyticsCharts orders={orders} />

                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Top Canteens */}
                        <Card className="p-6 space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold">Top Performing Canteens</h2>
                                <p className="text-sm text-[rgb(var(--text-muted))]">Highest revenue generating locations.</p>
                            </div>
                            <div className="space-y-4">
                                {topCanteens.map((c, i) => (
                                    <div key={c.id} className="flex items-center gap-4">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--surface-muted))] font-bold text-sm">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium">{c.name}</div>
                                            <div className="text-xs text-[rgb(var(--text-muted))]">{c.stats.orders} orders</div>
                                        </div>
                                        <div className="font-semibold">{formatCurrency(c.stats.revenue)}</div>
                                    </div>
                                ))}
                                {topCanteens.length === 0 && <p className="text-sm text-[rgb(var(--text-muted))]">No data available.</p>}
                            </div>
                        </Card>

                        {/* Recent Orders */}
                        <Card className="p-6 space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold">Recent Orders</h2>
                                <p className="text-sm text-[rgb(var(--text-muted))]">Latest 10 transactions.</p>
                            </div>
                            <div className="space-y-3">
                                {recentOrders.map(o => {
                                    const instr = (o as unknown as { cookingInstructions?: string }).cookingInstructions as string | undefined
                                    return (
                                        <div key={o.id} className="flex items-start justify-between border-b border-[rgb(var(--border))] pb-3 last:border-0 last:pb-0">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-[rgb(var(--text-muted))]">#{o.id.slice(0, 8)}</span>
                                                    <span className="text-sm font-medium">{o.canteen.name}</span>
                                                </div>
                                                <div className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                                                    {o.user?.email || o.guestName || 'Guest'}
                                                </div>
                                                {instr?.trim() && <div className="text-xs text-amber-500 mt-1">Note: {instr.slice(0, 40)}{instr.length > 40 ? '…' : ''}</div>}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-semibold">{formatCurrency(o.totalCents)}</div>
                                                <Badge variant={o.status === 'PAID' || o.status === 'CONFIRMED' ? 'success' : 'default'} className="mt-1 text-[10px] px-1.5 py-0.5 h-auto">
                                                    {o.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="onboarding" className="space-y-8">
                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Add Vendor */}
                        <Card className="p-6 space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold">Add New Vendor</h2>
                                <p className="text-sm text-[rgb(var(--text-muted))]">Register a new food vendor partner.</p>
                            </div>
                            <form className="space-y-4" action={actions.createVendor}>
                                <div className="grid gap-4">
                                    <Input name="vendorName" label="Vendor Name" placeholder="e.g. Spice Garden" required />
                                    <Input name="vendorPhone" label="WhatsApp Number" placeholder="+91..." />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-[rgb(var(--text))] cursor-pointer">
                                    <input type="checkbox" name="vendorWhatsApp" defaultChecked className="rounded border-gray-300" />
                                    Enable WhatsApp alerts for this vendor
                                </label>
                                <FormSubmitButton pendingLabel="Creating..." className="w-full">Create Vendor</FormSubmitButton>
                            </form>
                        </Card>

                        {/* Add Canteen */}
                        <Card className="p-6 space-y-4">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold">Add New Canteen</h3>
                                <p className="text-sm text-[rgb(var(--text-muted))]">Create a new dining location.</p>
                            </div>
                            <form className="flex flex-col gap-4" action={actions.createCanteen}>
                                <Input name="name" placeholder="Canteen Name" required />
                                <Input name="location" placeholder="Location (e.g. Block A)" required />
                                <select name="vendorId" className="input w-full" required>
                                    <option value="">Select Vendor Owner</option>
                                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                                <FormSubmitButton pendingLabel="Creating...">Create Canteen</FormSubmitButton>
                            </form>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="management" className="space-y-8">
                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* Vendor Login Access */}
                        <Card className="p-6 space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold">Vendor Login Access</h2>
                                <p className="text-sm text-[rgb(var(--text-muted))]">Create or update login credentials for vendor staff.</p>
                            </div>
                            <form className="space-y-4" action={actions.updateVendorCredentials}>
                                <div className="space-y-3">
                                    <label className="block space-y-1.5">
                                        <span className="text-sm font-medium">Select Vendor</span>
                                        <select name="vendorAccountVendorId" className="input w-full bg-[rgb(var(--surface))]" required defaultValue="">
                                            <option value="" disabled>Choose a vendor...</option>
                                            {vendors.map((vendor) => (
                                                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <Input name="vendorAccountName" label="Staff Name" placeholder="e.g. John Doe" required />
                                    <Input name="vendorAccountEmail" label="Email Address" type="email" placeholder="staff@vendor.com" required />
                                    <Input name="vendorAccountPassword" label="Set Password" type="password" placeholder="••••••••" required />
                                </div>
                                <FormSubmitButton pendingLabel="Saving..." className="w-full">Update Credentials</FormSubmitButton>
                            </form>

                            <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/30 p-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-3">Active Logins</h3>
                                <div className="space-y-2">
                                    {vendorUsers.length === 0 && <p className="text-sm text-[rgb(var(--text-muted))]">No vendor accounts created yet.</p>}
                                    {vendorUsers.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{user.name}</span>
                                                <span className="text-[rgb(var(--text-muted))] text-xs">{user.email}</span>
                                            </div>
                                            <Badge variant="default">{user.vendor?.name ?? 'Unlinked'}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        {/* Vendor Configuration */}
                        <Card className="p-6 space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold">Vendor Configuration</h2>
                                <p className="text-sm text-[rgb(var(--text-muted))]">Manage contact details and alert settings.</p>
                            </div>
                            <div className="divide-y divide-[rgb(var(--border))]">
                                {vendors.map(v => (
                                    <form key={v.id} className="py-4 first:pt-0 last:pb-0" action={actions.updateVendor}>
                                        <input type="hidden" name="id" value={v.id} />
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{v.name}</span>
                                                <FormSubmitButton size="sm" variant="secondary" pendingLabel="Saving...">Save</FormSubmitButton>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <Input name="phone" defaultValue={v.phone ?? ''} placeholder="WhatsApp (+91...)" className="text-sm" />
                                                <label className="flex items-center gap-2 text-sm cursor-pointer border rounded px-3 py-2">
                                                    <input type="checkbox" name="whatsappEnabled" defaultChecked={v.whatsappEnabled} />
                                                    <span>WhatsApp Alerts</span>
                                                </label>
                                            </div>
                                            
                                            <div className="border border-[rgb(var(--border))] rounded p-3">
                                                 <label className="block text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">Vendor Mode</label>
                                                 <div className="flex gap-4">
                                                     <label className="flex items-center gap-2 cursor-pointer">
                                                         <input type="radio" name="mode" value={VendorMode.ORDERS_ONLY} defaultChecked={v.mode === VendorMode.ORDERS_ONLY} 
                                                            onChange={e => {
                                                                const formData = new FormData()
                                                                formData.append('vendorId', v.id)
                                                                formData.append('mode', VendorMode.ORDERS_ONLY)
                                                                actions.updateVendorMode(formData)
                                                            }}
                                                         />
                                                         <span className="text-sm">Orders Only</span>
                                                     </label>
                                                     <label className="flex items-center gap-2 cursor-pointer">
                                                         <input type="radio" name="mode" value={VendorMode.FULL_POS} defaultChecked={v.mode === VendorMode.FULL_POS}
                                                            onChange={e => {
                                                                const formData = new FormData()
                                                                formData.append('vendorId', v.id)
                                                                formData.append('mode', VendorMode.FULL_POS)
                                                                actions.updateVendorMode(formData)
                                                            }}
                                                         />
                                                         <span className="text-sm font-bold text-amber-600">Full POS</span>
                                                     </label>
                                                 </div>
                                                </div>

                                            <div className="pt-3 border-t border-[rgb(var(--border))] mt-3 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (confirm(`Are you sure you want to PERMANENTLY delete "${v.name}"?\n\nThis will delete:\n- The Vendor Account\n- All Login Credentials\n- All Linked Canteens\n- All Menu Items\n\nThis action cannot be undone.`)) {
                                                            const fd = new FormData()
                                                            fd.append('vendorId', v.id)
                                                            await actions.deleteVendor(fd)
                                                        }
                                                    }}
                                                    className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline"
                                                >
                                                    Delete Vendor & Credentials
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Canteens List */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">Canteens</h2>
                                <p className="text-[rgb(var(--text-muted))]">Manage dining locations and menus.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {canteens.map((canteen) => (
                                <Card key={canteen.id} className="overflow-hidden border-[rgb(var(--border))] shadow-sm hover:shadow-md transition-shadow">
                                    <div className="p-6 flex items-start gap-4">
                                        {canteen.imageUrl ? (
                                            <Image
                                                src={canteen.imageUrl}
                                                alt={canteen.name}
                                                width={80}
                                                height={80}
                                                unoptimized
                                                className="h-20 w-20 rounded-lg object-cover shadow-sm bg-white"
                                            />
                                        ) : (
                                            <div className="h-20 w-20 rounded-lg bg-[rgb(var(--surface-muted))] flex items-center justify-center text-[rgb(var(--text-muted))] text-xs">
                                                No Image
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold">{canteen.name}</h3>
                                            <p className="text-sm text-[rgb(var(--text-muted))] mb-4">📍 {canteen.location}</p>
                                            <Link href={`/admin/canteen/${canteen.id}`}>
                                                <FormSubmitButton size="sm" className="w-full sm:w-auto">
                                                    Manage Canteen →
                                                </FormSubmitButton>
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
