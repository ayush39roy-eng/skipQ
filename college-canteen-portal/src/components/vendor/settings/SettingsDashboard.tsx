'use client'

import { useState } from 'react'
import { Toast, ToastType } from '@/components/ui/Toast'
import { updateCanteenStatus, updateVendorProfile, updateCanteenSchedule, updateCanteenSettings } from '@/app/vendor/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface SettingsDashboardProps {
  vendor: {
    id: string
    name: string
    email: string
    phone: string | null
    whatsappEnabled: boolean
  }
  canteen: {
    id: string
    name: string
    location: string
    notificationPhones: string[]
    isOpen: boolean
    autoMode: boolean
    weeklySchedule: any // JSON
  }
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function SettingsDashboard({ vendor: initialVendor, canteen: initialCanteen }: SettingsDashboardProps) {
  const router = useRouter()
  const [vendor, setVendor] = useState(initialVendor)
  const [canteen, setCanteen] = useState(initialCanteen)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  // -- MODAL STATES --
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingSchedule, setIsEditingSchedule] = useState(false)
  const [isEditingGeneral, setIsEditingGeneral] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)

  // -- FORM STATES --
  const [profileForm, setProfileForm] = useState({ name: vendor.name, phone: vendor.phone || '' })
  const [generalForm, setGeneralForm] = useState({ 
    location: canteen.location, 
    notificationPhones: canteen.notificationPhones.join(', '),
    whatsappEnabled: vendor.whatsappEnabled
  })
  
  // Schedule state is complex, initialize from existing or default
  const [scheduleForm, setScheduleForm] = useState(() => {
    if (Array.isArray(canteen.weeklySchedule) && canteen.weeklySchedule.length > 0) {
        return canteen.weeklySchedule
    }
    return DAYS.map(day => ({ day, isOpen: true, openingTime: '09:00', closingTime: '21:00' }))
  })

  // -- HANDLERS --
  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type })
  }

  const handleToggleStatus = async () => {
    if (isTogglingStatus) return
    setIsTogglingStatus(true)

    const previousCanteen = { ...canteen }
    const newStatus = !canteen.isOpen

    // Optimistic
    setCanteen(prev => ({ ...prev, isOpen: newStatus, autoMode: false }))
    
    try {
        // Server Call
        const res = await updateCanteenStatus(canteen.id, newStatus)
        
        if (res.success) {
            showToast(`Canteen is now ${newStatus ? 'OPEN' : 'CLOSED'}`, 'SUCCESS')
        } else {
            showToast('Failed to update status', 'ERROR')
            setCanteen(previousCanteen) // Revert entire state
        }
    } catch (error) {
        showToast('Failed to update status', 'ERROR')
        setCanteen(previousCanteen) // Revert on exception
    } finally {
        setIsTogglingStatus(false)
    }
  }

  const handleSaveProfile = async () => {
    const res = await updateVendorProfile(vendor.id, {
        name: profileForm.name,
        phone: profileForm.phone
    })

    if (res.success) {
        setVendor(prev => ({ ...prev, name: profileForm.name, phone: profileForm.phone }))
        setIsEditingProfile(false)
        showToast('Profile updated successfully', 'SUCCESS')
        router.refresh()
    } else {
        showToast('Failed to update profile', 'ERROR')
    }
  }

  const handleSaveGeneral = async () => {
    const phones = generalForm.notificationPhones.split(',').map(p => p.trim()).filter(p => p.length > 0)
    
    const res = await updateCanteenSettings(canteen.id, {
        location: generalForm.location,
        notificationPhones: phones,
        whatsappEnabled: generalForm.whatsappEnabled
    })

    if (res.success) {
        setCanteen(prev => ({ ...prev, location: generalForm.location, notificationPhones: phones }))
        setVendor(prev => ({ ...prev, whatsappEnabled: generalForm.whatsappEnabled }))
        setIsEditingGeneral(false)
        showToast('Settings updated successfully', 'SUCCESS')
        router.refresh()
    } else {
        showToast('Failed to update settings', 'ERROR')
    }
  }

  const handleSaveSchedule = async () => {
    // Convert array format to WeeklySchedule object format
    const weeklyScheduleObj = {
      monday: { isOpen: scheduleForm[0]?.isOpen ?? false, openTime: scheduleForm[0]?.openingTime, closeTime: scheduleForm[0]?.closingTime },
      tuesday: { isOpen: scheduleForm[1]?.isOpen ?? false, openTime: scheduleForm[1]?.openingTime, closeTime: scheduleForm[1]?.closingTime },
      wednesday: { isOpen: scheduleForm[2]?.isOpen ?? false, openTime: scheduleForm[2]?.openingTime, closeTime: scheduleForm[2]?.closingTime },
      thursday: { isOpen: scheduleForm[3]?.isOpen ?? false, openTime: scheduleForm[3]?.openingTime, closeTime: scheduleForm[3]?.closingTime },
      friday: { isOpen: scheduleForm[4]?.isOpen ?? false, openTime: scheduleForm[4]?.openingTime, closeTime: scheduleForm[4]?.closingTime },
      saturday: { isOpen: scheduleForm[5]?.isOpen ?? false, openTime: scheduleForm[5]?.openingTime, closeTime: scheduleForm[5]?.closingTime },
      sunday: { isOpen: scheduleForm[6]?.isOpen ?? false, openTime: scheduleForm[6]?.openingTime, closeTime: scheduleForm[6]?.closingTime },
    }
    
    const res = await updateCanteenSchedule(canteen.id, weeklyScheduleObj)
    if (res.success) {
        setCanteen(prev => ({ ...prev, weeklySchedule: scheduleForm }))
        setIsEditingSchedule(false)
        showToast('Schedule updated successfully', 'SUCCESS')
        router.refresh()
    } else {
        showToast('Failed to update schedule', 'ERROR')
    }
  }

  const handleScheduleChange = (index: number, field: string, value: any) => {
      const newSchedule = [...scheduleForm]
      newSchedule[index] = { ...newSchedule[index], [field]: value }
      setScheduleForm(newSchedule)
  }

  return (
    <div className="flex-1 min-h-screen pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="mb-8 flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--vendor-text-primary)]">Store Settings</h1>
            <p className="text-[var(--vendor-text-secondary)] mt-1">Configure your canteen profile and operations.</p>
         </div>
         <Link href="/vendor/terminal">
            <Button variant="outline" className="gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Back to Terminal
            </Button>
         </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Profile Card */}
         <div className="bg-[var(--vendor-surface)] p-6 rounded-2xl shadow-sm border border-[var(--vendor-border)]">
            <h2 className="text-lg font-bold text-[var(--vendor-text-primary)] mb-6 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--vendor-accent)]"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
               Vendor Profile
            </h2>
            
            {!isEditingProfile ? (
                <div className="space-y-4">
                   <div>
                      <label className="block text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-1">Vendor Name</label>
                      <p className="text-[var(--vendor-text-primary)] font-medium text-lg">{vendor.name}</p>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-1">Email Address</label>
                      <p className="text-[var(--vendor-text-primary)] font-medium text-lg">{vendor.email}</p>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-1">Phone Number</label>
                      <p className="text-[var(--vendor-text-primary)] font-medium text-lg">{vendor.phone || 'Not provided'}</p>
                   </div>
                   <div className="pt-4 mt-4 border-t border-[var(--vendor-border)]">
                      <Button variant="outline" onClick={() => setIsEditingProfile(true)} className="border-[var(--vendor-border)] text-[var(--vendor-text-primary)] hover:bg-[var(--vendor-bg)]">
                         Edit Profile
                      </Button>
                   </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-1">Vendor Name</label>
                        <input 
                            type="text" 
                            className="w-full bg-[var(--vendor-bg)] border border-[var(--vendor-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--vendor-accent)] text-[var(--vendor-text-primary)]"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-1">Phone Number</label>
                        <input 
                            type="text" 
                            className="w-full bg-[var(--vendor-bg)] border border-[var(--vendor-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--vendor-accent)] text-[var(--vendor-text-primary)]"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleSaveProfile} className="bg-[var(--vendor-accent)] hover:bg-emerald-600 text-white">
                            Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => {
                            setProfileForm({ name: vendor.name, phone: vendor.phone || '' })
                            setIsEditingProfile(false)
                        }} className="border-[var(--vendor-border)] text-[var(--vendor-text-primary)] hover:bg-[var(--vendor-bg)]">
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
         </div>

         {/* General Operations Card */}
         <div className="bg-[var(--vendor-surface)] p-6 rounded-2xl shadow-sm border border-[var(--vendor-border)] h-fit">
             <h2 className="text-lg font-bold text-[var(--vendor-text-primary)] mb-6 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--vendor-accent)]"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
               General Settings
            </h2>

            {!isEditingGeneral ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[var(--vendor-bg)] rounded-xl mb-4 border border-[var(--vendor-border)]">
                        <div>
                            <p className="font-bold text-[var(--vendor-text-primary)]">Live Status</p>
                            <p className="text-xs text-[var(--vendor-text-secondary)]">Manually open or close your canteen.</p>
                        </div>
                        <button 
                            onClick={handleToggleStatus}
                            disabled={isTogglingStatus}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${canteen.isOpen ? 'bg-[var(--vendor-success)]' : 'bg-slate-300 dark:bg-slate-600'} ${isTogglingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${canteen.isOpen ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-1">Canteen Location</label>
                        <p className="text-[var(--vendor-text-primary)] font-medium text-lg">{canteen.location}</p>
                    </div>

                     <div>
                        <label className="block text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-1">WhatsApp Notifications</label>
                        <div className="flex items-center gap-2 mt-1">
                             <div className={`w-2 h-2 rounded-full ${vendor.whatsappEnabled ? 'bg-[var(--vendor-success)]' : 'bg-slate-300'}`} />
                             <span className="text-sm font-medium text-[var(--vendor-text-primary)]">{vendor.whatsappEnabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-1">Notification Phones</label>
                        <p className="text-[var(--vendor-text-primary)] font-medium text-lg">{canteen.notificationPhones && canteen.notificationPhones.length > 0 ? canteen.notificationPhones.join(', ') : 'None'}</p>
                        <p className="text-xs text-[var(--vendor-text-secondary)] mt-1">Numbers that receive order alerts.</p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[var(--vendor-border)]">
                      <Button variant="outline" onClick={() => setIsEditingGeneral(true)} className="border-[var(--vendor-border)] text-[var(--vendor-text-primary)] hover:bg-[var(--vendor-bg)]">
                         Edit Settings
                      </Button>
                   </div>
                </div>
            ) : (
                <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-1">Canteen Location</label>
                        <input 
                            type="text" 
                            className="w-full bg-[var(--vendor-bg)] border border-[var(--vendor-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--vendor-accent)] text-[var(--vendor-text-primary)]"
                            value={generalForm.location}
                            onChange={(e) => setGeneralForm(prev => ({ ...prev, location: e.target.value }))}
                        />
                    </div>
                    
                    <div className="border border-[var(--vendor-border)] p-4 rounded-xl bg-[var(--vendor-bg)]">
                        <div className="flex items-center justify-between mb-2">
                             <label className="text-sm font-bold text-[var(--vendor-text-primary)]">Enable WhatsApp</label>
                             <button 
                                onClick={() => setGeneralForm(prev => ({ ...prev, whatsappEnabled: !prev.whatsappEnabled }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${generalForm.whatsappEnabled ? 'bg-[var(--vendor-success)]' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${generalForm.whatsappEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                             </button>
                        </div>
                         <p className="text-xs text-[var(--vendor-text-secondary)]">Enable receiving order updates via WhatsApp.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider mb-1">Notification Phones</label>
                        <input 
                            type="text" 
                            placeholder="Comma separated numbers (e.g. 919876543210)"
                            className="w-full bg-[var(--vendor-bg)] border border-[var(--vendor-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--vendor-accent)] text-[var(--vendor-text-primary)]"
                            value={generalForm.notificationPhones}
                            onChange={(e) => setGeneralForm(prev => ({ ...prev, notificationPhones: e.target.value }))}
                        />
                         <p className="text-xs text-[var(--vendor-text-secondary)] mt-1">E.164 format preferred (e.g. 919999999999).</p>
                    </div>

                     <div className="flex gap-3 pt-4">
                        <Button onClick={handleSaveGeneral} className="bg-[var(--vendor-accent)] hover:bg-emerald-600 text-white">
                            Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => {
                            setGeneralForm({ 
                                location: canteen.location, 
                                notificationPhones: canteen.notificationPhones.join(', '),
                                whatsappEnabled: vendor.whatsappEnabled
                            })
                            setIsEditingGeneral(false)
                        }} className="border-[var(--vendor-border)] text-[var(--vendor-text-primary)] hover:bg-[var(--vendor-bg)]">
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
         </div>

         {/* Weekly Schedule - Spanning full width if needed or just another card */}
         <div className="bg-[var(--vendor-surface)] p-6 rounded-2xl shadow-sm border border-[var(--vendor-border)] lg:col-span-2">
            <h2 className="text-lg font-bold text-[var(--vendor-text-primary)] mb-6 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--vendor-accent)]"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
               Weekly Schedule
            </h2>
            
            {!isEditingSchedule ? (
                 <div>
                    <div className="space-y-2 max-w-2xl">
                        {Array.isArray(canteen.weeklySchedule) && canteen.weeklySchedule.map((day: any) => (
                            <div key={day.day} className="flex justify-between items-center text-sm py-2 border-b border-[var(--vendor-border)] last:border-0">
                                <span className="font-medium text-[var(--vendor-text-secondary)] w-32">{day.day}</span>
                                {day.isOpen ? (
                                <span className="text-[var(--vendor-text-primary)] bg-[var(--vendor-accent-muted)] px-3 py-1 rounded-full text-xs font-bold border border-emerald-100 dark:border-emerald-900/40 dark:text-emerald-300">{day.openingTime} - {day.closingTime}</span>
                                ) : (
                                <span className="text-[var(--vendor-text-secondary)] italic bg-[var(--vendor-bg)] px-3 py-1 rounded-full text-xs border border-[var(--vendor-border)]">Closed</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="pt-6 mt-2">
                        <Button variant="outline" onClick={() => setIsEditingSchedule(true)} className="border-[var(--vendor-border)] text-[var(--vendor-text-primary)] hover:bg-[var(--vendor-bg)]">
                            Manage Schedule
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {scheduleForm.map((day, index) => (
                             <div key={day.day} className="border border-[var(--vendor-border)] rounded-xl p-4 bg-[var(--vendor-bg)]">
                                 <div className="flex items-center justify-between mb-3">
                                     <span className="font-bold text-[var(--vendor-text-primary)]">{day.day}</span>
                                     <button 
                                        onClick={() => handleScheduleChange(index, 'isOpen', !day.isOpen)}
                                        className={`text-xs font-bold px-2 py-1 rounded-md transition-colors ${day.isOpen ? 'bg-[var(--vendor-accent-muted)] text-emerald-800' : 'bg-slate-200 text-slate-500'}`}
                                     >
                                        {day.isOpen ? 'Open' : 'Closed'}
                                     </button>
                                 </div>
                                 {day.isOpen && (
                                     <div className="flex items-center gap-2">
                                         <input 
                                            type="time" 
                                            className="bg-[var(--vendor-surface)] border border-[var(--vendor-border)] rounded px-2 py-1 text-xs w-full text-[var(--vendor-text-primary)]"
                                            value={day.openingTime}
                                            onChange={(e) => handleScheduleChange(index, 'openingTime', e.target.value)}
                                         />
                                         <span className="text-[var(--vendor-text-secondary)]">-</span>
                                         <input 
                                            type="time" 
                                            className="bg-[var(--vendor-surface)] border border-[var(--vendor-border)] rounded px-2 py-1 text-xs w-full text-[var(--vendor-text-primary)]"
                                            value={day.closingTime}
                                            onChange={(e) => handleScheduleChange(index, 'closingTime', e.target.value)}
                                         />
                                     </div>
                                 )}
                             </div>
                         ))}
                     </div>
                     <div className="flex gap-3 pt-4">
                        <Button onClick={handleSaveSchedule} className="bg-[var(--vendor-accent)] hover:bg-emerald-600 text-white">
                            Save Schedule
                        </Button>
                        <Button variant="outline" onClick={() => {
                            if (Array.isArray(canteen.weeklySchedule) && canteen.weeklySchedule.length > 0) {
                                setScheduleForm(canteen.weeklySchedule)
                            } else {
                                setScheduleForm(DAYS.map(day => ({ day, isOpen: true, openingTime: '09:00', closingTime: '21:00' })))
                            }
                            setIsEditingSchedule(false)
                        }} className="border-[var(--vendor-border)] text-[var(--vendor-text-primary)] hover:bg-[var(--vendor-bg)]">
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
         </div>
      </div>
    </div>
  )
}
