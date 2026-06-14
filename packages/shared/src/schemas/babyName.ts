import { z } from 'zod'

const groupItem = z.string().min(1).max(50, 'Max 50 characters per group')

export const addBabyNameSchema = z.object({
  babyId: z.string().min(1, 'Baby ID required'),
  firstName: z.string().min(1, 'First name is required').max(100, 'Max 100 characters'),
  middleName: z.string().max(100, 'Max 100 characters').optional(),
  nickname: z.string().max(100, 'Max 100 characters').optional(),
  pronunciation: z.string().max(200, 'Max 200 characters').optional(),
  groups: z.array(groupItem).max(20, 'Max 20 groups').optional(),
})

export const updateBabyNameSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'Max 100 characters').optional(),
  middleName: z.string().max(100, 'Max 100 characters').nullable().optional(),
  nickname: z.string().max(100, 'Max 100 characters').nullable().optional(),
  pronunciation: z.string().max(200, 'Max 200 characters').nullable().optional(),
  groups: z.array(groupItem).max(20, 'Max 20 groups').optional(),
})

export const reactToBabyNameSchema = z.object({
  emoji: z.string().min(1, 'Emoji required').max(10, 'Max 10 characters'),
})

export type AddBabyNameInput = z.infer<typeof addBabyNameSchema>
export type UpdateBabyNameInput = z.infer<typeof updateBabyNameSchema>
export type ReactToBabyNameInput = z.infer<typeof reactToBabyNameSchema>
