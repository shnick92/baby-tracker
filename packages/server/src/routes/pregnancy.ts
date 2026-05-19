import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
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
