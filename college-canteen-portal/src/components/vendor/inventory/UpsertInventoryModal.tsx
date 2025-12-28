'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createInventoryItem, updateInventoryItem } from '@/app/vendor/actions'
import { InventoryItem } from '@prisma/client'
import { ToastType } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'

interface UpsertInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  itemToEdit?: InventoryItem | null
  vendorId: string
  onSuccess: (message: string, type: ToastType, data?: InventoryItem) => void
}

export default function UpsertInventoryModal({ isOpen, onClose, itemToEdit, vendorId, onSuccess }: UpsertInventoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Raw Material',
    unit: 'kg',
    quantity: '0',
    minThreshold: '5',
    costPerUnit: '0'
  })

  // Reset form when opening/changing item
  useEffect(() => {
    if (itemToEdit) {
        setFormData({
            name: itemToEdit.name,
            category: itemToEdit.category,
            unit: itemToEdit.unit,
            quantity: itemToEdit.quantity.toString(),
            minThreshold: itemToEdit.minThreshold.toString(),
            costPerUnit: (itemToEdit.costPerUnit ? itemToEdit.costPerUnit / 100 : 0).toString()
        })
    } else {
        setFormData({
            name: '',
            category: 'Raw Material',
            unit: 'kg',
            quantity: '0',
            minThreshold: '5',
            costPerUnit: '0'
        })
    }
  }, [itemToEdit, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity) || 0,
        minThreshold: parseFloat(formData.minThreshold) || 5,
        costPerUnit: Math.round((parseFloat(formData.costPerUnit) || 0) * 100)
    }

    try {
        let res
        if (itemToEdit) {
            res = await updateInventoryItem(itemToEdit.id, payload)
        } else {
            res = await createInventoryItem(vendorId, payload)
        }

        if (res.success) {
            onSuccess(
                itemToEdit ? 'Item updated successfully' : 'Item added successfully',
                'SUCCESS',
                res.data
            )
            onClose()
        } else {
            onSuccess(res.error || 'Operation failed', 'ERROR')
        }
    } catch (error) {
        console.error(error)
        onSuccess('An unexpected error occurred', 'ERROR')
    } finally {
        setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? 'Edit Inventory Item' : 'Add New Inventory Item'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-[var(--vendor-text-primary)]">
        <div>
          <label className="block text-sm font-medium text-[var(--vendor-text-secondary)]">Item Name</label>
          <input
            type="text"
            required
            className="mt-1 block w-full rounded-lg border border-[var(--vendor-border)] bg-[var(--vendor-bg)] px-3 py-2 text-[var(--vendor-text-primary)] shadow-sm focus:border-[var(--vendor-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--vendor-accent)] sm:text-sm"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Tomatoes, Packaging Box"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--vendor-text-secondary)]">Category</label>
              <select
                className="mt-1 block w-full rounded-lg border border-[var(--vendor-border)] bg-[var(--vendor-bg)] px-3 py-2 text-[var(--vendor-text-primary)] shadow-sm focus:border-[var(--vendor-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--vendor-accent)] sm:text-sm"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Raw Material">Raw Material</option>
                <option value="Packaging">Packaging</option>
                <option value="Ready to Eat">Ready to Eat</option>
              </select>
            </div>

             <div>
              <label className="block text-sm font-medium text-[var(--vendor-text-secondary)]">Unit</label>
              <input
                type="text"
                list="units"
                required
                className="mt-1 block w-full rounded-lg border border-[var(--vendor-border)] bg-[var(--vendor-bg)] px-3 py-2 text-[var(--vendor-text-primary)] shadow-sm focus:border-[var(--vendor-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--vendor-accent)] sm:text-sm"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="kg, liters, pcs"
              />
              <datalist id="units">
                <option value="kg" />
                <option value="liters" />
                <option value="units" />
                <option value="packs" />
                <option value="trays" />
              </datalist>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--vendor-text-secondary)]">Current Stock</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                className="mt-1 block w-full rounded-lg border border-[var(--vendor-border)] bg-[var(--vendor-bg)] px-3 py-2 text-[var(--vendor-text-primary)] shadow-sm focus:border-[var(--vendor-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--vendor-accent)] sm:text-sm"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>

            <div>
               <label className="block text-sm font-medium text-[var(--vendor-text-secondary)]">Min. Threshold</label>
               <input
                 type="number"
                 step="any"
                 min="0"
                 required
                 className="mt-1 block w-full rounded-lg border border-[var(--vendor-border)] bg-[var(--vendor-bg)] px-3 py-2 text-[var(--vendor-text-primary)] shadow-sm focus:border-[var(--vendor-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--vendor-accent)] sm:text-sm"
                 value={formData.minThreshold}
                 onChange={(e) => setFormData({ ...formData, minThreshold: e.target.value })}
               />
            </div>
        </div>

         <div>
            <label className="block text-sm font-medium text-[var(--vendor-text-secondary)]">Cost Per Unit (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="mt-1 block w-full rounded-lg border border-[var(--vendor-border)] bg-[var(--vendor-bg)] px-3 py-2 text-[var(--vendor-text-primary)] shadow-sm focus:border-[var(--vendor-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--vendor-accent)] sm:text-sm"
              value={formData.costPerUnit}
              onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
            />
         </div>

        <div className="mt-5 flex justify-end gap-2">
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
               loading={loading}
               className="bg-[var(--vendor-accent)] hover:bg-emerald-600 text-white"
            >
                {itemToEdit ? 'Save Changes' : 'Create Item'}
            </Button>
        </div>
      </form>
    </Modal>
  )
}
