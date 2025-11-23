"use client"

import { useState, ComponentProps } from 'react'
import { CartSummary } from './CartSummary'

type Props = ComponentProps<typeof CartSummary>

export function MobileCartPill(props: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const { cart, grandTotalCents } = props

    const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)

    if (totalItems === 0) return null

    return (
        <>
            {/* Pill */}
            <div className="fixed bottom-6 left-4 right-4 z-50 lg:hidden">
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex w-full items-center justify-between rounded-full bg-[rgb(var(--accent))] px-4 py-3 text-white shadow-lg shadow-[rgb(var(--accent))]/40 transition active:scale-95"
                >
                    <div className="flex flex-col items-start">
                        <span className="text-xs font-medium uppercase opacity-90">{totalItems} items</span>
                        <span className="text-sm font-bold">₹{(grandTotalCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">View Cart</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                    </div>
                </button>
            </div>

            {/* Sheet/Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setIsOpen(false)}>
                    <div
                        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold">Your Cart</h2>
                            <button onClick={() => setIsOpen(false)} className="rounded-full bg-[rgb(var(--surface-muted))] p-2 text-[rgb(var(--text-muted))] transition hover:bg-[rgb(var(--surface))] hover:text-[rgb(var(--text))]">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                            </button>
                        </div>
                        <CartSummary {...props} />
                    </div>
                </div>
            )}
        </>
    )
}
