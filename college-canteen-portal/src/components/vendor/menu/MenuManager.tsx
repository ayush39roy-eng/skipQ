'use client'

import { useState } from 'react'
import { VendorItem } from '@/types/vendor'
import Image from 'next/image'
import { Toast, ToastType } from '@/components/ui/Toast'
import { toggleItemAvailability, upsertMenuItem, deleteMenuItem } from '@/app/vendor/actions'
import MenuFormModal from './MenuFormModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface MenuManagerProps {
  items: VendorItem[]
  vendorId: string
}

export default function MenuManager({ items: initialItems, vendorId: _vendorId }: MenuManagerProps) {
  const [items, setItems] = useState<VendorItem[]>(initialItems)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSection, setFilterSection] = useState('All')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  
  // -- MODAL STATE --
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<VendorItem | undefined>(undefined)

  // -- COMPUTED --
  // Use explicit type assertion or null check if needed, but TypeScript typically infers strings.
  const sections = ['All', ...Array.from(new Set(items.map(i => i.section || 'Other')))]
  
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSection = filterSection === 'All' || (item.section || 'Other') === filterSection
    return matchesSearch && matchesSection
  })

  // -- HANDLERS --
  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    // Optimistic
    setItems(prev => prev.map(i => i.id === id ? { ...i, available: !currentStatus } : i))
    
    try {
        const res = await toggleItemAvailability(id, !currentStatus) 
        if (!res.success) {
            showToast('Failed to update status', 'ERROR')
            // Revert
            setItems(prev => prev.map(i => i.id === id ? { ...i, available: currentStatus } : i))
        } else {
            showToast(`Item marked as ${!currentStatus ? 'Available' : 'Unavailable'}`, 'SUCCESS')
        }
    } catch (error: unknown) {
        showToast(error instanceof Error ? error.message : 'Failed to update status', 'ERROR')
        setItems(prev => prev.map(i => i.id === id ? { ...i, available: currentStatus } : i))
    }
  }

  const handleSaveItem = async (data: { name: string; section: string; priceCents: number; isVegetarian: boolean; available: boolean; imageUrl?: string; description?: string; id?: string }) => {
      const res = await upsertMenuItem({
          ...data,
          id: editingItem?.id 
      })

      if (res.success) {
          showToast('Item saved successfully', 'SUCCESS')
          setIsModalOpen(false)
          //Ideally we re-fetch or waiting for revalidatePath, but for better UX we could reload or optimistic update.
          window.location.reload() 
      } else {
          showToast(res.error || 'Failed to save item', 'ERROR')
          throw new Error(res.error)
      }
  }

  const handleDeleteItem = async (id: string) => {
      if (!confirm('Are you sure you want to delete this item?')) return

      try {
          const res = await deleteMenuItem(id)
          if (res.success) {
              showToast('Item deleted', 'SUCCESS')
              setItems(prev => prev.filter(i => i.id !== id))
          } else {
              showToast(res.error || 'Failed to delete', 'ERROR')
          }
      } catch (error: unknown) {
          showToast(error instanceof Error ? error.message : 'Failed to delete', 'ERROR')
      }
  }

  const openAddModal = () => {
      setEditingItem(undefined)
      setIsModalOpen(true)
  }

  const openEditModal = (item: VendorItem) => {
      setEditingItem(item)
      setIsModalOpen(true)
  }

  return (
    <div className="flex-1 min-h-screen pb-20 bg-vendor-bg text-vendor-text-primary">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <MenuFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveItem}
        initialData={editingItem}
        sections={sections.filter(s => s !== 'All')}
      />

      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-[var(--vendor-text-primary)]">Menu Management</h1>
           <p className="text-[var(--vendor-text-secondary)] mt-1">Manage your product catalog and availability.</p>
        </div>
        <Button 
           onClick={openAddModal}
           className="bg-[var(--vendor-accent)] hover:bg-emerald-600 text-white rounded-full px-6 shadow-md shadow-emerald-200"
        >
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
           Add Product
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
         {/* Search */}
         <div className="flex-1 bg-[var(--vendor-surface)] p-1 rounded-xl border border-[var(--vendor-border)] shadow-sm flex items-center gap-3 focus-within:ring-2 focus-within:ring-[var(--vendor-accent-muted)] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--vendor-text-secondary)] ml-3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
                type="text" 
                placeholder="Search items..." 
                className="flex-1 bg-transparent border-none outline-none text-[var(--vendor-text-primary)] placeholder:text-[var(--vendor-text-secondary)] font-medium h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         
         {/* Section Pills */}
         <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {sections.map(section => (
                <button
                    key={section}
                    onClick={() => setFilterSection(section)}
                    className={`px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                        filterSection === section 
                            ? 'bg-[var(--vendor-text-primary)] text-[var(--vendor-bg)] border-[var(--vendor-text-primary)] shadow-md' 
                            : 'bg-[var(--vendor-surface)] text-[var(--vendor-text-secondary)] border-[var(--vendor-border)] hover:border-[var(--vendor-text-secondary)]'
                    }`}
                >
                    {section}
                </button>
            ))}
         </div>
      </div>

      {/* Menu Table */}
      <div className="bg-vendor-surface rounded-xl border border-vendor-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-vendor-border bg-[var(--vendor-bg)]">
                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-vendor-text-secondary">Item Name</th>
                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-vendor-text-secondary">Section</th>
                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-vendor-text-secondary text-right">Price</th>
                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-vendor-text-secondary text-center">Availability</th>
                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-vendor-text-secondary text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vendor-divider">
              {filteredItems.map(item => (
                <tr key={item.id} className={`group transition-colors hover:bg-slate-50/50 ${!item.available ? 'opacity-60 bg-slate-50/30' : ''}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                         {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                         {(item as any).imageUrl ? (
                             <Image src={(item as { imageUrl?: string }).imageUrl ?? ''} alt={item.name} fill className="object-cover" sizes="40px" />
                         ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>
                         )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="font-semibold text-vendor-text-primary">{item.name}</p>
                           {item.isVegetarian ? (
                             <span className="h-3 w-3 border border-green-600 flex items-center justify-center p-[1px] rounded-[2px]" title="Vegetarian">
                               <span className="h-full w-full bg-green-600 rounded-[1px]"></span>
                             </span>
                           ) : (
                             <span className="h-3 w-3 border border-red-600 flex items-center justify-center p-[1px] rounded-[2px]" title="Non-Vegetarian">
                               <span className="h-full w-full bg-red-600 rounded-[1px]"></span>
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant="default" className="text-vendor-text-secondary border border-vendor-border font-medium bg-vendor-bg shadow-none box-border">
                      {item.section || 'Other'}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="font-mono font-medium text-vendor-text-primary">₹{(item.priceCents / 100).toFixed(2)}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                     <button 
                        onClick={() => handleToggleAvailability(item.id, item.available)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-vendor-accent focus:ring-offset-2 ${
                            item.available ? 'bg-vendor-accent' : 'bg-slate-200'
                        }`}
                     >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.available ? 'translate-x-6' : 'translate-x-1'}`} />
                     </button>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                       <button 
                          onClick={() => openEditModal(item)}
                          className="p-2 text-vendor-text-secondary hover:text-vendor-accent hover:bg-vendor-accent-soft rounded-lg transition-colors"
                          title="Edit"
                       >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                       </button>
                       <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 text-vendor-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                       >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredItems.length === 0 && (
             <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <p className="text-vendor-text-primary font-medium">No items found</p>
                <p className="text-vendor-text-secondary text-sm">Try adjusting your search or filters.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
