import { z } from 'zod'

export const startBreastFeedSchema = z.object({
  babyId: z.string().min(1),
  type: z.enum(['BREAST_LEFT', 'BREAST_RIGHT']),
  startedAt: z.string().datetime().optional(),
})

export const endFeedSchema = z.object({
  endedAt: z.string().datetime().optional(),
})

export const logBottleSchema = z.object({
  babyId: z.string().min(1),
  volumeOz: z.number().min(0.1).max(16),
  fedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export const logPumpSchema = z.object({
  babyId: z.string().min(1),
  volumeOz: z.number().min(0).max(32),
  durationSec: z.number().int().min(0).optional(),
  fedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export type StartBreastFeedInput = z.infer<typeof startBreastFeedSchema>
export type EndFeedInput = z.infer<typeof endFeedSchema>
export type LogBottleInput = z.infer<typeof logBottleSchema>
export type LogPumpInput = z.infer<typeof logPumpSchema>
