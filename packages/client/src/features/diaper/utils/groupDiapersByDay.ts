// Local midnight `daysAgo` days before `now` (0 = start of today)
export function startOfLocalDay(daysAgo = 0, now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo)
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDayLabel(dayStart: Date, now = new Date()): string {
  const key = localDayKey(dayStart)
  if (key === localDayKey(startOfLocalDay(0, now))) return 'Today'
  if (key === localDayKey(startOfLocalDay(1, now))) return 'Yesterday'
  return dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export type DiaperDayGroup<T> = { key: string; label: string; logs: T[] }

// Groups logs (already sorted newest-first) by the local calendar day they occurred on
export function groupDiapersByDay<T extends { occurredAt: string }>(
  logs: T[],
  now = new Date(),
): DiaperDayGroup<T>[] {
  const groups: DiaperDayGroup<T>[] = []
  for (const log of logs) {
    const occurred = new Date(log.occurredAt)
    const key = localDayKey(occurred)
    let group = groups.find((g) => g.key === key)
    if (!group) {
      const dayStart = new Date(occurred.getFullYear(), occurred.getMonth(), occurred.getDate())
      group = { key, label: formatDayLabel(dayStart, now), logs: [] }
      groups.push(group)
    }
    group.logs.push(log)
  }
  return groups
}

export function countDiapers(logs: { type: string }[]) {
  return {
    total: logs.length,
    // A wet + dirty change counts toward both tallies but is still one change
    wet: logs.filter((l) => l.type === 'WET' || l.type === 'BOTH').length,
    dirty: logs.filter((l) => l.type === 'DIRTY' || l.type === 'BOTH').length,
  }
}
