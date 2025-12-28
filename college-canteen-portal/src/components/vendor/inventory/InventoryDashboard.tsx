'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InventoryItem } from '@prisma/client'
import { Toast, ToastType } from '@/components/ui/Toast'
import { updateInventoryQuantity, deleteInventoryItem } from '@/app/vendor/actions'
import UpsertInventoryModal from './UpsertInventoryModal'
import { Button } from '@/components/ui/Button'

interface InventoryDashboardProps {
  items: InventoryItem[]
  vendorId: string
}

export default function InventoryDashboard({ items: initialItems, vendorId }: InventoryDashboardProps) {
  const router = useRouter()
  const [items, setItems] = useState<InventoryItem[]>(initialItems)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  
  // -- MODAL STATE --
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null)

  // -- COMPUTED --
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lowStockCount = items.filter(i => i.quantity <= i.minThreshold).length

  // -- HANDLERS --
  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUpdateStock = async (id: string, newQty: number) => {
    // Optimistic Update
    const previousItems = [...items]
    setItems(prev => prev.map(item => 
        item.id === id ? { ...item, quantity: newQty } : item
    ))

    try {
        // Server Call
        const res = await updateInventoryQuantity(id, newQty)
        if (!res.success) {
             showToast('Failed to update stock', 'ERROR')
             setItems(previousItems)
        }
    } catch {
        showToast('Failed to update stock', 'ERROR')
        setItems(previousItems)
    }
  }

  const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to delete this item?')) return

      const res = await deleteInventoryItem(id)
      if (res.success) {
          showToast('Item deleted successfully', 'SUCCESS')
          // Optimistic update not strictly needed as page revalidates, 
          // but for instant feedback:
          setItems(prev => prev.filter(i => i.id !== id))
      } else {
          showToast('Failed to delete item', 'ERROR')
      }
  }

  const escapeCSV = (value: string | number): string => {
      const str = String(value)
      // Escape values that could be formulas (CSV Injection)
      if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
        return `"'${str.replace(/"/g, '""')}"`
      }
      // Escape values containing special characters
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
  }

  const handleExportCSV = () => {
      const headers = ['Name', 'Category', 'Quantity', 'Unit', 'Min Threshold', 'Cost (Cents)']
      const rows = filteredItems.map(item => [
          escapeCSV(item.name),
          escapeCSV(item.category),
          escapeCSV(item.quantity),
          escapeCSV(item.unit),
          escapeCSV(item.minThreshold),
          escapeCSV(item.costPerUnit || 0)
      ])

      const csvContent = "data:text/csv;charset=utf-8," 
          + [headers.join(','), ...rows.map(e => e.join(','))].join("\n")

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
  }

  const openAddModal = () => {
      setItemToEdit(null)
      setIsModalOpen(true)
  }

  const openEditModal = (item: InventoryItem) => {
      setItemToEdit(item)
      setIsModalOpen(true)
  }

  return (
    <div className="flex-1 min-h-screen pb-20 bg-vendor-bg text-vendor-text-primary">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <UpsertInventoryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemToEdit={itemToEdit}
        vendorId={vendorId}
        onSuccess={(msg, type, data) => {
            showToast(msg, type)
            if (type === 'SUCCESS') {
               if (data) {
                   setItems(prev => {
                       const exists = prev.some(i => i.id === data.id)
                       if (exists) {
                           return prev.map(i => i.id === data.id ? data : i)
                       }
                       return [data, ...prev]
                   })
               }
               router.refresh()
            }
        }}
      />

      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-[var(--vendor-text-primary)]">Inventory Management</h1>
           <p className="text-[var(--vendor-text-secondary)] mt-1">Track stock levels and manage supplies.</p>
        </div>
        <div className="flex gap-3">
            <Button 
                variant="outline"
                onClick={handleExportCSV}
                className="bg-[var(--vendor-surface)] text-[var(--vendor-text-primary)] border-[var(--vendor-border)] hover:bg-[var(--vendor-bg)]"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export
            </Button>
            <Button 
                onClick={openAddModal}
                className="bg-[var(--vendor-accent)] hover:bg-emerald-600 text-white shadow-md shadow-emerald-200"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Item
            </Button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-[var(--vendor-surface)] p-6 rounded-2xl shadow-sm border border-[var(--vendor-border)]">
            <h3 className="text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-2">Total Items</h3>
            <p className="text-4xl font-black text-[var(--vendor-text-primary)]">{items.length}</p>
         </div>
         <div className="bg-[var(--vendor-surface)] p-6 rounded-2xl shadow-sm border border-[var(--vendor-border)]">
             <h3 className="text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-2">Low Stock Alerts</h3>
            <div className="flex items-center gap-3">
               <p className={`text-4xl font-black ${lowStockCount > 0 ? 'text-amber-600' : 'text-[var(--vendor-text-primary)]'}`}>
                  {lowStockCount}
               </p>
               {lowStockCount > 0 && <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-md">Restock Needed</span>}
            </div>
         </div>
         <div className="bg-[var(--vendor-surface)] p-6 rounded-2xl shadow-sm border border-[var(--vendor-border)]">
            <h3 className="text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-2">Estimated Value</h3>
            <p className="text-4xl font-black text-[var(--vendor-text-primary)]">₹{(items.reduce((acc, i) => acc + (i.quantity * (i.costPerUnit || 0)), 0) / 100).toLocaleString()}</p>
         </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[var(--vendor-surface)] p-1 rounded-xl border border-[var(--vendor-border)] shadow-sm mb-6 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[var(--vendor-accent-muted)] transition-all">
         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--vendor-text-secondary)] ml-3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
         <input 
            type="text" 
            placeholder="Search inventory details..." 
            className="flex-1 bg-transparent border-none outline-none text-[var(--vendor-text-primary)] placeholder:text-[var(--vendor-text-secondary)] font-medium h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
         />
      </div>

      {/* Inventory Table */}
      <div className="bg-[var(--vendor-surface)] rounded-2xl border border-[var(--vendor-border)] shadow-sm overflow-hidden">
         <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--vendor-bg)] border-b border-[var(--vendor-border)]">
               <tr>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider">Item Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider">Category</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider">Stock Level</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider">Unit</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider">Action</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-[var(--vendor-border)]">
               {filteredItems.length > 0 ? (
                  filteredItems.map(item => {
                     const isLowStock = item.quantity <= item.minThreshold
                     return (
                        <tr key={item.id} className="hover:bg-[var(--vendor-bg)]/50 transition-colors group">
                           <td className="py-4 px-6">
                              <p className="font-bold text-[var(--vendor-text-primary)]">{item.name}</p>
                              {isLowStock && <span className="inline-block mt-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">Low Stock</span>}
                           </td>
                           <td className="py-4 px-6">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--vendor-bg)] text-[var(--vendor-text-secondary)] border border-[var(--vendor-border)]">
                                 {item.category}
                              </span>
                           </td>
                           <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                 <button 
                                    onClick={() => handleUpdateStock(item.id, Math.max(0, item.quantity - 1))}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--vendor-border)] text-[var(--vendor-text-secondary)] hover:bg-[var(--vendor-bg)] hover:text-red-500 transition-colors"
                                 >
                                    -
                                 </button>
                                 <span className={`font-mono font-bold text-lg min-w-[3ch] text-center ${isLowStock ? 'text-amber-600' : 'text-[var(--vendor-text-primary)]'}`}>
                                    {item.quantity}
                                 </span>
                                 <button 
                                    onClick={() => handleUpdateStock(item.id, item.quantity + 1)}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--vendor-border)] text-[var(--vendor-text-secondary)] hover:bg-[var(--vendor-bg)] hover:text-emerald-500 transition-colors"
                                 >
                                    +
                                 </button>
                              </div>
                           </td>
                           <td className="py-4 px-6 text-sm font-medium text-[var(--vendor-text-secondary)]">{item.unit}</td>
                           <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => openEditModal(item)}
                                    className="text-sm font-bold text-[var(--vendor-text-secondary)] hover:text-[var(--vendor-text-primary)] underline decoration-[var(--vendor-border)] underline-offset-4"
                                >
                                    Edit
                                </button>
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="text-sm font-bold text-red-300 hover:text-red-500 underline decoration-red-100 underline-offset-4 transition-colors"
                                >
                                    Delete
                                </button>
                              </div>
                           </td>
                        </tr>
                     )
                  })
               ) : (
                  <tr>
                     <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                        No inventory items found.
                     </td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>
    </div>
  )
}
