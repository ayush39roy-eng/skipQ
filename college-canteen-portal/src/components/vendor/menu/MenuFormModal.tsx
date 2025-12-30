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
  recipeItems?: { inventoryItemId: string; quantity: number }[]
}

// We can just use VendorItem directly now that we updated it, or extend it loosely
interface MenuFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: MenuItemFormData) => Promise<void>
  initialData?: VendorItem // Use VendorItem directly
  sections: string[]
  inventoryItems: { id: string; name: string; unit: string }[]
}

export default function MenuFormModal({ isOpen, onClose, onSave, initialData, sections, inventoryItems }: MenuFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '', // Input as string for easier handling of backspace
    section: '',
    isVegetarian: true,
    available: true,
    imageUrl: '',
    description: ''
  })
  
  const [recipeItems, setRecipeItems] = useState<{ inventoryItemId: string; quantity: string }[]>([])

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
      
      // Load existing recipe
      if (initialData.recipe && initialData.recipe.items) {
          setRecipeItems(initialData.recipe.items.map(ri => ({
              inventoryItemId: ri.inventoryItemId,
              quantity: ri.quantity.toString()
          })))
      } else {
          setRecipeItems([])
      }
    } else {
      setFormData({
        name: '',
        price: '',
        section: sections.length > 0 && sections[0] !== 'All' ? sections[0] : (sections.find(s => s !== 'All') || ''),
        isVegetarian: true,
        available: true,
        imageUrl: '',
        description: ''
      })
      setRecipeItems([])
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

      // Format Recipe Items
      const formattedRecipeItems = recipeItems
          .map(ri => ({
              inventoryItemId: ri.inventoryItemId,
              quantity: parseFloat(ri.quantity)
          }))
          .filter(ri => ri.inventoryItemId && !isNaN(ri.quantity) && ri.quantity > 0)

      await onSave({
        ...formData,
        id: initialData?.id,
        priceCents: Math.round(price * 100),
        recipeItems: formattedRecipeItems
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSubmitting(false)
    }
  }

  // -- RECIPE HANDLERS --
  const addRecipeItem = () => {
      if (inventoryItems.length === 0) return
      setRecipeItems([...recipeItems, { inventoryItemId: inventoryItems[0].id, quantity: '0' }])
  }

  const removeRecipeItem = (index: number) => {
      setRecipeItems(recipeItems.filter((_, i) => i !== index))
  }

  const updateRecipeItem = (index: number, field: 'inventoryItemId' | 'quantity', value: string) => {
      const newItems = [...recipeItems]
      newItems[index] = { ...newItems[index], [field]: value }
      setRecipeItems(newItems)
  }

  const getUnit = (itemId: string) => {
      const item = inventoryItems.find(i => i.id === itemId)
      return item?.unit || ''
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Item' : 'Add New Item'}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50">
                {error}
            </div>
        )}
        
        {/* ... Existing Fields ... */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <div>
           <label className="block text-sm font-medium text-[var(--vendor-text-secondary)] mb-1">Description (Optional)</label>
           <textarea
             className="w-full px-3 py-2 border border-[var(--vendor-border)] rounded-lg bg-[var(--vendor-bg)] text-[var(--vendor-text-primary)] focus:ring-2 focus:ring-[var(--vendor-accent)] outline-none"
             rows={2}
             value={formData.description}
             onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
             placeholder="Brief description of the item..."
           />
        </div>

        <div className="flex items-center gap-6 py-2">
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

        {/* --- RECIPE SECTION --- */}
        <div className="border-t border-[var(--vendor-border)] pt-4 mt-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--vendor-text-primary)]">Recipe / Ingredients</h3>
                <Button 
                    type="button" 
                    onClick={addRecipeItem}
                    variant="outline"
                    className="text-xs h-8"
                >
                    + Add Ingredient
                </Button>
            </div>
            
            {recipeItems.length === 0 ? (
                <p className="text-sm text-[var(--vendor-text-secondary)] italic">No ingredients linked. Stock won't be tracked for this item.</p>
            ) : (
                <div className="space-y-3">
                    {recipeItems.map((item, idx) => (
                        <div key={idx} className="flex items-end gap-2 bg-[var(--vendor-surface)] p-2 rounded-lg border border-[var(--vendor-border)]">
                            <div className="flex-1">
                                <label className="text-xs text-[var(--vendor-text-secondary)]">Ingredient</label>
                                <select 
                                    className="w-full text-sm bg-transparent border-b border-[var(--vendor-border)] focus:border-[var(--vendor-accent)] outline-none py-1"
                                    value={item.inventoryItemId}
                                    onChange={(e) => updateRecipeItem(idx, 'inventoryItemId', e.target.value)}
                                >
                                    {inventoryItems.map(inv => (
                                        <option key={inv.id} value={inv.id}>{inv.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="text-xs text-[var(--vendor-text-secondary)]">Qty ({getUnit(item.inventoryItemId)})</label>
                                <input 
                                    type="number"
                                    step="any"
                                    min="0"
                                    className="w-full text-sm bg-transparent border-b border-[var(--vendor-border)] focus:border-[var(--vendor-accent)] outline-none py-1"
                                    value={item.quantity}
                                    onChange={(e) => updateRecipeItem(idx, 'quantity', e.target.value)}
                                />
                            </div>
                            <button 
                                type="button"
                                onClick={() => removeRecipeItem(idx)}
                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                                title="Remove"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="flex justify-end pt-6 gap-3 border-t border-[var(--vendor-border)] mt-4">
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
