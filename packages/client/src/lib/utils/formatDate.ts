export function formatDueMonthYear(dueDate: string): string {
  const [y, m, d] = dueDate.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function formatHeaderDate(): string {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' })
  const day = now.getDate()
  const month = now.toLocaleDateString('en-US', { month: 'long' })
  return `${weekday}, ${day} ${month}`
}

export function greeting(firstName: string): string {
  const h = new Date().getHours()
  const tod = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
  return `Good ${tod}, ${firstName} 👋`
}
