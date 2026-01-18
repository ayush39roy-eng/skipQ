import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Input } from '@/components/ui/Input'
import { Table, THead, TBody, TR as Tr, TH as Th, TD as Td } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { revalidatePath } from 'next/cache'
import Image from 'next/image'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormSubmitButton } from '@/components/ui/FormSubmitButton'
import { Card } from '@/components/ui/Card'
import { sendWhatsApp } from '@/lib/whatsapp'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type MenuSectionShape = { id: string; name: string; sortOrder?: number }
type MenuItemShape = { id: string; name: string; priceCents: number; imageUrl?: string | null; available?: boolean; sectionId?: string | null; sortOrder?: number | null }

export default async function CanteenPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await requireRole(['ADMIN'])
    if (!session) return <p>Unauthorized</p>

    const canteen = await prisma.canteen.findUnique({
        where: { id: params.id },
        select: { id: true, name: true, location: true, notificationPhones: true, imageUrl: true }
    })

    if (!canteen) {
        return <div className="p-6">Canteen not found</div>
    }

    const items = await prisma.menuItem.findMany({ where: { canteenId: canteen.id }, orderBy: { sortOrder: 'asc' } })
    const sections = await prisma.menuSection.findMany({ where: { canteenId: canteen.id }, orderBy: { sortOrder: 'asc' } })

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div className="flex items-center justify-between pt-6">
                 <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">
                    <span className="text-lg">←</span> Back to Dashboard
                </Link>
            </div>

            <div className="space-y-8">
                {/* Section 1: Canteen Details & Settings */}
                <div className="space-y-6">
                    <Card className="overflow-hidden border-slate-200 shadow-sm p-0">
                        <div className="p-6 bg-white">
                            <div className="flex flex-col items-center text-center">
                                {canteen.imageUrl ? (
                                    <Image
                                        src={canteen.imageUrl}
                                        alt={canteen.name}
                                        width={120}
                                        height={120}
                                        unoptimized
                                        className="h-32 w-32 rounded-2xl object-cover shadow-md bg-slate-50 mb-4"
                                    />
                                ) : (
                                    <div className="h-32 w-32 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                                        <span className="text-xs font-medium uppercase tracking-wider">No Image</span>
                                    </div>
                                )}
                                <h1 className="text-xl font-bold text-slate-900">{canteen.name}</h1>
                                <p className="text-sm text-slate-500 mt-1 flex items-center justify-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    {canteen.location}
                                </p>
                            </div>

                             {/* Edit Canteen Form */}
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4">Edit Details</h3>
                                <form className="space-y-4" action={async (formData: FormData) => {
                                    'use server'
                                    const session = await requireRole(['ADMIN'])
                                    if (!session) return
                                    const name = String(formData.get('name') || '').trim()
                                    const rawLoc = formData.get('location')
                                    const location = typeof rawLoc === 'string' ? rawLoc.trim() : ''
                                    const rawImg = formData.get('imageUrl')
                                    const imageUrl = typeof rawImg === 'string' ? rawImg.trim() : ''

                                    if (!name || !location) return
                                    await prisma.canteen.update({ where: { id: canteen.id }, data: { name, location, imageUrl: imageUrl || null } })
                                    revalidatePath(`/admin/canteen/${canteen.id}`)
                                }}>
                                    <div className="space-y-3">
                                        <Input name="name" label="Canteen Name" defaultValue={canteen.name} className="bg-slate-50 border-slate-200" required />
                                        <Input name="location" label="Location" defaultValue={canteen.location} className="bg-slate-50 border-slate-200" required />
                                        <Input name="imageUrl" label="Image URL" defaultValue={canteen.imageUrl ?? ''} className="bg-slate-50 border-slate-200" placeholder="https://raw.githubusercontent.com/..." />
                                    </div>
                                    <FormSubmitButton pendingLabel="Saving..." className="w-full bg-slate-900 text-white hover:bg-slate-800">Update Details</FormSubmitButton>
                                </form>
                            </div>

                        <div className="mt-2 flex justify-end">
                            <form
                                action={async () => {
                                    'use server'
                                    const session = await requireRole(['ADMIN'])
                                    if (!session) return
                                    await prisma.$transaction(async tx => {
                                        const orders = await tx.order.findMany({ where: { canteenId: canteen.id }, select: { id: true } })
                                        const orderIds = orders.map(o => o.id)
                                        if (orderIds.length) {
                                            await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } })
                                            await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
                                        }
                                        await tx.menuItem.deleteMany({ where: { canteenId: canteen.id } })
                                        if (orderIds.length) {
                                            await tx.order.deleteMany({ where: { id: { in: orderIds } } })
                                        }
                                        await tx.canteen.delete({ where: { id: canteen.id } })
                                    })
                                    redirect('/admin')
                                }}
                            >
                                <FormSubmitButton
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                                    pendingLabel="Deleting..."
                                >
                                    Delete Canteen (Dangerous)
                                </FormSubmitButton>
                            </form>
                        </div>
                        </div>
                    </Card>
                </div>

                {/* Section 2: Menu Management */}
                <div className="space-y-6">
                    {/* Menu Sections */}
                    <Card className="border-slate-200 shadow-sm p-6 bg-white">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Menu Management</h2>
                                <p className="text-sm text-slate-500">Organize items into sections (Breakfast, Lunch, etc.)</p>
                            </div>
                        </div>

                         <div className="mb-8">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Sections</h3>
                            <div className="flex flex-wrap gap-3">
                                {(sections || []).map((s: MenuSectionShape, idx: number) => (
                                    <div key={s.id} className="group flex items-center gap-1 bg-slate-50 rounded-lg pl-3 pr-1 py-1.5 border border-slate-200 shadow-sm hover:border-purple-200 hover:bg-purple-50 transition-all">
                                        <form action={async (formData: FormData) => {
                                            'use server'
                                            const session = await requireRole(['ADMIN'])
                                            if (!session) return
                                            const rawName = formData.get('name')
                                            const name = typeof rawName === 'string' ? rawName.trim() : ''
                                            if (!name) return
                                            await prisma.menuSection.update({ where: { id: s.id }, data: { name } })
                                            revalidatePath(`/admin/canteen/${canteen.id}`)
                                        }}>
                                            <input name="name" defaultValue={s.name} className="bg-transparent border-none text-sm font-semibold text-slate-700 hover:text-slate-900 focus:ring-0 w-24 p-0" />
                                        </form>

                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pl-1 border-l border-slate-200/50 ml-1">
                                            <form action={async () => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                const swapWith = (idx - 1) >= 0 ? sections[idx - 1] : null
                                                if (!swapWith) return
                                                await prisma.$transaction([
                                                    prisma.menuSection.update({ where: { id: s.id }, data: { sortOrder: swapWith.sortOrder } }),
                                                    prisma.menuSection.update({ where: { id: swapWith.id }, data: { sortOrder: s.sortOrder } })
                                                ])
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <button className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded">←</button>
                                            </form>
                                            <form action={async () => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                const swapWith = (idx + 1) < (sections || []).length ? sections[idx + 1] : null
                                                if (!swapWith) return
                                                await prisma.$transaction([
                                                    prisma.menuSection.update({ where: { id: s.id }, data: { sortOrder: swapWith.sortOrder } }),
                                                    prisma.menuSection.update({ where: { id: swapWith.id }, data: { sortOrder: s.sortOrder } })
                                                ])
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <button className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded">→</button>
                                            </form>
                                            <form action={async () => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                await prisma.$transaction(async (tx) => {
                                                    await tx.menuItem.updateMany({ where: { sectionId: s.id }, data: { sectionId: null } })
                                                    await tx.menuSection.delete({ where: { id: s.id } })
                                                })
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <button className="p-1 text-red-300 hover:text-red-600 hover:bg-red-50 rounded ml-1">×</button>
                                            </form>
                                        </div>
                                    </div>
                                ))}

                                <form className="flex items-center" action={async (formData: FormData) => {
                                    'use server'
                                    const session = await requireRole(['ADMIN'])
                                    if (!session) return
                                    const rawName = formData.get('name')
                                    const name = typeof rawName === 'string' ? rawName.trim() : ''
                                    if (!name) return
                                    const max = (sections || []).reduce((m: number, s: any) => Math.max(m, s.sortOrder ?? 0), 0)
                                    await prisma.menuSection.create({ data: { canteenId: canteen.id, name, sortOrder: max + 1 } })
                                    revalidatePath(`/admin/canteen/${canteen.id}`)
                                }}>
                                    <div className="flex items-center gap-1 pl-2">
                                        <Input name="name" placeholder="New Section..." className="h-9 text-sm w-32 bg-slate-50 border-dashed border-slate-300 focus:border-solid focus:bg-white" />
                                        <FormSubmitButton size="sm" className="h-9 w-9 p-0 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-colors">
                                            <span className="text-lg leading-none pb-0.5">+</span>
                                        </FormSubmitButton>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Add Item Form */}
                        <div className="mb-8 bg-slate-50 p-5 rounded-xl border border-slate-200/60 shadow-inner">
                            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="bg-green-100 text-green-700 p-1 rounded">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                </span>
                                Add New Item
                            </h3>
                            <form className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end" action={async (formData: FormData) => {
                                'use server'
                                const session = await requireRole(['ADMIN'])
                                if (!session) return
                                const rawName = formData.get('name')
                                const name = typeof rawName === 'string' ? rawName : ''
                                const rawPrice = formData.get('priceCents')
                                const priceCents = Number(rawPrice || 0)
                                const rawImg = formData.get('imageUrl')
                                const imageUrl = typeof rawImg === 'string' ? rawImg : ''
                                const rawSec = formData.get('sectionId')
                                const sectionId = (typeof rawSec === 'string' && rawSec) ? rawSec : null
                                if (!name || !priceCents) return
                                await prisma.menuItem.create({ data: { canteenId: canteen.id, name, priceCents, imageUrl: imageUrl || null, sectionId } })
                                revalidatePath(`/admin/canteen/${canteen.id}`)
                            }}>
                                <div className="md:col-span-4">
                                     <Input name="name" placeholder="Item Name (e.g. Masala Dosa)" className="bg-white border-slate-200" required />
                                </div>
                                <div className="md:col-span-2">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                        <Input name="priceCents" type="number" placeholder="0" className="pl-7 bg-white border-slate-200" required />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <select name="sectionId" className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all cursor-pointer">
                                        <option value="">Uncategorized</option>
                                        {(sections || []).map((s: MenuSectionShape) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <Input name="imageUrl" placeholder="Image URL (optional)" className="bg-white border-slate-200" />
                                </div>
                                <div className="md:col-span-2">
                                    <FormSubmitButton pendingLabel="Adding..." className="w-full h-10 bg-slate-900 text-white hover:bg-slate-800 font-medium">Add Item</FormSubmitButton>
                                </div>
                            </form>
                        </div>
                    </Card>

                </div>
            </div>

            {/* Items Table */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden p-0">
                        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                             <h3 className="text-sm font-semibold text-slate-900">All Menu Items ({items.length})</h3>
                        </div>
                        <Table className="w-full">
                            <THead>
                                <Tr className="bg-slate-50/50">
                                    <Th className="w-16 pl-6 text-xs uppercase tracking-wider text-slate-500 font-semibold">Image</Th>
                                    <Th className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Name</Th>
                                    <Th className="w-32 text-xs uppercase tracking-wider text-slate-500 font-semibold">Price</Th>
                                    <Th className="w-40 text-xs uppercase tracking-wider text-slate-500 font-semibold">Section</Th>
                                    <Th className="w-32 text-xs uppercase tracking-wider text-slate-500 font-semibold">Status</Th>
                                    <Th className="w-16 pr-6"></Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {items.length === 0 ? (
                                    <Tr>
                                        <Td colSpan={6} className="text-center py-12 text-slate-400 italic">
                                            No items added to the menu yet.
                                        </Td>
                                    </Tr>
                                ) : items.map((it: MenuItemShape) => (
                                    <Tr key={it.id} className="hover:bg-slate-50 transition-colors group">
                                        <Td className="py-3 pl-6 align-middle">
                                            {it.imageUrl ? (
                                                <Image
                                                    src={it.imageUrl}
                                                    alt={it.name}
                                                    width={40}
                                                    height={40}
                                                    unoptimized
                                                    className="h-10 w-10 rounded-lg object-cover bg-slate-100 border border-slate-200"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                                                    <span className="text-[10px]">IMG</span>
                                                </div>
                                            )}
                                        </Td>
                                        <Td className="py-3 align-middle font-medium text-slate-900">
                                            <form action={async (formData: FormData) => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                const rawName = formData.get('name')
                                                const name = typeof rawName === 'string' ? rawName : it.name
                                                await prisma.menuItem.update({ where: { id: it.id }, data: { name } })
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <div className="flex items-center gap-2">
                                                    <input name="name" defaultValue={it.name} className="bg-transparent w-full focus:outline-none focus:ring-0 font-medium text-slate-900 placeholder-slate-400" />
                                                    <FormSubmitButton variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-green-600 hover:bg-green-50 rounded">✓</FormSubmitButton>
                                                </div>
                                            </form>
                                        </Td>
                                        <Td className="py-3 align-middle">
                                            <form action={async (formData: FormData) => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                const priceCents = Number(formData.get('priceCents') || it.priceCents)
                                                await prisma.menuItem.update({ where: { id: it.id }, data: { priceCents } })
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <div className="flex items-center gap-1 bg-slate-50 rounded-md px-2 py-1 w-24 border border-transparent hover:border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                                    <span className="text-slate-400 text-xs">₹</span>
                                                    <input name="priceCents" defaultValue={(it.priceCents / 100).toFixed(2)} className="bg-transparent w-full text-sm font-mono text-slate-700 focus:outline-none" />
                                                </div>
                                            </form>
                                        </Td>
                                        <Td className="py-3 align-middle">
                                            <form action={async (formData: FormData) => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                const rawSec = formData.get('sectionId')
                                                const sectionId = (typeof rawSec === 'string' && rawSec) ? rawSec : null
                                                await prisma.menuItem.update({ where: { id: it.id }, data: { sectionId } })
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <select name="sectionId" defaultValue={it.sectionId ?? ''} className="bg-transparent text-sm w-full focus:outline-none cursor-pointer text-slate-600 hover:text-slate-900 py-1">
                                                    <option value="">Uncategorized</option>
                                                    {(sections || []).map((s: MenuSectionShape) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </form>
                                        </Td>
                                        <Td className="py-3 align-middle">
                                            <form action={async (formData: FormData) => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                const available = formData.get('available') === 'on'
                                                await prisma.menuItem.update({ where: { id: it.id }, data: { available } })
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <div className="flex items-center gap-2">
                                                    <label className="cursor-pointer inline-flex items-center relative">
                                                        <input 
                                                            type="checkbox" 
                                                            name="available" 
                                                            defaultChecked={it.available} 
                                                            className="peer sr-only" 
                                                        />
                                                        <div className={`
                                                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors
                                                            peer-checked:bg-green-100 peer-checked:text-green-800 bg-slate-100 text-slate-500
                                                        `}>
                                                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current"></span>
                                                            <span className="hidden peer-checked:inline">Active</span>
                                                            <span className="inline peer-checked:hidden">Hidden</span>
                                                        </div>
                                                    </label>
                                                    <FormSubmitButton variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600 hover:bg-green-50 rounded">✓</FormSubmitButton>
                                                </div>
                                            </form>
                                        </Td>
                                        <Td className="py-3 pr-6 align-middle text-right">
                                            <form action={async () => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                await prisma.menuItem.delete({ where: { id: it.id } })
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Item">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                </button>
                                            </form>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </Card>

        </div>
    )
}
