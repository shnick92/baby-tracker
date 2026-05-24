import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

export const calendarRouter = Router()
calendarRouter.use(authMiddleware)

// GET /api/calendar?babyId=&from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns per-day presence flags for each event category (feedings, sleep, diapers, visitors)
calendarRouter.get('/', async (req, res) => {
  const babyId = req.query['babyId'] as string
  const from = req.query['from'] as string
  const to = req.query['to'] as string

  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    res.status(400).json({ data: null, error: 'from and to required (YYYY-MM-DD)' }); return
  }

  const start = new Date(`${from}T00:00:00.000Z`)
  const end = new Date(`${to}T23:59:59.999Z`)

  const [feedings, sleeps, diapers, visitors] = await Promise.all([
    prisma.feedingLog.findMany({
      where: { babyId, startedAt: { gte: start, lte: end } },
      select: { startedAt: true },
    }),
    prisma.sleepLog.findMany({
      where: { babyId, startedAt: { gte: start, lte: end } },
      select: { startedAt: true },
    }),
    prisma.diaperLog.findMany({
      where: { babyId, occurredAt: { gte: start, lte: end } },
      select: { occurredAt: true },
    }),
    prisma.visitorSlot.findMany({
      where: { babyId, date: { gte: from, lte: to } },
      select: { date: true },
    }),
  ])

  const days: Record<string, { feedings: boolean; sleep: boolean; diapers: boolean; visitors: boolean }> = {}

  const getOrInit = (key: string) => {
    if (!days[key]) days[key] = { feedings: false, sleep: false, diapers: false, visitors: false }
    return days[key]
  }

  for (const f of feedings) getOrInit(new Date(f.startedAt).toISOString().slice(0, 10)).feedings = true
  for (const s of sleeps) getOrInit(new Date(s.startedAt).toISOString().slice(0, 10)).sleep = true
  for (const d of diapers) getOrInit(new Date(d.occurredAt).toISOString().slice(0, 10)).diapers = true
  for (const v of visitors) getOrInit(v.date).visitors = true

  res.json({ data: { days }, error: null })
})
