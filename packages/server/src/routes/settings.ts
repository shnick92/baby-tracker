import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

const PatchSleepSettingsSchema = z.object({
  napIdealMinutes: z.number().int().min(5).max(240).optional(),
  nightIdealMinutes: z.number().int().min(60).max(720).optional(),
  wakeWindowMaxMinutes: z.number().int().min(1).max(360).optional(),
})

router.get('/sleep', authMiddleware, async (req, res) => {
  const { babyId } = req.query as { babyId?: string }
  if (!babyId) return res.json({ data: null, error: 'Missing babyId' })

  const settings = await prisma.sleepSettings.findUnique({ where: { babyId } })

  res.json({
    data: settings ?? {
      napIdealMinutes: 45,
      nightIdealMinutes: 180,
      wakeWindowMaxMinutes: 120,
    },
    error: null,
  })
})

router.patch('/sleep', authMiddleware, async (req, res) => {
  const { babyId } = req.query as { babyId?: string }
  if (!babyId) return res.json({ data: null, error: 'Missing babyId' })

  const parsed = PatchSleepSettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.json({ data: null, error: parsed.error.issues[0].message })
  }

  const settings = await prisma.sleepSettings.upsert({
    where: { babyId },
    create: { babyId, ...parsed.data },
    update: parsed.data,
  })

  res.json({ data: settings, error: null })
})

export default router
