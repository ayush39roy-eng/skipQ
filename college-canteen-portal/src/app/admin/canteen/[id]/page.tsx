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
        <div className="p-6 space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin" className="text-sm text-[rgb(var(--text-muted))] hover:underline">← Back to Dashboard</Link>
            </div>

            <Card className="overflow-hidden border-[rgb(var(--border))] shadow-sm">
                {/* Canteen Header */}
                <div className="bg-[rgb(var(--surface-muted))]/30 p-4 sm:p-6 border-b border-[rgb(var(--border))]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-4">
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
                            <div>
                                <h2 className="text-xl font-bold">{canteen.name}</h2>
                                <p className="text-sm text-[rgb(var(--text-muted))] flex items-center gap-1">
                                    📍 {canteen.location}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 items-end">
                            <form className="flex items-center gap-2" action={async (formData: FormData) => {
                                'use server'
                                const session = await requireRole(['ADMIN'])
                                if (!session) return
                                const rawStart = formData.get('phones')
                                const raw = typeof rawStart === 'string' ? rawStart : ''
                                const arr = raw.split(',').map(p => p.trim()).filter(Boolean)
                                await prisma.canteen.update({ where: { id: canteen.id }, data: { notificationPhones: arr } })
                                revalidatePath(`/admin/canteen/${canteen.id}`)
                            }}>
                                <Input
                                    name="phones"
                                    defaultValue={canteen.notificationPhones?.join(',') ?? ''}
                                    placeholder="Notification Phones"
                                    className="w-48 text-xs h-8"
                                />
                                <FormSubmitButton variant="secondary" size="sm" pendingLabel="..." className="h-8 px-3 text-xs">Save</FormSubmitButton>
                            </form>

                            <form action={async () => {
                                'use server'
                                const session = await requireRole(['ADMIN'])
                                if (!session) return
                                try {
                                    const stored = await prisma.canteen.findUnique({ where: { id: canteen.id }, select: { id: true, name: true, notificationPhones: true } })
                                    const phones: string[] = stored?.notificationPhones ?? []
                                    if (phones.length) {
                                        const text = `Test alert from ${stored?.name ?? 'canteen'} — this is a notification test.`
                                        for (const p of phones) {
                                            try { await sendWhatsApp(p, { text }) } catch (err) { console.error('Test WhatsApp send failed', p, err) }
                                        }
                                    }
                                } catch (err) { console.error('Send test notification failed', err) }
                                revalidatePath(`/admin/canteen/${canteen.id}`)
                            }}>
                                <FormSubmitButton variant="outline" size="sm" pendingLabel="Sending..." className="h-8 text-xs">Test Alert</FormSubmitButton>
                            </form>
                        </div>
                    </div>

                    {/* Edit Canteen Form */}
                    <div className="mt-6 pt-4 border-t border-[rgb(var(--border))]">
                        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" action={async (formData: FormData) => {
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
                            <Input name="name" label="Edit Name" defaultValue={canteen.name} className="flex-1" required />
                            <Input name="location" label="Edit Location" defaultValue={canteen.location} className="flex-1" required />
                            <Input name="imageUrl" label="Image URL" defaultValue={canteen.imageUrl ?? ''} className="flex-[1.5]" />
                            <FormSubmitButton pendingLabel="Saving..." className="w-full sm:w-auto">Update Details</FormSubmitButton>
                        </form>

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
                </div>

                <div className="p-6">
                    {/* Sections Management */}
                    <div className="mb-6">
                        <h3 className="font-semibold mb-3">Menu Sections</h3>
                        <div className="flex flex-wrap gap-2">
                            {(sections || []).map((s: MenuSectionShape, idx: number) => (
                                <div key={s.id} className="group flex items-center gap-1 bg-[rgb(var(--surface-muted))] rounded-full pl-3 pr-1 py-1 border border-[rgb(var(--border))]">
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
                                        <input name="name" defaultValue={s.name} className="bg-transparent border-none text-sm font-medium focus:ring-0 w-24" />
                                    </form>

                                    <div className="flex items-center opacity-50 group-hover:opacity-100 transition-opacity">
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
                                            <button className="p-1 hover:text-[rgb(var(--accent))]">←</button>
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
                                            <button className="p-1 hover:text-[rgb(var(--accent))]">→</button>
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
                                            <button className="p-1 text-red-400 hover:text-red-600">×</button>
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
                                <div className="flex items-center gap-2">
                                    <Input name="name" placeholder="New Section" className="h-8 text-sm w-32" />
                                    <FormSubmitButton size="sm" className="h-8 w-8 p-0 flex items-center justify-center rounded-full">+</FormSubmitButton>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Add Item Form */}
                    <div className="mb-6 bg-[rgb(var(--surface-muted))]/20 p-4 rounded-lg border border-[rgb(var(--border))]">
                        <h3 className="text-sm font-semibold mb-3">Add Menu Item</h3>
                        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" action={async (formData: FormData) => {
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
                            const sectionId = typeof rawSec === 'string' ? rawSec : null
                            if (!name || !priceCents) return
                            await prisma.menuItem.create({ data: { canteenId: canteen.id, name, priceCents, imageUrl: imageUrl || null, sectionId } })
                            revalidatePath(`/admin/canteen/${canteen.id}`)
                        }}>
                            <Input name="name" placeholder="Item Name" className="flex-[2]" />
                            <Input name="priceCents" placeholder="Price (cents)" className="flex-1" />
                            <Input name="imageUrl" placeholder="Image URL" className="flex-[1.5]" />
                            <select name="sectionId" className="input flex-1">
                                <option value="">No Section</option>
                                {(sections || []).map((s: MenuSectionShape) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <FormSubmitButton pendingLabel="Adding...">Add</FormSubmitButton>
                        </form>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-hidden rounded-lg border border-[rgb(var(--border))]">
                        <Table>
                            <THead>
                                <Tr>
                                    <Th className="w-16">Img</Th>
                                    <Th>Name</Th>
                                    <Th className="w-24">Price</Th>
                                    <Th className="w-32">Section</Th>
                                    <Th className="w-24">Status</Th>
                                    <Th className="w-12"></Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {items.map((it: MenuItemShape) => (
                                    <Tr key={it.id}>
                                        <Td className="py-2">
                                            {it.imageUrl && (
                                                <Image
                                                    src={it.imageUrl}
                                                    alt={it.name}
                                                    width={40}
                                                    height={40}
                                                    unoptimized
                                                    className="h-10 w-10 rounded object-cover bg-[rgb(var(--surface-muted))]"
                                                />
                                            )}
                                        </Td>
                                        <Td className="py-2 font-medium">
                                            <form action={async (formData: FormData) => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                const rawName = formData.get('name')
                                                const name = typeof rawName === 'string' ? rawName : it.name
                                                await prisma.menuItem.update({ where: { id: it.id }, data: { name } })
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <div className="flex items-center gap-1">
                                                    <input name="name" defaultValue={it.name} className="bg-transparent w-full focus:outline-none focus:underline" />
                                                    <FormSubmitButton variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600">✓</FormSubmitButton>
                                                </div>
                                            </form>
                                        </Td>
                                        <Td className="py-2">
                                            <form action={async (formData: FormData) => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                const priceCents = Number(formData.get('priceCents') || it.priceCents)
                                                await prisma.menuItem.update({ where: { id: it.id }, data: { priceCents } })
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[rgb(var(--text-muted))]">₹</span>
                                                    <input name="priceCents" defaultValue={(it.priceCents / 100).toFixed(2)} className="bg-transparent w-16 focus:outline-none focus:underline" />
                                                    <FormSubmitButton variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600">✓</FormSubmitButton>
                                                </div>
                                            </form>
                                        </Td>
                                        <Td className="py-2">
                                            <form action={async (formData: FormData) => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                const rawSec = formData.get('sectionId')
                                                const sectionId = typeof rawSec === 'string' ? rawSec : null
                                                await prisma.menuItem.update({ where: { id: it.id }, data: { sectionId } })
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <div className="flex items-center gap-1">
                                                    <select name="sectionId" defaultValue={it.sectionId ?? ''} className="bg-transparent text-sm w-full focus:outline-none cursor-pointer">
                                                        <option value="">—</option>
                                                        {(sections || []).map((s: MenuSectionShape) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                    <FormSubmitButton variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600">✓</FormSubmitButton>
                                                </div>
                                            </form>
                                        </Td>
                                        <Td className="py-2">
                                            <form action={async (formData: FormData) => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                const available = formData.get('available') === 'on'
                                                await prisma.menuItem.update({ where: { id: it.id }, data: { available } })
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <div className="flex items-center gap-2">
                                                    <label className="cursor-pointer flex items-center">
                                                        <input type="checkbox" name="available" defaultChecked={it.available} className="hidden" />
                                                        <Badge variant={it.available ? 'success' : 'default'} className="cursor-pointer hover:opacity-80">
                                                            {it.available ? 'Active' : 'Hidden'}
                                                        </Badge>
                                                    </label>
                                                    <FormSubmitButton variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600">✓</FormSubmitButton>
                                                </div>
                                            </form>
                                        </Td>
                                        <Td className="py-2 text-right">
                                            <form action={async () => {
                                                'use server'
                                                const session = await requireRole(['ADMIN'])
                                                if (!session) return
                                                await prisma.menuItem.delete({ where: { id: it.id } })
                                                revalidatePath(`/admin/canteen/${canteen.id}`)
                                            }}>
                                                <button className="text-[rgb(var(--text-muted))] hover:text-red-500 transition-colors" title="Delete Item">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                </button>
                                            </form>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                </div>
            </Card>
        </div>
    )
}
