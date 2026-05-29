import { z } from 'zod'

export const startTummyTimeSchema = z.object({
  babyId: z.string().min(1, 'Baby ID required'),
  startedAt: z.string().datetime({ offset: true }).optional(),
})

export const endTummyTimeSchema = z.object({
  endedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
})

export const updateTummyTimeSchema = z.object({
  startedAt: z.string().datetime({ offset: true }).optional(),
  endedAt: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().max(500, 'Max 500 characters').nullable().optional(),
})

export type StartTummyTimeInput = z.infer<typeof startTummyTimeSchema>
export type EndTummyTimeInput = z.infer<typeof endTummyTimeSchema>
export type UpdateTummyTimeInput = z.infer<typeof updateTummyTimeSchema>
