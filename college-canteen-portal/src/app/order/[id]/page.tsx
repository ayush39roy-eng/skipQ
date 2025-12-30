import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTicketNumber } from '@/lib/order-ticket'
import OrderStatusClient from '../_components/status-client'
import PayNowButton from '../_components/pay-now-button'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { CheckCircle2, Receipt } from 'lucide-react'

export default async function OrderPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession()
  if (!session) {
    redirect(`/login?next=/order/${params.id}`)
  }

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { items: { include: { menuItem: true } }, payment: true, canteen: true } })
  if (!order) return <p>Order not found.</p>

  const isOwner = session.userId === order.userId
  const isAdmin = session.role === 'ADMIN'
  const isVendor = session.role === 'VENDOR' && session.user.vendorId === order.vendorId

  if (!isOwner && !isAdmin && !isVendor) {
    return <div className="p-8 text-center text-red-500 font-black">UNAUTHORIZED ACCESS</div>
  }
  const total = (order.totalCents / 100).toFixed(2)
  const status = order.status

  return (
    <div className="min-h-screen pb-20 pt-8">
       <div className="max-w-xl mx-auto space-y-8">
           
           {/* Header */}
           <div className="text-center space-y-2">
               <h1 className="text-4xl font-black uppercase tracking-tighter">Mission Status</h1>
               <div className="inline-block bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full">
                   Order #{getTicketNumber(order.id)}
               </div>
           </div>

           {/* The Ticket (Receipt) */}
           <div className="bg-white border-4 border-black rounded-lg shadow-[8px_8px_0px_0px_#000] overflow-hidden relative">
               
               {/* ZigZag Top */}
               <div className="h-4 bg-black w-full absolute top-0 left-0 hidden lg:block" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)'}}></div>

               <div className="p-8 pt-10 space-y-6">
                   <div className="flex justify-between items-start border-b-4 border-dashed border-black pb-6">
                        <div>
                            <p className="text-xs font-bold uppercase text-slate-500 mb-1">Kitchen</p>
                            <h2 className="text-2xl font-black uppercase">{order.canteen.name}</h2>
                        </div>
                        <Receipt className="w-8 h-8 text-slate-300" />
                   </div>

                   {/* Items List */}
                   <div className="space-y-3">
                       {order.items.map(it => (
                           <div key={it.id} className="flex justify-between items-center font-bold text-sm">
                               <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 bg-[#FFF8F0] border-2 border-black flex items-center justify-center text-xs font-black rounded">
                                       {it.quantity}x
                                   </div>
                                   <span className="uppercase">{it.menuItem.name}</span>
                               </div>
                               <span>₹{(it.priceCents * it.quantity / 100).toFixed(2)}</span>
                           </div>
                       ))}
                   </div>

                   <div className="border-t-4 border-black my-4"></div>

                   {/* Pricing */}
                   <div className="space-y-2">
                       <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                           <span>Subtotal</span>
                           <span>₹{((order.totalCents - (order.commissionCents || 0))/100).toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                           <span>Platform Fee</span>
                           <span>₹{((order.commissionCents || 0)/100).toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between text-2xl font-black uppercase pt-2">
                           <span>Total</span>
                           <span>₹{total}</span>
                       </div>
                   </div>

                   {/* Active Status Tracker */}
                   <div className="bg-[#FFF8F0] border-2 border-black p-4 rounded-xl mt-6">
                        <p className="text-xs font-black uppercase tracking-wider mb-3">Live Protocol</p>
                        <OrderStatusClient 
                            orderId={order.id} 
                            initialStatus={status} 
                            initialPrep={order.prepMinutes ?? null} 
                            initialPaymentStatus={order.payment?.status ?? null} 
                        />
                   </div>

                   <div className="mt-6">
                        {!order.payment || order.payment.status !== 'PAID' ? (
                        <div className="animate-pulse">
                            <PayNowButton orderId={order.id} />
                        </div>
                        ) : (
                        <div className="flex items-center justify-center gap-2 bg-[#06D6A0] text-black font-black uppercase py-3 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#000]">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Payment Verified</span>
                        </div>
                        )}
                    </div>
               </div>
               
               {/* ZigZag Bottom */}
               <div className="h-4 bg-black w-full absolute bottom-0 left-0 hidden lg:block" style={{ clipPath: 'polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)'}}></div>
           </div>

           {/* Footer Action */}
           <div className="flex justify-center gap-4">
               <Link href="/canteens" className="px-6 py-3 bg-[#FF9F1C] border-2 border-black font-black uppercase text-sm rounded-lg shadow-[4px_4px_0px_0px_#000] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] transition-all">
                  Return to Base
               </Link>
           </div>
       </div>
    </div>
  )
}
