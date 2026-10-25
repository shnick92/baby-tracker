import { z } from 'zod'

export const logDiaperSchema = z.object({
  babyId: z.string().min(1),
  type: z.enum(['WET', 'DIRTY', 'BOTH']),
  color: z.enum(['YELLOW', 'GREEN', 'BROWN', 'BLACK', 'RED', 'OTHER']).optional(),
  consistency: z.enum(['SEEDY', 'PASTY', 'RUNNY', 'FIRM', 'WATERY', 'CUSTOM']).optional(),
  customConsistency: z.string().optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
})

export const updateDiaperSchema = z.object({
  type: z.enum(['WET', 'DIRTY', 'BOTH']).optional(),
  color: z.enum(['YELLOW', 'GREEN', 'BROWN', 'BLACK', 'RED', 'OTHER']).nullable().optional(),
  consistency: z.enum(['SEEDY', 'PASTY', 'RUNNY', 'FIRM', 'WATERY', 'CUSTOM']).nullable().optional(),
  customConsistency: z.string().nullable().optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().nullable().optional(),
})

// GET /api/diaper — `since` returns every log from that instant onward so
// per-day counts aren't truncated by the default row limit.
export const diaperListQuerySchema = z.object({
  babyId: z.string().min(1, 'babyId required'),
  since: z.string().datetime({ offset: true, message: 'since must be an ISO datetime' }).optional(),
  limit: z.coerce.number().int().min(1, 'Min limit 1').max(500, 'Max limit 500').optional(),
})

export type LogDiaperInput = z.infer<typeof logDiaperSchema>
export type UpdateDiaperInput = z.infer<typeof updateDiaperSchema>
export type DiaperListQuery = z.infer<typeof diaperListQuerySchema>
