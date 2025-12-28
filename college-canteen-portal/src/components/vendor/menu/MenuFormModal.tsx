'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { VendorItem } from '@/types/vendor'
import { Button } from '@/components/ui/Button'

interface MenuItemFormData {
  name: string
  price: string
  section: string
  isVegetarian: boolean
  available: boolean
  imageUrl: string
  description: string
  id?: string
  priceCents: number
}

interface ExtendedVendorItem extends VendorItem {
  imageUrl?: string
  description?: string
}

interface MenuFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: MenuItemFormData) => Promise<void>
  initialData?: ExtendedVendorItem // If editing
  sections: string[]
}

export default function MenuFormModal({ isOpen, onClose, onSave, initialData, sections }: MenuFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '', // Input as string for easier handling of backspace
    section: '',
    isVegetarian: true,
    available: true,
    imageUrl: '',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        price: (initialData.priceCents / 100).toString(),
        section: initialData.section || '',
        isVegetarian: initialData.isVegetarian,
        available: initialData.available,
        imageUrl: initialData.imageUrl || '',
        description: initialData.description || ''
      })
    } else {
      setFormData({
        name: '',
        price: '',
        section: sections.length > 0 && sections[0] !== 'All' ? sections[0] : (sections.find(s => s !== 'All') || ''),        isVegetarian: true,
        available: true,
        imageUrl: '',
        description: ''
      })
    }
    setError('')
  }, [initialData, isOpen, sections])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      if (!formData.name || !formData.price || !formData.section) {
        throw new Error('Please fill in all required fields')
      }

      const price = parseFloat(formData.price)
      if (isNaN(price) || !isFinite(price) || price < 0) {
        throw new Error('Please enter a valid price')
      }

      await onSave({
        ...formData,
        id: initialData?.id,
        priceCents: Math.round(price * 100)
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Item' : 'Add New Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50">
                {error}
            </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-[var(--vendor-text-secondary)] mb-1">Item Name</label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-[var(--vendor-border)] rounded-lg bg-[var(--vendor-bg)] text-[var(--vendor-text-primary)] focus:ring-2 focus:ring-[var(--vendor-accent)] outline-none"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Masala Dosa"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-[var(--vendor-text-secondary)] mb-1">Price (₹)</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full px-3 py-2 border border-[var(--vendor-border)] rounded-lg bg-[var(--vendor-bg)] text-[var(--vendor-text-primary)] focus:ring-2 focus:ring-[var(--vendor-accent)] outline-none"
                    value={formData.price}
                    onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-[var(--vendor-text-secondary)] mb-1">Category</label>
                <div className="flex gap-2">
                    <input 
                        list="sections" 
                        name="section"
                        className="w-full px-3 py-2 border border-[var(--vendor-border)] rounded-lg bg-[var(--vendor-bg)] text-[var(--vendor-text-primary)] focus:ring-2 focus:ring-[var(--vendor-accent)] outline-none"
                        value={formData.section}
                        onChange={e => setFormData(prev => ({ ...prev, section: e.target.value }))}
                        placeholder="Select or Type..."
                    />
                    <datalist id="sections">
                        {sections.filter(s => s !== 'All').map(s => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4 py-2">
            <label className="flex items-center gap-2 cursor-pointer group">
                <input
                    type="checkbox"
                    checked={formData.isVegetarian}
                    onChange={e => setFormData(prev => ({ ...prev, isVegetarian: e.target.checked }))}
                    className="w-5 h-5 text-[var(--vendor-accent)] rounded focus:ring-[var(--vendor-accent)] border-[var(--vendor-border)] bg-[var(--vendor-bg)]"
                />
                <span className="text-[var(--vendor-text-primary)] font-medium group-hover:text-[var(--vendor-text-secondary)] transition-colors">Vegetarian</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
                <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={e => setFormData(prev => ({ ...prev, available: e.target.checked }))}
                    className="w-5 h-5 text-[var(--vendor-accent)] rounded focus:ring-[var(--vendor-accent)] border-[var(--vendor-border)] bg-[var(--vendor-bg)]"
                />
                <span className="text-[var(--vendor-text-primary)] font-medium group-hover:text-[var(--vendor-text-secondary)] transition-colors">Available</span>
            </label>
        </div>

        <div>
           <label className="block text-sm font-medium text-[var(--vendor-text-secondary)] mb-1">Image URL</label>
           <input
             type="url"
             className="w-full px-3 py-2 border border-[var(--vendor-border)] rounded-lg bg-[var(--vendor-bg)] text-[var(--vendor-text-primary)] focus:ring-2 focus:ring-[var(--vendor-accent)] outline-none"
             value={formData.imageUrl}
             onChange={e => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
             placeholder="https://..."
           />
        </div>

        <div>
           <label className="block text-sm font-medium text-[var(--vendor-text-secondary)] mb-1">Description (Optional)</label>
           <textarea
             className="w-full px-3 py-2 border border-[var(--vendor-border)] rounded-lg bg-[var(--vendor-bg)] text-[var(--vendor-text-primary)] focus:ring-2 focus:ring-[var(--vendor-accent)] outline-none"
             rows={3}
             value={formData.description}
             onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
             placeholder="Brief description of the item..."
           />
        </div>

        <div className="flex justify-end pt-4 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-[var(--vendor-border)] text-[var(--vendor-text-primary)] hover:bg-[var(--vendor-bg)]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            className="bg-[var(--vendor-accent)] hover:bg-emerald-600 text-white shadow-md"
          >
            {initialData ? 'Save Changes' : 'Save Item'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
