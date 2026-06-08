import { z } from 'zod'

export const logHeightSchema = z.object({
  babyId: z.string().min(1, 'Baby ID required'),
  inches: z.number().min(10, 'Min 10 inches').max(48, 'Max 48 inches'),
  recordedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
})

export const updateHeightSchema = z.object({
  inches: z.number().min(10, 'Min 10 inches').max(48, 'Max 48 inches').optional(),
  recordedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(500, 'Max 500 characters').nullable().optional(),
})

export type LogHeightInput = z.infer<typeof logHeightSchema>
export type UpdateHeightInput = z.infer<typeof updateHeightSchema>
