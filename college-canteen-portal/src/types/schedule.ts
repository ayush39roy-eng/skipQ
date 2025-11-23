export type DaySchedule = {
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
    isOpen: boolean
    openingTime: string // HH:mm format
    closingTime: string // HH:mm format
}

export type WeeklySchedule = DaySchedule[]

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = [
    { day: 'Monday', isOpen: true, openingTime: '09:00', closingTime: '21:00' },
    { day: 'Tuesday', isOpen: true, openingTime: '09:00', closingTime: '21:00' },
    { day: 'Wednesday', isOpen: true, openingTime: '09:00', closingTime: '21:00' },
    { day: 'Thursday', isOpen: true, openingTime: '09:00', closingTime: '21:00' },
    { day: 'Friday', isOpen: true, openingTime: '09:00', closingTime: '21:00' },
    { day: 'Saturday', isOpen: true, openingTime: '09:00', closingTime: '21:00' },
    { day: 'Sunday', isOpen: false, openingTime: '09:00', closingTime: '21:00' },
]

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
