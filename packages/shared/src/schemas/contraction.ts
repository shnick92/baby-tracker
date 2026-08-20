import { z } from 'zod'

export const startContractionSchema = z.object({
  babyId: z.string().min(1, 'Baby ID required'),
  startedAt: z.string().datetime({ offset: true }).optional(),
})

export const endContractionSchema = z.object({
  endedAt: z.string().datetime({ offset: true }).optional(),
})

export type StartContractionInput = z.infer<typeof startContractionSchema>
export type EndContractionInput = z.infer<typeof endContractionSchema>
