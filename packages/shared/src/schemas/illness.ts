import { z } from 'zod'

export const SUGGESTED_SYMPTOMS = [
  'Fever',
  'Runny Nose',
  'Congestion',
  'Cough',
  'Vomiting',
  'Diarrhea',
  'Rash',
  'Fussy',
  'Not Eating',
  'Ear Pain',
] as const

export const createEpisodeSchema = z.object({
  babyId: z.string().min(1, 'Baby ID is required'),
  startedAt: z.string().datetime({ offset: true }).optional(),
  symptoms: z.array(z.string().min(1)).max(20, 'Too many symptoms').default([]),
  notes: z.string().max(500).optional(),
})
export type CreateEpisodeInput = z.infer<typeof createEpisodeSchema>

export const addSymptomSchema = z.object({
  label: z.string().min(1, 'Symptom label is required').max(100, 'Too long'),
})
export type AddSymptomInput = z.infer<typeof addSymptomSchema>

export const logTemperatureSchema = z.object({
  tempF: z.number().min(90, 'Min 90°F').max(115, 'Max 115°F').optional(),
  tempC: z.number().min(32, 'Min 32°C').max(46, 'Max 46°C').optional(),
  method: z.enum(['FOREHEAD', 'EAR', 'RECTAL', 'AXILLARY', 'ORAL'], {
    required_error: 'Measurement method is required',
  }),
  recordedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(200).optional(),
}).refine((d) => d.tempF !== undefined || d.tempC !== undefined, {
  message: 'Temperature value is required',
})
export type LogTemperatureInput = z.infer<typeof logTemperatureSchema>

export const updateEpisodeTimesSchema = z.object({
  startedAt: z.string().datetime({ offset: true }).optional(),
  endedAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(500).optional(),
})
export type UpdateEpisodeTimesInput = z.infer<typeof updateEpisodeTimesSchema>
