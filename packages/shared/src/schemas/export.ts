import { z } from 'zod'

// ── Raw data export ─────────────────────────────────────────────────────────

export const EXPORT_DATA_TYPES = [
  'feeding',
  'sleep',
  'diaper',
  'growth',
  'medication',
  'tummyTime',
  'mood',
] as const

export type ExportDataType = (typeof EXPORT_DATA_TYPES)[number]

export const EXPORT_DATA_TYPE_LABELS: Record<ExportDataType, string> = {
  feeding: 'Feedings',
  sleep: 'Sleep',
  diaper: 'Diapers',
  growth: 'Weight & Height',
  medication: 'Medications',
  tummyTime: 'Tummy Time',
  mood: 'Mood & Activity',
}

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const exportQuerySchema = z
  .object({
    babyId: z.string().min(1, 'Missing babyId'),
    types: z
      .string()
      .min(1, 'Select at least one data type')
      .transform((s) => s.split(','))
      .pipe(z.array(z.enum(EXPORT_DATA_TYPES)).min(1, 'Select at least one data type')),
    from: dateString,
    to: dateString,
    format: z.enum(['pdf', 'csv'], { message: 'format must be pdf or csv' }),
  })
  .refine((q) => q.from <= q.to, { message: 'From date must be before to date' })

export type ExportQuery = z.infer<typeof exportQuerySchema>

// ── Health summary ──────────────────────────────────────────────────────────

export const HEALTH_SUMMARY_SECTIONS = [
  'vaccinations',
  'medications',
  'growth',
  'feeding',
  'sleep',
] as const

export type HealthSummarySection = (typeof HEALTH_SUMMARY_SECTIONS)[number]

export const HEALTH_SUMMARY_SECTION_LABELS: Record<HealthSummarySection, string> = {
  vaccinations: 'Vaccinations Received',
  medications: 'Current Medications',
  growth: 'Recent Weight & Growth',
  feeding: 'Feeding Overview (last 30 days)',
  sleep: 'Sleep Overview (last 30 days)',
}

export const healthSummaryQuerySchema = z.object({
  babyId: z.string().min(1, 'Missing babyId'),
  sections: z
    .string()
    .min(1, 'Select at least one section')
    .transform((s) => s.split(','))
    .pipe(z.array(z.enum(HEALTH_SUMMARY_SECTIONS)).min(1, 'Select at least one section')),
})

export type HealthSummaryQuery = z.infer<typeof healthSummaryQuerySchema>
