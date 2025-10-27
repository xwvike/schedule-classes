import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
