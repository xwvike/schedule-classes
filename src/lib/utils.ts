import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function randomString(length: number): string {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export function countDaysInclusive(
  start: Date | null,
  end: Date | null
): number {
  if (!start || !end) return 0
  const startUTC = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  )
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  if (endUTC < startUTC) return 0
  const diffDays = Math.floor((endUTC - startUTC) / 86400000) + 1
  return diffDays
}

export function getDaysInRange(
  start: Date | null,
  end: Date | null
): Array<{ year: number; month: number; day: number }> {
  if (!start || !end) return []
  const startUTC = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  )
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  if (endUTC < startUTC) return []

  const days: Array<{ year: number; month: number; day: number }> = []
  const current = new Date(start)

  while (current <= end) {
    days.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      day: current.getDate(),
    })
    current.setDate(current.getDate() + 1)
  }

  return days
}

export function generateDateRangeAroundToday(day: number = 15): Array<{
  year: number
  month: number
  day: number
  dayOfWeek: number
  dayOfWeekName: string
}> {
  const today = new Date()
  const result: Array<{
    year: number
    month: number
    day: number
    dayOfWeek: number
    dayOfWeekName: string
  }> = []

  const dayNames = ['日', '一', '二', '三', '四', '五', '六']

  for (let i = -day; i <= day; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)

    const dayOfWeek = date.getDay()

    result.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      dayOfWeek: dayOfWeek,
      dayOfWeekName: dayNames[dayOfWeek],
    })
  }

  return result
}
