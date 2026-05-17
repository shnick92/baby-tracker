export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number)
  return { year, month, day }
}

export function formatMonthAbbr(dateStr: string): string {
  const { year, month } = parseDateParts(dateStr)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

export function formatMonthYear(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function todayDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
