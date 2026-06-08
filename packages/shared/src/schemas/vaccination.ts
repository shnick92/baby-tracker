import { z } from 'zod'

export const logVaccinationSchema = z.object({
  babyId: z.string().min(1, 'Baby ID required'),
  vaccineKey: z.string().min(1, 'Vaccine is required'),
  administeredAt: z.string().datetime({ offset: true }),
  lotNumber: z.string().max(100, 'Max 100 characters').optional(),
  provider: z.string().max(200, 'Max 200 characters').optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
})

export const updateVaccinationSchema = z.object({
  administeredAt: z.string().datetime({ offset: true }).optional(),
  lotNumber: z.string().max(100, 'Max 100 characters').nullable().optional(),
  provider: z.string().max(200, 'Max 200 characters').nullable().optional(),
  notes: z.string().max(500, 'Max 500 characters').nullable().optional(),
})

export type LogVaccinationInput = z.infer<typeof logVaccinationSchema>
export type UpdateVaccinationInput = z.infer<typeof updateVaccinationSchema>
