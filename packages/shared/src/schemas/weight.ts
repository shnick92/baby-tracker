import { z } from 'zod'

export const logWeightSchema = z.object({
  babyId: z.string().min(1, 'Baby ID required'),
  lbs: z.number().int().min(0, 'Min 0 lbs').max(50, 'Max 50 lbs'),
  oz: z.number().min(0, 'Min 0 oz').max(15.9, 'Max 15.9 oz'),
  recordedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
})

export const updateWeightSchema = z.object({
  lbs: z.number().int().min(0, 'Min 0 lbs').max(50, 'Max 50 lbs').optional(),
  oz: z.number().min(0, 'Min 0 oz').max(15.9, 'Max 15.9 oz').optional(),
  recordedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(500, 'Max 500 characters').nullable().optional(),
})

export type LogWeightInput = z.infer<typeof logWeightSchema>
export type UpdateWeightInput = z.infer<typeof updateWeightSchema>
