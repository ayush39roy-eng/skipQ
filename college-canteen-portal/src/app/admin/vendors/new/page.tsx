'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Store, User, MapPin, Lock } from 'lucide-react'

export default function NewVendorPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    // Vendor
    vendorName: '',
    phone: '',
    mode: 'ORDERS_ONLY',
    
    // Account
    email: '',
    password: '',
    
    // Canteen
    canteenName: '',
    location: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/vendors/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create vendor')
      }

      router.push('/admin/vendors')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Vendor</h1>
          <p className="text-sm text-slate-500">Create a new vendor account and canteen setup</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Vendor Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-slate-900 font-semibold border-b border-slate-100 pb-2">
            <Store className="h-5 w-5 text-purple-600" />
            <h2>Vendor Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
              <input
                required
                type="text"
                value={formData.vendorName}
                onChange={e => setFormData({...formData, vendorName: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                placeholder="e.g. Spice Route Foods"
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                placeholder="+91"
              />
            </div>

            <div className="form-group md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Operation Mode</label>
              <select
                value={formData.mode}
                onChange={e => setFormData({...formData, mode: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="ORDERS_ONLY">Orders Only (Standard)</option>
                <option value="FULL_POS">Full Queue Management (Premium)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Account Access */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-slate-900 font-semibold border-b border-slate-100 pb-2">
            <User className="h-5 w-5 text-blue-600" />
            <h2>Login Credentials</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="vendor@example.com"
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <div className="relative">
                <input
                  required
                  type="password"
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pl-10"
                  placeholder="Min 6 characters"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Canteen Setup */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-slate-900 font-semibold border-b border-slate-100 pb-2">
            <MapPin className="h-5 w-5 text-green-600" />
            <h2>Canteen Setup</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-sm font-medium text-slate-700 mb-1">Canteen Name *</label>
              <input
                required
                type="text"
                value={formData.canteenName}
                onChange={e => setFormData({...formData, canteenName: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                placeholder="Visible to students"
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-slate-700 mb-1">Campus Location *</label>
              <input
                required
                type="text"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                placeholder="e.g. Block A, Ground Floor"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium disabled:opacity-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Vendor
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  )
}
