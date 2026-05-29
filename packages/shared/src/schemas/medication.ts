import { z } from 'zod'

export const logMedicationSchema = z.object({
  babyId: z.string().min(1, 'Baby ID required'),
  name: z.string().min(1, 'Medication name required').max(100, 'Max 100 characters'),
  dosageNote: z.string().max(100, 'Max 100 characters').optional(),
  givenAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
})

export const updateMedicationSchema = z.object({
  name: z.string().min(1, 'Medication name required').max(100, 'Max 100 characters').optional(),
  dosageNote: z.string().max(100, 'Max 100 characters').nullable().optional(),
  givenAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(500, 'Max 500 characters').nullable().optional(),
})

export type LogMedicationInput = z.infer<typeof logMedicationSchema>
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>
