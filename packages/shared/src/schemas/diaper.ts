import { z } from 'zod'

export const logDiaperSchema = z.object({
  babyId: z.string().min(1),
  type: z.enum(['WET', 'DIRTY', 'BOTH']),
  color: z.enum(['YELLOW', 'GREEN', 'BROWN', 'BLACK', 'RED', 'OTHER']).optional(),
  consistency: z.enum(['SEEDY', 'PASTY', 'RUNNY', 'FIRM', 'WATERY', 'CUSTOM']).optional(),
  customConsistency: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export const updateDiaperSchema = z.object({
  type: z.enum(['WET', 'DIRTY', 'BOTH']).optional(),
  color: z.enum(['YELLOW', 'GREEN', 'BROWN', 'BLACK', 'RED', 'OTHER']).nullable().optional(),
  consistency: z.enum(['SEEDY', 'PASTY', 'RUNNY', 'FIRM', 'WATERY', 'CUSTOM']).nullable().optional(),
  customConsistency: z.string().nullable().optional(),
  occurredAt: z.string().datetime().optional(),
  notes: z.string().nullable().optional(),
})

export type LogDiaperInput = z.infer<typeof logDiaperSchema>
export type UpdateDiaperInput = z.infer<typeof updateDiaperSchema>
