'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { type WeeklySchedule } from '@/types/schedule'

type Props = {
    canteenName: string
    initialSchedule: WeeklySchedule
    onSave: (schedule: WeeklySchedule) => Promise<void>
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
        <Card className="border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">{canteenName} Schedule</h3>
                    <p className="text-xs text-[rgb(var(--text-muted))]">Set different hours for each day</p>
                </div>
                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn px-4 py-2 text-sm"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {schedule.map((daySchedule, index) => (
                    <div
                        key={daySchedule.day}
                        className="flex flex-col gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/30 p-3 transition hover:bg-[rgb(var(--surface-muted))]/50"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleDayToggle(index)}
                                    className={`flex h-5 w-10 items-center rounded-full transition ${daySchedule.isOpen ? 'bg-green-500' : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`h-4 w-4 rounded-full bg-white shadow-md transition ${daySchedule.isOpen ? 'translate-x-5' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                                <span className="w-24 text-sm font-medium">{daySchedule.day}</span>
                            </div>

                            {daySchedule.isOpen && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={daySchedule.openingTime}
                                        onChange={(e) => handleTimeChange(index, 'openingTime', e.target.value)}
                                        className="input w-28 px-2 py-1 text-sm"
                                    />
                                    <span className="text-xs text-[rgb(var(--text-muted))]">to</span>
                                    <input
                                        type="time"
                                        value={daySchedule.closingTime}
                                        onChange={(e) => handleTimeChange(index, 'closingTime', e.target.value)}
                                        className="input w-28 px-2 py-1 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopyToAll(index)}
                                        className="ml-2 rounded border border-[rgb(var(--border))] px-2 py-1 text-xs text-[rgb(var(--text-muted))] transition hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--text))]"
                                        title="Copy to all days"
                                    >
                                        Copy
                                    </button>
                                </div>
                            )}

                            {!daySchedule.isOpen && (
                                <span className="text-sm text-[rgb(var(--text-muted))]">Closed</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}
