import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTicketNumber } from '@/lib/order-ticket'
import OrderStatusClient from '../_components/status-client'
import PayNowButton from '../_components/pay-now-button'

import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function OrderPage({ params }: { params: { id: string } }) {
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
    return <div className="p-8 text-center text-red-500">You are not authorized to view this order.</div>
  }
  const total = (order.totalCents / 100).toFixed(2)
  const status = order.status
  return (
    <div className="space-y-6">
      <div className="max-w-md mx-auto">
        <div className="game-card rounded-2xl bg-white p-6 border-2 border-black shadow-game-md">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Ticket #{getTicketNumber(order.id)}</h2>
              <div className="text-sm text-[rgb(var(--text-muted))] mt-1">Canteen: <span className="font-medium text-[rgb(var(--text))]">{order.canteen.name}</span></div>
            </div>
            <div />
          </div>

          <hr className="my-4 border-[rgb(var(--border))]" />

          <ul className="divide-y divide-[rgb(var(--border))] rounded-md overflow-hidden text-sm">
            {order.items.map(it => (
              <li key={it.id} className="flex items-center justify-between px-4 py-3">
                <div className="text-sm text-[rgb(var(--text))]">{it.menuItem.name} <span className="text-[rgb(var(--text-muted))]">× {it.quantity}</span></div>
                <div className="font-medium">₹{(it.priceCents * it.quantity / 100).toFixed(2)}</div>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-[rgb(var(--border))] pt-4">
            <div className="flex items-center justify-between text-sm text-[rgb(var(--text-muted))]">
              <div>Platform fee</div>
              <div className="font-medium">₹{((order.commissionCents ?? 0) / 100).toFixed(2)}</div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-sm text-[rgb(var(--text-muted))]">Total</div>
              <div className="text-2xl font-semibold">₹{total}</div>
            </div>
          </div>

          {order.cookingInstructions && (
            <div className="mt-3 text-sm text-[rgb(var(--text-muted))]">Instruction: <span className="font-medium text-[rgb(var(--text))]">{order.cookingInstructions}</span></div>
          )}

          <div className="mt-5">
            <div className="text-sm text-[rgb(var(--text-muted))] mb-2">Current Status:</div>
            <div className="flex items-center gap-3">
              <OrderStatusClient orderId={order.id} initialStatus={status} initialPrep={order.prepMinutes ?? null} initialPaymentStatus={order.payment?.status ?? null} />
            </div>
          </div>

          {/* StatusClient renders refund notice when status changes; avoid duplicate server banner */}

          <div className="mt-6">
            {!order.payment || order.payment.status !== 'PAID' ? (
              <PayNowButton orderId={order.id} />
            ) : (
              <div className="text-sm text-green-500">Payment received.</div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <Link className="game-btn w-1/2 text-center text-sm px-4 py-2" href="/order">Order history</Link>
          <Link className="game-btn w-1/2 text-center text-sm px-4 py-2" href="/canteens">Order More</Link>
        </div>

        {order.payment && order.payment.status === 'PENDING' && (
          <div className="game-card space-y-2 mt-4 p-4 rounded-xl">
            <div className="text-sm font-medium">Payment link</div>
{order.payment.paymentLink ? (
  <Link className="game-btn w-full text-center py-2" href={order.payment.paymentLink}>Open Payment Page</Link>
) : (
  <button className="game-btn w-full text-center py-2 opacity-50 cursor-not-allowed" disabled>Payment link unavailable</button>
)}          </div>
        )}
      </div>
    </div>
  )
}
