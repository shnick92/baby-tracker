import { z } from 'zod'

export const purchaseStatusSchema = z.enum(['NEEDED', 'BOUGHT', 'GIFTED', 'SKIP'])

export const createPurchaseSchema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  status: purchaseStatusSchema.default('NEEDED'),
  price: z.number().positive('Must be greater than 0').optional(),
  notes: z.string().optional(),
  url: z.string().url('Enter a valid URL').optional(),
})

export const updatePurchaseSchema = createPurchaseSchema.partial()

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>
