import { z } from 'zod'

export const MOOD_TYPES = ['HAPPY', 'FUSSY', 'CRYING', 'SLEEPING', 'ALERT', 'BATH', 'WALK'] as const
export const QUALIFIER_TYPES = ['HAPPY', 'FUSSY', 'CRYING', 'ALERT'] as const
export const ACTIVITY_TYPES = ['BATH', 'WALK'] as const

export type QualifierType = (typeof QUALIFIER_TYPES)[number]

export const logMoodSchema = z.object({
  babyId: z.string().min(1, 'Baby ID required'),
  mood: z.enum(MOOD_TYPES).optional(),
  qualifier: z.enum(QUALIFIER_TYPES).optional(),
  customActivityId: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
}).refine(
  (d) => d.mood != null || d.customActivityId != null,
  { message: 'Either mood or customActivityId is required' },
)

export const updateMoodSchema = z.object({
  mood: z.enum(MOOD_TYPES).nullable().optional(),
  qualifier: z.enum(QUALIFIER_TYPES).nullable().optional(),
  customActivityId: z.string().nullable().optional(),
  occurredAt: z.string().datetime().optional(),
  notes: z.string().max(500, 'Max 500 characters').nullable().optional(),
})

export const createCustomActivitySchema = z.object({
  babyId: z.string().min(1, 'Baby ID required'),
  name: z.string().min(1, 'Name required').max(30, 'Max 30 characters'),
  emoji: z.string().min(1, 'Emoji required').max(8, 'Max 1 emoji'),
})

export const updateCustomActivitySchema = z.object({
  name: z.string().min(1, 'Name required').max(30, 'Max 30 characters').optional(),
  emoji: z.string().min(1, 'Emoji required').max(8, 'Max 1 emoji').optional(),
  sortOrder: z.number().int().optional(),
})

export type LogMoodInput = z.infer<typeof logMoodSchema>
export type UpdateMoodInput = z.infer<typeof updateMoodSchema>
export type CreateCustomActivityInput = z.infer<typeof createCustomActivitySchema>
export type UpdateCustomActivityInput = z.infer<typeof updateCustomActivitySchema>
