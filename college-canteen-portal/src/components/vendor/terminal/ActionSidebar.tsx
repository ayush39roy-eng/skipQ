'use client'

import { useState } from 'react'
import { VendorItem, VendorOrder, PaymentMode, FulfillmentType } from '@/types/vendor'

interface ActionSidebarProps {
  // Mode 1: Order Details
  selectedOrder: VendorOrder | null
  onCloseOrder: () => void
  onUpdateStatus: (orderId: string, status: string) => void
  
  // Mode 2: Cart (Walk-in)
  cart: { item: VendorItem; qty: number }[]
  onRemoveFromCart: (itemId: string) => void
  onClearCart: () => void
  onPlaceOrder: (paymentMode: PaymentMode, fulfillmentType: FulfillmentType) => void
}

export function ActionSidebar({
  selectedOrder,
  onCloseOrder,
  onUpdateStatus,
  cart,
  onRemoveFromCart,
  onClearCart,
  onPlaceOrder
}: ActionSidebarProps) {
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('DINE_IN')
  const cartTotal = cart.reduce((acc, c) => acc + (c.item.priceCents * c.qty), 0)

  // -- ORDER DETAILS VIEW --
  if (selectedOrder) {
    const subtotalCents = selectedOrder.items.reduce((acc, i) => acc + (i.priceCents * i.quantity), 0)
    const taxCents = selectedOrder.totalCents - subtotalCents

    return (
      <div className="flex w-[380px] flex-col bg-vendor-surface border-l border-vendor-border h-full text-vendor-text-primary">
         <div className="p-6 border-b border-vendor-border">
            <div className="flex justify-between items-start mb-2">
               <div>
                  <h2 className="text-xl font-bold text-vendor-text-primary leading-tight">Order {selectedOrder.ticket}</h2>
                  <p className="text-xs text-vendor-text-secondary font-medium mt-1">
                     {selectedOrder.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {selectedOrder.source}
                  </p>
               </div>
               <button onClick={onCloseOrder} className="p-2 hover:bg-vendor-bg rounded-full text-vendor-text-secondary">✕</button>
            </div>
            
            <div className="flex gap-2 mt-4">
               <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md ${
                  selectedOrder.fulfillmentType === 'DINE_IN' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
               }`}>
                  {selectedOrder.fulfillmentType.replace('_', ' ')}
               </span>

               <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md ${
                  selectedOrder.paymentStatus === 'PAID' 
                     ? 'bg-emerald-50 text-emerald-600' 
                     : 'bg-yellow-50 text-yellow-600'
               }`}>
                  {selectedOrder.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid'}
               </span>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
               {selectedOrder.items.map((line, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                     <div className="flex gap-3">
                        <div className="h-5 w-5 rounded bg-vendor-accent-soft text-vendor-accent flex items-center justify-center text-[10px] font-bold mt-0.5">
                           {line.quantity}
                        </div>
                        <div>
                           <p className="text-sm font-medium text-vendor-text-primary leading-snug">{line.name}</p>
                           <p className="text-[10px] text-vendor-text-secondary">No notes</p>
                        </div>
                     </div>
                     <span className="text-sm font-bold text-vendor-text-primary">₹{line.priceCents * line.quantity / 100}</span>
                  </div>
               ))}
            </div>

            <div className="border-t border-dashed border-vendor-border my-6 pt-4 space-y-2">
               <div className="flex justify-between text-xs text-vendor-text-secondary">
                  <span>Subtotal</span>
                  <span>₹{(subtotalCents / 100).toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-xs text-vendor-text-secondary">
                  <span>Tax (5%)</span>
                  <span>₹{(taxCents / 100).toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-sm font-bold text-vendor-text-primary pt-2">
                  <span>Total</span>
                  <span className="text-lg">₹{(selectedOrder.totalCents / 100).toFixed(2)}</span>
               </div>
            </div>
         </div>

         <div className="p-6 border-t border-vendor-border bg-vendor-bg">
             {selectedOrder.status === 'PENDING' && (
               <button 
                  onClick={() => onUpdateStatus(selectedOrder.id, 'ACCEPTED')}
                  className="w-full bg-vendor-accent hover:opacity-90 text-white font-bold py-3.5 rounded-xl shadow-none transition-all text-sm tracking-wide"
               >
                  Accept Order
               </button>
             )}
             {selectedOrder.status === 'ACCEPTED' && (
               <button 
                  onClick={() => onUpdateStatus(selectedOrder.id, 'READY')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-none transition-all text-sm tracking-wide"
               >
                  Mark Ready
               </button>
             )}
             {selectedOrder.status === 'READY' && (
               <button 
                  onClick={() => onUpdateStatus(selectedOrder.id, 'COMPLETED')}
                  className="w-full bg-vendor-text-primary hover:opacity-90 text-vendor-bg font-bold py-3.5 rounded-xl shadow-none transition-all text-sm tracking-wide"
               >
                  Complete
               </button>
             )}
         </div>
      </div>
    )
  }

  // -- CART VIEW --
  return (
    <div className="flex w-[380px] flex-col bg-vendor-surface border-l border-vendor-border h-full shadow-lg z-20 text-vendor-text-primary">
       <div className="p-6 border-b border-vendor-border">
          <h2 className="text-xl font-bold text-vendor-text-primary">Current Bill</h2>
          
          <div className="flex bg-vendor-bg p-1 rounded-lg mt-4 border border-vendor-border">
             <button 
                onClick={() => setFulfillmentType('DINE_IN')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                   fulfillmentType === 'DINE_IN' ? 'bg-white text-vendor-text-primary shadow-sm' : 'text-vendor-text-secondary'
                }`}
             >
                Dine In
             </button>
             <button 
                onClick={() => setFulfillmentType('TAKEAWAY')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                   fulfillmentType === 'TAKEAWAY' ? 'bg-white text-vendor-text-primary shadow-sm' : 'text-vendor-text-secondary'
                }`}
             >
                Takeaway
             </button>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {cart.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-vendor-text-secondary opacity-60">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg>
                <p className="mt-2 text-sm font-medium">Cart is empty</p>
             </div>
          ) : (
             cart.map((line, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 hover:bg-vendor-bg rounded-xl transition-colors group">
                   <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-1">
                         <div className="h-6 w-6 rounded-md bg-vendor-accent-soft text-vendor-accent font-bold text-xs flex items-center justify-center">
                           {line.qty}
                         </div>
                      </div>
                      <div>
                         <p className="text-sm font-bold text-vendor-text-primary">{line.item.name}</p>
                         <p className="text-[10px] text-vendor-text-secondary">₹{line.item.priceCents/100} x {line.qty}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-vendor-text-primary">₹{line.item.priceCents * line.qty / 100}</span>
                      <button onClick={() => onRemoveFromCart(line.item.id)} className="text-vendor-text-secondary hover:text-vendor-danger opacity-0 group-hover:opacity-100 transition-all">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                   </div>
                </div>
             ))
          )}
       </div>

       <div className="p-6 bg-vendor-bg border-t border-vendor-border">
          <div className="space-y-2 mb-6 border-b border-dashed border-vendor-border pb-4">
             <div className="flex justify-between items-center text-xs text-vendor-text-secondary">
                <span>Subtotal</span>
                <span>₹{(cartTotal / 100).toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-xs text-vendor-text-secondary">
                <span>Tax (5%)</span>
                <span>₹{(cartTotal * 0.05 / 100).toFixed(2)}</span>
             </div>
          </div>
          <div className="flex justify-between items-center mb-4">
             <span className="text-sm font-bold text-vendor-text-primary">Total Payable</span>
             <span className="text-2xl font-black text-vendor-text-primary">₹{(cartTotal * 1.05 / 100).toFixed(2)}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
             <button 
               onClick={() => onPlaceOrder('CASH', fulfillmentType)}
               disabled={cart.length === 0}
               className="bg-white border border-vendor-border text-vendor-text-primary font-bold py-3 rounded-xl hover:bg-vendor-bg transition-colors text-sm disabled:opacity-50"
             >
                Cash
             </button>
<button 
  onClick={() => onPlaceOrder('UPI', fulfillmentType)}
  disabled={cart.length === 0}
  className="bg-white border border-vendor-border text-vendor-text-primary font-bold py-3 rounded-xl hover:bg-vendor-bg transition-colors text-sm disabled:opacity-50"
>
   UPI / QR
</button>          </div>
          <button 
             onClick={() => onPlaceOrder('HOLD', fulfillmentType)}
             disabled={cart.length === 0}
             className="w-full bg-vendor-accent hover:opacity-90 text-white font-bold py-4 rounded-xl shadow-none transition-all text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
             Print Bill & Hold
          </button>
       </div>
    </div>
  )
}
