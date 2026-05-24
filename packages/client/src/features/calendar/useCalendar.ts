import { useQuery } from '@tanstack/react-query'

import { api } from '@lib/axios'

import { calendarKeys } from './queryKeys'

export type DayPresence = {
  feedings: boolean
  sleep: boolean
  diapers: boolean
  visitors: boolean
}

export type CalendarMonth = {
  days: Record<string, DayPresence>
}

export function useCalendarMonth(babyId: string, year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return useQuery({
    queryKey: calendarKeys.month(babyId, year, month),
    queryFn: () =>
      api
        .get<{ data: CalendarMonth; error: null }>(
          `/api/calendar?babyId=${babyId}&from=${from}&to=${to}`,
        )
        .then((r) => r.data.data),
    staleTime: 5 * 60_000,
  })
}
