import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { getPregnancyStatus } from '../services/pregnancy'

export const pregnancyRouter = Router()
pregnancyRouter.use(authMiddleware)

// GET /api/pregnancy/status?babyId=
pregnancyRouter.get('/status', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) {
    res.status(400).json({ data: null, error: 'babyId required' })
    return
  }

  const status = await getPregnancyStatus(babyId, req.user!.userId)
  res.json({ data: status, error: null })
})

// PATCH /api/pregnancy/born — mark baby as born, or reset with { reset: true }
pregnancyRouter.patch('/born', async (req, res) => {
  const babyId = req.body.babyId as string | undefined
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const baby = await prisma.baby.findFirst({
    where: { id: babyId, parents: { some: { userId: req.user!.userId } } },
  })
  if (!baby) { res.status(404).json({ data: null, error: 'Baby not found' }); return }

  let birthDate: Date | null
  if (req.body.reset) {
    birthDate = null
  } else if (req.body.birthDate) {
    birthDate = new Date(req.body.birthDate as string)
  } else {
    res.status(400).json({ data: null, error: 'birthDate is required' })
    return
  }
  await prisma.baby.update({ where: { id: babyId }, data: { birthDate } })

  const status = await getPregnancyStatus(babyId, req.user!.userId)
  res.json({ data: status, error: null })
})
