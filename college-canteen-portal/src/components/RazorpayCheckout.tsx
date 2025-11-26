'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { Loader } from '@/components/ui/Loader'

interface RazorpayCheckoutProps {
    orderId: string
    amount: number // in paise
    currency: string
    razorpayKeyId: string
    razorpayOrderId: string
    name: string
    description: string
    prefill: {
        name: string
        email: string
        contact: string
    }
}

interface RazorpayResponse {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
}

interface RazorpayError {
    description: string
}

interface RazorpayOptions {
    key: string
    amount: number
    currency: string
    name: string
    description: string
    order_id: string
    handler: (response: RazorpayResponse) => void
    prefill: {
        name: string
        email: string
        contact: string
    }
    theme?: {
        color: string
    }
    modal?: {
        ondismiss?: () => void
    }
}

declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => {
            open: () => void
            on: (event: string, handler: (response: { error: RazorpayError }) => void) => void
        }
    }
}

export function RazorpayCheckout({
    orderId,
    amount,
    currency,
    razorpayKeyId,
    razorpayOrderId,
    name,
    description,
    prefill,
}: RazorpayCheckoutProps) {
    const router = useRouter()
    const [isLoaded, setIsLoaded] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    useEffect(() => {
        if (window.Razorpay) {
            setIsLoaded(true)
        }
    }, [])

    const handlePayment = () => {
        if (!window.Razorpay) {
            alert('Razorpay SDK not loaded. Please check your internet connection.')
            return
        }

        setIsProcessing(true)
        const options: RazorpayOptions = {
            key: razorpayKeyId,
            amount: amount,
            currency: currency,
            name: name,
            description: description,
            order_id: razorpayOrderId,
            handler: async function (response: RazorpayResponse) {
                // Handler success - keep loading state active while we confirm server-side.
                try {
                    setIsProcessing(true)
                    const res = await fetch('/api/payment/confirm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    })

                    if (!res.ok) {
                        const body = await res.text().catch(() => '')
                        console.error('Payment confirmation failed', res.status, body)
                        alert('Payment confirmation failed. Please contact support.')
                        setIsProcessing(false)
                        return
                    }

                    // Confirmation succeeded — navigate to order ticket (no sensitive data in URL)
                    router.push(`/order/${orderId}`)
                } catch (err) {
                    console.error('Error confirming payment', err)
                    alert('Network error while confirming payment. Please check your connection.')
                    setIsProcessing(false)
                }
            },
            prefill: {
                name: prefill.name,
                email: prefill.email,
                contact: prefill.contact,
            },
            theme: {
                color: '#3399cc',
            },
            modal: {
                ondismiss: function () {
                    // Handle modal dismissal - reset loading state
                    setIsProcessing(false)
                }
            }
        }

        const rzp1 = new window.Razorpay(options)
        rzp1.on('payment.failed', function (response: { error: RazorpayError }) {
            alert(response.error.description)
            setIsProcessing(false)
        })
        rzp1.open()
    }

    return (
        <>
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
                onLoad={() => setIsLoaded(true)}
            />
            <button
                onClick={handlePayment}
                disabled={!isLoaded || isProcessing}
                className="btn w-full py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
                {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                        <Loader size="small" />
                        Processing Payment...
                    </span>
                ) : isLoaded ? (
                    'Pay Now'
                ) : (
                    'Loading Payment...'
                )}
            </button>
        </>
    )
}
