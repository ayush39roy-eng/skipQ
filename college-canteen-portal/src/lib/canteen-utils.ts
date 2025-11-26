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
    // Validate and parse HH:MM strings safely to avoid NaN/runtime errors
    const parseHHMM = (t: string | null) => {
        if (!t || typeof t !== 'string') return null
        const re = /^\d{1,2}:\d{2}$/
        if (!re.test(t)) return null
        const parts = t.split(':')
        if (parts.length !== 2) return null
        const hh = Number(parts[0])
        const mm = Number(parts[1])
        if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null
        return { hh, mm }
    }

    const openParsed = parseHHMM(todaySchedule.openingTime)
    const closeParsed = parseHHMM(todaySchedule.closingTime)

    if (!openParsed || !closeParsed) {
        console.warn('Invalid opening/closing time format for canteen schedule', { opening: todaySchedule.openingTime, closing: todaySchedule.closingTime })
        // Fall back to safe default (keep behavior consistent with earlier parsing errors)
        return { isOpen: true, message: 'Open' }
    }

    const openH = openParsed.hh
    const openM = openParsed.mm
    const closeH = closeParsed.hh
    const closeM = closeParsed.mm

    const openTimeVal = openH * 60 + openM
    const closeTimeVal = closeH * 60 + closeM

    // Handle intervals that span midnight (e.g., open 20:00, close 02:00)
    let isOpen: boolean
    if (closeTimeVal < openTimeVal) {
        // crosses midnight: open when current >= open OR current < close
        isOpen = currentTimeVal >= openTimeVal || currentTimeVal < closeTimeVal
    } else {
        // normal same-day window
        isOpen = currentTimeVal >= openTimeVal && currentTimeVal < closeTimeVal
    }

    return {
        isOpen,
        message: isOpen
            ? `Open until ${todaySchedule.closingTime}`
            : `Opens at ${todaySchedule.openingTime}`
    }
}
