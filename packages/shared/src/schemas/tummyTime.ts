import { z } from 'zod'

export const startTummyTimeSchema = z.object({
  babyId: z.string().min(1, 'Baby ID required'),
  startedAt: z.string().datetime().optional(),
})

export const endTummyTimeSchema = z.object({
  endedAt: z.string().datetime().optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
})

export const updateTummyTimeSchema = z.object({
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(500, 'Max 500 characters').nullable().optional(),
})

export type StartTummyTimeInput = z.infer<typeof startTummyTimeSchema>
export type EndTummyTimeInput = z.infer<typeof endTummyTimeSchema>
export type UpdateTummyTimeInput = z.infer<typeof updateTummyTimeSchema>
