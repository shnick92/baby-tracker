import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

export const historyRouter = Router()
historyRouter.use(authMiddleware)

// GET /api/history/daily?babyId=&date=YYYY-MM-DD
// Returns all logs for a given calendar date
historyRouter.get('/daily', async (req, res) => {
  const babyId = req.query['babyId'] as string
  const dateStr = req.query['date'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    res.status(400).json({ data: null, error: 'date required (YYYY-MM-DD)' }); return
  }

  const start = new Date(`${dateStr}T00:00:00.000Z`)
  const end = new Date(`${dateStr}T23:59:59.999Z`)

  const [feedings, sleeps, diapers, medications, tummyTimes, moods] = await Promise.all([
    prisma.feedingLog.findMany({
      where: { babyId, startedAt: { gte: start, lte: end } },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.sleepLog.findMany({
      where: { babyId, startedAt: { gte: start, lte: end } },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.diaperLog.findMany({
      where: { babyId, occurredAt: { gte: start, lte: end } },
      orderBy: { occurredAt: 'asc' },
    }),
    prisma.medicationLog.findMany({
      where: { babyId, givenAt: { gte: start, lte: end } },
      orderBy: { givenAt: 'asc' },
    }),
    prisma.tummyTimeLog.findMany({
      where: { babyId, startedAt: { gte: start, lte: end } },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.moodLog.findMany({
      where: { babyId, occurredAt: { gte: start, lte: end } },
      orderBy: { occurredAt: 'asc' },
      include: { customActivity: true },
    }),
  ])

  res.json({ data: { feedings, sleeps, diapers, medications, tummyTimes, moods }, error: null })
})

// GET /api/history/weekly?babyId=
// Returns 7-day aggregated stats: feeding summary, sleep summary, per-day diaper counts
historyRouter.get('/weekly', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) { res.status(400).json({ data: null, error: 'babyId required' }); return }

  const end = new Date()
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [feedings, sleeps, diapers] = await Promise.all([
    prisma.feedingLog.findMany({
      where: { babyId, startedAt: { gte: start, lte: end } },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.sleepLog.findMany({
      where: { babyId, startedAt: { gte: start, lte: end } },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.diaperLog.findMany({
      where: { babyId, occurredAt: { gte: start, lte: end } },
      orderBy: { occurredAt: 'asc' },
    }),
  ])

  // Feeding summary
  const completedFeedings = feedings.filter((f) => f.endedAt || f.type === 'BOTTLE' || f.type === 'PUMP')
  const breastFeeds = completedFeedings.filter((f) => f.type === 'BREAST_LEFT' || f.type === 'BREAST_RIGHT')
  const bottleAndPump = completedFeedings.filter((f) => f.type === 'BOTTLE' || f.type === 'PUMP')

  const totalDurationSec = breastFeeds.reduce((sum, f) => sum + (f.durationSec ?? 0), 0)
  const avgDurationSec = breastFeeds.length > 0 ? Math.round(totalDurationSec / breastFeeds.length) : 0
  const totalVolumeOz = bottleAndPump.reduce((sum, f) => sum + (f.volumeOz ?? 0), 0)
  const avgFeedsPerDay = Math.round((completedFeedings.length / 7) * 10) / 10

  // Sleep summary
  const completedSleeps = sleeps.filter((s) => s.endedAt)
  const totalSleepSec = completedSleeps.reduce((sum, s) => {
    return sum + Math.round((new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 1000)
  }, 0)
  const avgSleepPerDaySec = completedSleeps.length > 0 ? Math.round(totalSleepSec / 7) : 0

  let longestStretchSec = 0
  for (const s of completedSleeps) {
    const dur = Math.round((new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 1000)
    if (dur > longestStretchSec) longestStretchSec = dur
  }

  // Per-day diaper counts (last 7 days, keyed by YYYY-MM-DD UTC)
  const diaperByDay: Record<string, { wet: number; dirty: number; both: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    diaperByDay[key] = { wet: 0, dirty: 0, both: 0 }
  }
  for (const d of diapers) {
    const key = new Date(d.occurredAt).toISOString().slice(0, 10)
    if (diaperByDay[key]) {
      if (d.type === 'WET') diaperByDay[key].wet++
      else if (d.type === 'DIRTY') diaperByDay[key].dirty++
      else if (d.type === 'BOTH') diaperByDay[key].both++
    }
  }

  res.json({
    data: {
      feeding: {
        totalFeeds: completedFeedings.length,
        avgFeedsPerDay,
        breastFeedCount: breastFeeds.length,
        avgBreastDurationSec: avgDurationSec,
        totalVolumeOz: Math.round(totalVolumeOz * 10) / 10,
      },
      sleep: {
        totalSleepSec,
        avgSleepPerDaySec,
        longestStretchSec,
        sessionCount: completedSleeps.length,
      },
      diaperByDay,
    },
    error: null,
  })
})
