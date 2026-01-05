'use client'

import { useState, useEffect } from 'react'
import { Flag, Settings2 } from 'lucide-react'

/**
 * Feature Flags Page
 * 
 * Global feature toggles and vendor-specific overrides.
 */

type FeatureFlag = {
  key: string
  name: string
  description: string
  enabled: boolean
  type: 'GLOBAL' | 'VENDOR_OVERRIDE'
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFlags()
  }, [])

  const fetchFlags = async () => {
    try {
      const response = await fetch('/api/admin/flags')
      const data = await response.json()
      setFlags(data.flags || [])
    } catch (error) {
      console.error('Failed to fetch flags:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFlag = async (key: string, enabled: boolean) => {
    try {
      // Optimistic update
      setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled } : f))

      await fetch('/api/admin/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled })
      })
      
      // Background re-fetch to ensure sync
      fetchFlags()
    } catch (error) {
      console.error('Failed to toggle flag:', error)
      // Revert on error
      fetchFlags()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Feature Flags</h1>
          <p className="text-sm text-slate-500 mt-1">Global toggles and experiments</p>
        </div>
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Flag className="h-5 w-5 text-indigo-600" />
        </div>
      </div>

      {/* Flags List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          flags.map((flag) => (
            <div key={flag.key} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{flag.name}</h3>
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-500 border border-slate-200 uppercase tracking-wide">
                    {flag.key}
                  </span>
                </div>
                <p className="text-sm text-slate-500 max-w-2xl">{flag.description}</p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={flag.enabled}
                  onChange={(e) => toggleFlag(flag.key, e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
