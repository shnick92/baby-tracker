import { useQuery } from '@tanstack/react-query'

import { api } from '@lib/axios'
import { useAuthStore } from '@stores/authStore'

export type PregnancyStatus = {
  weeksPregnant: number
  weeksRemaining: number
  progressPct: number
  babySize: string
  dueDate: string
  born: boolean
}

// Pregnancy advances weekly — cache until midnight at the start of next Tuesday
function msUntilNextTuesday(): number {
  const now = new Date()
  const daysUntil = (2 - now.getDay() + 7) % 7 || 7
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntil)
  next.setHours(0, 0, 0, 0)
  return next.getTime() - now.getTime()
}

export function usePregnancyStatus() {
  const babyId = useAuthStore((s) => s.babyId) ?? ''

  return useQuery({
    queryKey: ['pregnancy', 'status', babyId],
    queryFn: () =>
      api
        .get<{ data: PregnancyStatus | null; error: null }>('/api/pregnancy/status', {
          params: { babyId },
        })
        .then((r) => r.data.data),
    enabled: !!babyId,
    staleTime: msUntilNextTuesday,
  })
}
