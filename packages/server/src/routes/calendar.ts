import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { toLocalDay } from '../lib/timezone'

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

  // Widen the UTC query by 1 day on each side to capture events whose UTC date
  // differs from their local date at timezone boundaries (e.g. UTC-5 late-evening events).
  const start = new Date(`${from}T00:00:00.000Z`)
  start.setUTCDate(start.getUTCDate() - 1)
  const end = new Date(`${to}T23:59:59.999Z`)
  end.setUTCDate(end.getUTCDate() + 1)

  const [feedings, sleeps, diapers, visitors, tummyTimes, moods, medications] = await Promise.all([
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
    prisma.tummyTimeLog.findMany({
      where: { babyId, startedAt: { gte: start, lte: end } },
      select: { startedAt: true },
    }),
    prisma.moodLog.findMany({
      where: { babyId, occurredAt: { gte: start, lte: end } },
      select: { occurredAt: true },
    }),
    prisma.medicationLog.findMany({
      where: { babyId, givenAt: { gte: start, lte: end } },
      select: { givenAt: true },
    }),
  ])

  const days: Record<string, { feedings: boolean; sleep: boolean; diapers: boolean; visitors: boolean }> = {}

  const getOrInit = (key: string) => {
    if (!days[key]) days[key] = { feedings: false, sleep: false, diapers: false, visitors: false }
    return days[key]
  }

  // Use local timezone for day keys so they match the client's date display.
  // tummyTime folds into the sleep dot; mood and medication fold into the feedings dot —
  // consistent with how DayDetail colours these event types.
  for (const f of feedings) getOrInit(toLocalDay(new Date(f.startedAt))).feedings = true
  for (const s of sleeps) getOrInit(toLocalDay(new Date(s.startedAt))).sleep = true
  for (const d of diapers) getOrInit(toLocalDay(new Date(d.occurredAt))).diapers = true
  for (const v of visitors) getOrInit(v.date).visitors = true
  for (const t of tummyTimes) getOrInit(toLocalDay(new Date(t.startedAt))).sleep = true
  for (const m of moods) getOrInit(toLocalDay(new Date(m.occurredAt))).feedings = true
  for (const med of medications) getOrInit(toLocalDay(new Date(med.givenAt))).feedings = true

  res.json({ data: { days }, error: null })
})
