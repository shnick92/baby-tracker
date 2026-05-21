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

export type LogDiaperInput = z.infer<typeof logDiaperSchema>
