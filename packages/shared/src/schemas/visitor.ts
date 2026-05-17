import { z } from 'zod'

export const createVisitorSlotSchema = z.object({
  name: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export const updateVisitorSlotSchema = createVisitorSlotSchema.partial()

export type CreateVisitorSlotInput = z.infer<typeof createVisitorSlotSchema>
export type UpdateVisitorSlotInput = z.infer<typeof updateVisitorSlotSchema>
