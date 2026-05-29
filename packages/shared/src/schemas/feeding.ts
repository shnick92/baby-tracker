import { z } from 'zod'

export const startBreastFeedSchema = z.object({
  babyId: z.string().min(1),
  type: z.enum(['BREAST_LEFT', 'BREAST_RIGHT']),
  startedAt: z.string().datetime({ offset: true }).optional(),
})

export const endFeedSchema = z.object({
  endedAt: z.string().datetime({ offset: true }).optional(),
})

export const logBottleSchema = z.object({
  babyId: z.string().min(1),
  volumeOz: z.number().min(0.1, 'Min 0.1 oz').max(16, 'Max 16 oz'),
  milkType: z.enum(['BREAST_MILK', 'FORMULA']).optional(),
  formulaName: z.string().max(100, 'Max 100 characters').optional(),
  fedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
})

export const logPumpSchema = z.object({
  babyId: z.string().min(1),
  volumeOz: z.number().min(0, 'Min 0 oz').max(32, 'Max 32 oz'),
  durationSec: z.number().int().min(0).optional(),
  fedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
})

export const updateFeedingSchema = z.object({
  type: z.enum(['BREAST_LEFT', 'BREAST_RIGHT', 'BOTTLE', 'PUMP']).optional(),
  startedAt: z.string().datetime({ offset: true }).optional(),
  endedAt: z.string().datetime({ offset: true }).nullable().optional(),
  volumeOz: z.number().min(0, 'Min 0 oz').max(32, 'Max 32 oz').nullable().optional(),
  milkType: z.enum(['BREAST_MILK', 'FORMULA']).nullable().optional(),
  formulaName: z.string().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type StartBreastFeedInput = z.infer<typeof startBreastFeedSchema>
export type EndFeedInput = z.infer<typeof endFeedSchema>
export type LogBottleInput = z.infer<typeof logBottleSchema>
export type LogPumpInput = z.infer<typeof logPumpSchema>
export type UpdateFeedingInput = z.infer<typeof updateFeedingSchema>
export type MilkType = 'BREAST_MILK' | 'FORMULA'
