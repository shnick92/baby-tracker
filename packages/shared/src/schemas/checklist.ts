import { z } from 'zod'

export const checklistTypeSchema = z.enum([
  'HOSPITAL_BAG_MOM',
  'HOSPITAL_BAG_BABY',
  'HOME_PREP',
  'BEFORE_HOME',
])

export const createChecklistItemSchema = z.object({
  label: z.string().min(1),
  category: z.string().min(1),
  notes: z.string().optional(),
  sortOrder: z.number().int().default(0),
})

export const toggleChecklistItemSchema = z.object({
  isChecked: z.boolean(),
})

export const updateChecklistItemSchema = z.object({
  label: z.string().min(1).optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

export type ChecklistTypeInput = z.infer<typeof checklistTypeSchema>
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>
export type ToggleChecklistItemInput = z.infer<typeof toggleChecklistItemSchema>
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>
