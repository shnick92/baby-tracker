import { z } from 'zod'

export const startSleepSchema = z.object({
  babyId: z.string().min(1),
  type: z.enum(['NAP', 'NIGHT']),
  startedAt: z.string().datetime().optional(),
})

export const endSleepSchema = z.object({
  endedAt: z.string().datetime().optional(),
})

export type StartSleepInput = z.infer<typeof startSleepSchema>
export type EndSleepInput = z.infer<typeof endSleepSchema>
