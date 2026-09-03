import { z } from 'zod'

const optionalText = (max: number) => z.string().max(max, `Max ${max} characters`).optional()

export const createDoctorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Max 120 characters'),
  specialty: optionalText(80),
  practiceName: optionalText(120),
  address: optionalText(300),
  phone: optionalText(40),
  notes: optionalText(500),
})

export const updateDoctorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Max 120 characters').optional(),
  specialty: optionalText(80).nullable(),
  practiceName: optionalText(120).nullable(),
  address: optionalText(300).nullable(),
  phone: optionalText(40).nullable(),
  notes: optionalText(500).nullable(),
})

export const createAppointmentSchema = z.object({
  title: optionalText(120),
  date: z.string().min(1, 'Date required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  startTime: z.string().datetime({ offset: true }).optional(),
  endTime: z.string().datetime({ offset: true }).optional(),
  notes: optionalText(500),
})

export const updateAppointmentSchema = createAppointmentSchema
  .extend({ doctorId: z.string().min(1, 'Doctor required') })
  .partial()

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>
