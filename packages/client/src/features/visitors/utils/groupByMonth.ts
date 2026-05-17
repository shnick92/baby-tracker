import { groupBy } from '@lib/utils/groupBy'

import type { VisitorSlot } from '../useVisitors'

export function groupByMonth(slots: VisitorSlot[]): [string, VisitorSlot[]][] {
  const record = groupBy(slots, (s) => s.date.slice(0, 7))
  return Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
}
