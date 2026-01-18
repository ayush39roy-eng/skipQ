'use client'

import { useState } from 'react'
import { type WeeklySchedule } from '@/types/schedule'
import { Copy, Clock, CalendarDays, Check, Save } from 'lucide-react'

type Props = {
    canteenName: string
    initialSchedule: WeeklySchedule
    onSave: (schedule: WeeklySchedule) => Promise<void>
}

// Clean Input Component
function TimeInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    return (
        <div className="relative">
            <input
                type="time"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 [&::-webkit-calendar-picker-indicator]:opacity-0"
            />
            <Clock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
    )
}

export function WeeklyScheduleEditor({ canteenName, initialSchedule, onSave }: Props) {
    const [schedule, setSchedule] = useState<WeeklySchedule>(initialSchedule)
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    const handleDayToggle = (index: number) => {
        const newSchedule = [...schedule]
        newSchedule[index] = { ...newSchedule[index], isOpen: !newSchedule[index].isOpen }
        setSchedule(newSchedule)
        setHasChanges(true)
    }

    const handleTimeChange = (index: number, field: 'openingTime' | 'closingTime', value: string) => {
        const newSchedule = [...schedule]
        newSchedule[index] = { ...newSchedule[index], [field]: value }
        setSchedule(newSchedule)
        setHasChanges(true)
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await onSave(schedule)
            setHasChanges(false)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCopyToAll = (index: number) => {
        const dayToCopy = schedule[index]
        const newSchedule = schedule.map((day) => ({
            ...day,
            isOpen: dayToCopy.isOpen,
            openingTime: dayToCopy.openingTime,
            closingTime: dayToCopy.closingTime,
        }))
        setSchedule(newSchedule)
        setHasChanges(true)
    }

    return (
        <div className="bg-white">
            <div className="mb-6 flex items-center justify-between">
                <div>
                   <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                       <CalendarDays className="h-4 w-4 text-slate-500" /> Set Operating Hours
                   </h4>
                   <p className="text-xs text-slate-500 mt-1">Configure when {canteenName} automatically opens and closes.</p>
                </div>
                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {isSaving ? (
                           <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                           <Save className="h-4 w-4" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {schedule.map((daySchedule, index) => (
                    <div
                        key={daySchedule.day}
                        className={`group relative overflow-hidden rounded-xl border transition-all ${
                            daySchedule.isOpen 
                                ? 'border-slate-200 bg-white shadow-sm hover:border-slate-300' 
                                : 'border-slate-100 bg-slate-50 opacity-75'
                        }`}
                    >
                        <div className="flex items-center gap-4 p-4">
                            {/* Toggle */}
                            <button
                                type="button"
                                onClick={() => handleDayToggle(index)}
                                className={`flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                                    daySchedule.isOpen ? 'bg-emerald-500' : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                                        daySchedule.isOpen ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>

                            {/* Day Name */}
                            <span className={`w-24 text-sm font-bold ${daySchedule.isOpen ? 'text-slate-900' : 'text-slate-400'}`}>
                                {daySchedule.day}
                            </span>

                            {/* Time Selectors */}
                            {daySchedule.isOpen ? (
                                <div className="flex flex-1 items-center gap-2">
                                    <div className="flex items-center gap-2 flex-1">
                                        <TimeInput 
                                            value={daySchedule.openingTime} 
                                            onChange={(val) => handleTimeChange(index, 'openingTime', val)} 
                                        />
                                        <span className="text-xs font-medium text-slate-400 px-1">to</span>
                                        <TimeInput 
                                            value={daySchedule.closingTime} 
                                            onChange={(val) => handleTimeChange(index, 'closingTime', val)} 
                                        />
                                    </div>
                                    
                                    {/* Copy Action */}
                                    <button
                                        type="button"
                                        onClick={() => handleCopyToAll(index)}
                                        className="ml-2 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                                        title="Copy these hours to all days"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Copy All</span>
                                    </button>
                                </div>
                            ) : (
                                <span className="text-sm font-medium text-slate-400 italic">Closed all day</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
