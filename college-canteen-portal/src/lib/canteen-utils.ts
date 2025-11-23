import { type WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from '@/types/schedule'

export type CanteenStatus = {
    isOpen: boolean
    message: string
    nextChange?: string
}

export function checkCanteenStatus(canteen: {
    openingTime: string | null
    closingTime: string | null
    weeklySchedule?: unknown // Json type from Prisma
    autoMode: boolean
    manualIsOpen: boolean
}): CanteenStatus {
    if (!canteen.autoMode) {
        return {
            isOpen: canteen.manualIsOpen,
            message: canteen.manualIsOpen ? 'Open' : 'Closed'
        }
    }

    // Get current IST time and day
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        weekday: 'long'
    }
    const formatter = new Intl.DateTimeFormat('en-US', options)
    const parts = formatter.formatToParts(now)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    const weekday = parts.find(p => p.type === 'weekday')?.value || 'Monday'

    const currentTimeVal = hour * 60 + minute

    // Try to use weekly schedule first
    let schedule: WeeklySchedule
    try {
        if (canteen.weeklySchedule) {
            schedule = typeof canteen.weeklySchedule === 'string'
                ? JSON.parse(canteen.weeklySchedule)
                : canteen.weeklySchedule as WeeklySchedule
        } else if (canteen.openingTime && canteen.closingTime) {
            // Fallback to legacy format - apply same times to all days
            schedule = DEFAULT_WEEKLY_SCHEDULE.map(d => ({
                ...d,
                isOpen: true,
                openingTime: canteen.openingTime!,
                closingTime: canteen.closingTime!
            }))
        } else {
            // No schedule set, default to open
            return { isOpen: true, message: 'Open' }
        }
    } catch {
        // If parsing fails, default to open
        return { isOpen: true, message: 'Open' }
    }

    // Find today's schedule
    const todaySchedule = schedule.find(d => d.day === weekday)
    if (!todaySchedule) {
        return { isOpen: true, message: 'Open' }
    }

    // Check if closed for the day
    if (!todaySchedule.isOpen) {
        return {
            isOpen: false,
            message: 'Closed today'
        }
    }

    // Check time-based opening
    const [openH, openM] = todaySchedule.openingTime.split(':').map(Number)
    const [closeH, closeM] = todaySchedule.closingTime.split(':').map(Number)

    const openTimeVal = openH * 60 + openM
    const closeTimeVal = closeH * 60 + closeM

    const isOpen = currentTimeVal >= openTimeVal && currentTimeVal < closeTimeVal

    return {
        isOpen,
        message: isOpen
            ? `Open until ${todaySchedule.closingTime}`
            : `Opens at ${todaySchedule.openingTime}`
    }
}
