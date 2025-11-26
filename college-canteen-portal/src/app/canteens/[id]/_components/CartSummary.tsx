"use client"

import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Loader } from '@/components/ui/Loader'
import { useMemo } from 'react'

type Item = { id: string; name: string; priceCents: number; imageUrl?: string | null; description?: string | null }

interface CartSummaryProps {
    items: Item[]
    cart: Record<string, number>
    subtotalCents: number
    platformFeeCents: number
    grandTotalCents: number
    fulfillmentType: 'TAKEAWAY' | 'DINE_IN'
    setFulfillmentType: (type: 'TAKEAWAY' | 'DINE_IN') => void
    onCheckout: () => void
    onClear: () => void
    cartRestored?: boolean
    searchParamsResume?: boolean
    className?: string
    isCheckingOut?: boolean
}

export function CartSummary({
    items,
    cart,
    subtotalCents,
    platformFeeCents,
    grandTotalCents,
    fulfillmentType,
    setFulfillmentType,
    onCheckout,
    onClear,
    cartRestored,
    searchParamsResume,
    className = '',
    isCheckingOut = false
}: CartSummaryProps) {
    const fulfillmentOptions: { label: string, value: 'TAKEAWAY' | 'DINE_IN', description: string }[] = useMemo(() => ([
        { label: 'Takeaway', value: 'TAKEAWAY', description: 'Grab & go from the counter' },
        { label: 'Dine-in', value: 'DINE_IN', description: 'Enjoy at the seating area' }
    ]), [])

    return (
        <div className={`space-y-4 ${className}`}>
            {(cartRestored || searchParamsResume) && (
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                    {cartRestored ? (
                        'Cart restored after login. Review items and checkout to finish payment.'
                    ) : (
                        'Cart restored from URL/resumed session. Review items and checkout to finish payment.'
                    )}
                </div>
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">My Order</h3>
                    <p className="text-xs text-muted">Prep slot reserved for 10 minutes</p>
                </div>
                <button className="text-sm text-muted hover:text-[rgb(var(--text))]" onClick={onClear}>Clear</button>
            </div>
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/40 p-3 text-sm">
                <p className="font-medium text-[rgb(var(--text))]">Dining preference</p>
                <div className="mt-2 flex flex-col gap-2">
                    {fulfillmentOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setFulfillmentType(option.value)}
                            className={`rounded-xl border px-3 py-2 text-left transition ${fulfillmentType === option.value ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10 text-[rgb(var(--text))]' : 'border-[rgb(var(--border))] text-muted hover:border-[rgb(var(--accent))]/40'}`}
                        >
                            <span className="block text-sm font-semibold">{option.label}</span>
                            <span className="text-xs text-muted">{option.description}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="max-h-64 space-y-4 overflow-y-auto">
                {Object.entries(cart).filter(([, qty]) => qty > 0).map(([itemId, qty]) => {
                const it = items.find((x) => String(x.id) === String(itemId))
                // Render a fallback row when the lookup fails so the user always sees cart contents
                if (!it) {
                    return (
                      <div key={itemId} className="flex items-start gap-3">
                        <div className="h-16 w-16 rounded-lg bg-[rgb(var(--surface-muted))] flex items-center justify-center text-xs text-[rgb(var(--text-muted))]">No image</div>
                        <div className="flex-1">
                          <p className="font-medium">Unknown item</p>
                          <p className="text-sm text-muted">ID: {String(itemId)}</p>
                        </div>
                        <span className="text-sm font-semibold">×{qty}</span>
                      </div>
                    )
                }
                return (
                    <div key={itemId} className="flex items-start gap-3">
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                            <Image
                                src={it.imageUrl || '/placeholder.svg'}
                                alt={it.name}
                                fill
                                sizes="64px"
                                className="object-contain bg-[rgb(var(--surface-muted))] p-1"
                                style={{ objectFit: 'contain', objectPosition: 'center' }}
                            />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium">{it.name}</p>
                            <p className="text-sm text-muted">₹{(it.priceCents / 100).toFixed(2)}</p>
                        </div>
                        <span className="text-sm font-semibold">×{qty}</span>
                    </div>
                )
                })}
                {Object.values(cart).reduce((a, b) => a + b, 0) === 0 && (
                    <p className="text-center text-sm text-muted">No items added yet.</p>
                )}
            </div>
            <div className="space-y-2 border-t border-[rgb(var(--border))] pt-4 text-sm">
                <div className="flex justify-between text-muted"><span>Subtotal</span><span>₹{(subtotalCents / 100).toFixed(2)}</span></div>
                <div className="flex justify-between text-muted"><span>Platform fee (5%)</span><span>₹{(platformFeeCents / 100).toFixed(2)}</span></div>
                <div className="flex justify-between text-base font-semibold"><span>Total (charged)</span><span>₹{(grandTotalCents / 100).toFixed(2)}</span></div>
            </div>
            <Button variant="primary" size="lg" disabled={subtotalCents <= 0 || isCheckingOut} onClick={onCheckout} className="w-full rounded-xl">
                {isCheckingOut ? (
                    <span className="flex items-center justify-center gap-2">
                        <Loader size="small" />
                        Processing...
                    </span>
                ) : (
                    'Checkout & Pay'
                )}
            </Button>
        </div>
    )
}
