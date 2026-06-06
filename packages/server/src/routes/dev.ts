import { Router } from 'express'
import { prisma } from '../lib/prisma'

export const devRouter = Router()

// POST /api/dev/seed-demo
// Wipes and re-seeds realistic demo data for screenshot capture.
// Only registered when NODE_ENV !== 'production'.
devRouter.post('/seed-demo', async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ data: null, error: 'Not available in production' })
    return
  }

  const BABY_ID = 'seed-baby-001'

  // Resolve the two seed users by their BabyUser entries rather than by name
  // so nothing here is tied to a specific family's names.
  const babyUsers = await prisma.babyUser.findMany({
    where: { babyId: BABY_ID },
    include: { user: true },
    take: 2,
    orderBy: { userId: 'asc' },
  })

  if (babyUsers.length < 1) {
    res.status(500).json({ data: null, error: 'No users linked to demo baby — run prisma db seed first' })
    return
  }

  const USER1 = babyUsers[0]!.userId
  const USER2 = babyUsers[1]?.userId ?? USER1

  // ── Wipe existing demo activity (order matters for FK constraints) ────────────

  // Phase 1: delete all rows that carry a sicknessEpisodeId FK (must precede episode delete)
  await prisma.$transaction([
    prisma.temperatureLog.deleteMany({ where: { babyId: BABY_ID } }),
    prisma.medicationLog.deleteMany({ where: { babyId: BABY_ID } }),
    prisma.feedingLog.deleteMany({ where: { babyId: BABY_ID } }),
    prisma.sleepLog.deleteMany({ where: { babyId: BABY_ID } }),
    prisma.diaperLog.deleteMany({ where: { babyId: BABY_ID } }),
    prisma.moodLog.deleteMany({ where: { babyId: BABY_ID } }),
    prisma.tummyTimeLog.deleteMany({ where: { babyId: BABY_ID } }),
    prisma.weightLog.deleteMany({ where: { babyId: BABY_ID } }),
    prisma.aIConversationLog.deleteMany({ where: { babyId: BABY_ID } }),
    prisma.purchase.deleteMany({ where: { babyId: BABY_ID } }),
  ])

  // Phase 2: delete episodes (now safe; cascades symptoms via DB)
  await prisma.sicknessEpisode.deleteMany({ where: { babyId: BABY_ID } })

  // ── Update baby ───────────────────────────────────────────────────────────────

  const birthDate = new Date()
  birthDate.setDate(birthDate.getDate() - 42) // 6 weeks ago

  const babyName = process.env.DEMO_BABY_NAME ?? 'Baby'

  // Keep a dueDate so getPregnancyStatus returns non-null and born=true is derived correctly.
  // Without dueDate the pregnancy service returns null → born defaults to false → SOS button hidden.
  const dummyDueDate = new Date(birthDate)
  dummyDueDate.setDate(dummyDueDate.getDate() + 280) // ~40 weeks after birth

  await prisma.baby.update({
    where: { id: BABY_ID },
    data: { name: babyName, birthDate, dueDate: dummyDueDate },
  })

  // ── Helper: offset from now ───────────────────────────────────────────────────

  const ago = (days: number, hours = 0, minutes = 0): Date => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    d.setHours(d.getHours() - hours)
    d.setMinutes(d.getMinutes() - minutes)
    d.setSeconds(0, 0)
    return d
  }

  // ── Feeding logs — 5 days, every ~2.5h, mix of types ─────────────────────────

  type FeedingInput = {
    babyId: string
    loggedById: string
    type: 'BREAST_LEFT' | 'BREAST_RIGHT' | 'BOTTLE'
    startedAt: Date
    endedAt: Date | null
    durationSec: number | null
    volumeOz: number | null
    notes: string | null
  }

  const feedingSchedule: Array<[number, number, 'BREAST_LEFT' | 'BREAST_RIGHT' | 'BOTTLE', number | null]> = [
    [5, 0, 'BREAST_LEFT', null],
    [4, 21, 'BOTTLE', 3.5],
    [4, 18, 'BREAST_RIGHT', null],
    [4, 15, 'BREAST_LEFT', null],
    [4, 12, 'BOTTLE', 4.0],
    [4, 9, 'BREAST_RIGHT', null],
    [4, 6, 'BREAST_LEFT', null],
    [4, 3, 'BOTTLE', 3.5],
    [3, 23, 'BREAST_LEFT', null],
    [3, 20, 'BREAST_RIGHT', null],
    [3, 17, 'BOTTLE', 4.0],
    [3, 14, 'BREAST_LEFT', null],
    [3, 11, 'BOTTLE', 3.5],
    [3, 8, 'BREAST_RIGHT', null],
    [3, 5, 'BREAST_LEFT', null],
    [2, 22, 'BOTTLE', 4.0],
    [2, 19, 'BREAST_LEFT', null],
    [2, 16, 'BREAST_RIGHT', null],
    [2, 13, 'BOTTLE', 3.5],
    [2, 10, 'BREAST_LEFT', null],
    [2, 7, 'BOTTLE', 4.0],
    [1, 21, 'BREAST_RIGHT', null],
    [1, 18, 'BREAST_LEFT', null],
    [1, 15, 'BOTTLE', 4.0],
    [1, 12, 'BREAST_RIGHT', null],
    [1, 9, 'BREAST_LEFT', null],
    [1, 6, 'BOTTLE', 3.5],
    [0, 10, 'BREAST_LEFT', null],
    [0, 7, 'BREAST_RIGHT', null],
    [0, 4, 'BOTTLE', 4.0],
  ]

  const feedingData: FeedingInput[] = feedingSchedule.map(([d, h, type, vol], idx) => {
    const startedAt = ago(d, h)
    const isBreast = type !== 'BOTTLE'
    const durationSec = isBreast ? 900 + (idx % 5) * 60 : null
    const endedAt = new Date(startedAt.getTime() + (isBreast ? durationSec! * 1000 : 15 * 60_000))
    return {
      babyId: BABY_ID,
      loggedById: idx % 2 === 0 ? USER1 : USER2,
      type,
      startedAt,
      endedAt,
      durationSec,
      volumeOz: vol,
      notes: null,
    }
  })

  // Active feeding — started 4 minutes ago, no endedAt (drives dashboard timer)
  feedingData.push({
    babyId: BABY_ID,
    loggedById: USER1,
    type: 'BREAST_LEFT',
    startedAt: ago(0, 0, 4),
    endedAt: null,
    durationSec: null,
    volumeOz: null,
    notes: null,
  })

  // ── Sleep logs — 5 days, 2 naps + 1 night per day + 1 active nap ────────────

  type SleepInput = {
    babyId: string
    loggedById: string
    type: 'NAP' | 'NIGHT'
    startedAt: Date
    endedAt: Date | null
    notes: string | null
  }

  const sleepData: SleepInput[] = [
    { babyId: BABY_ID, loggedById: USER2, type: 'NAP', startedAt: ago(5, 10), endedAt: ago(5, 8, 30), notes: null },
    { babyId: BABY_ID, loggedById: USER2, type: 'NAP', startedAt: ago(5, 4), endedAt: ago(5, 2, 45), notes: null },
    { babyId: BABY_ID, loggedById: USER1, type: 'NIGHT', startedAt: ago(5, 0), endedAt: ago(4, 18), notes: null },
    { babyId: BABY_ID, loggedById: USER1, type: 'NAP', startedAt: ago(4, 12), endedAt: ago(4, 10, 40), notes: 'Good nap' },
    { babyId: BABY_ID, loggedById: USER2, type: 'NAP', startedAt: ago(4, 5), endedAt: ago(4, 3, 30), notes: null },
    { babyId: BABY_ID, loggedById: USER1, type: 'NIGHT', startedAt: ago(4, 0), endedAt: ago(3, 18), notes: null },
    { babyId: BABY_ID, loggedById: USER2, type: 'NAP', startedAt: ago(3, 13), endedAt: ago(3, 11, 45), notes: null },
    { babyId: BABY_ID, loggedById: USER1, type: 'NAP', startedAt: ago(3, 5), endedAt: ago(3, 3, 20), notes: null },
    { babyId: BABY_ID, loggedById: USER2, type: 'NIGHT', startedAt: ago(3, 0), endedAt: ago(2, 19), notes: null },
    { babyId: BABY_ID, loggedById: USER1, type: 'NAP', startedAt: ago(2, 12), endedAt: ago(2, 10, 30), notes: null },
    { babyId: BABY_ID, loggedById: USER2, type: 'NAP', startedAt: ago(2, 4, 30), endedAt: ago(2, 3), notes: 'Short nap' },
    { babyId: BABY_ID, loggedById: USER1, type: 'NIGHT', startedAt: ago(2, 0), endedAt: ago(1, 17, 30), notes: null },
    { babyId: BABY_ID, loggedById: USER2, type: 'NAP', startedAt: ago(1, 11), endedAt: ago(1, 9, 45), notes: null },
    { babyId: BABY_ID, loggedById: USER1, type: 'NAP', startedAt: ago(1, 4), endedAt: ago(1, 2, 30), notes: null },
    { babyId: BABY_ID, loggedById: USER2, type: 'NIGHT', startedAt: ago(1, 0), endedAt: ago(0, 6, 30), notes: 'Woke once overnight' },
    // Active nap started 40 minutes ago (drives sleep page timer)
    { babyId: BABY_ID, loggedById: USER1, type: 'NAP', startedAt: ago(0, 0, 40), endedAt: null, notes: null },
  ]

  // ── Diaper logs ───────────────────────────────────────────────────────────────

  type DiaperInput = {
    babyId: string
    loggedById: string
    type: 'WET' | 'DIRTY' | 'BOTH'
    occurredAt: Date
    notes: string | null
  }

  const diaperData: DiaperInput[] = [
    { babyId: BABY_ID, loggedById: USER2, type: 'WET', occurredAt: ago(5, 8), notes: null },
    { babyId: BABY_ID, loggedById: USER1, type: 'DIRTY', occurredAt: ago(4, 20), notes: 'Yellow, seedy' },
    { babyId: BABY_ID, loggedById: USER2, type: 'WET', occurredAt: ago(4, 14), notes: null },
    { babyId: BABY_ID, loggedById: USER1, type: 'BOTH', occurredAt: ago(4, 6), notes: null },
    { babyId: BABY_ID, loggedById: USER2, type: 'WET', occurredAt: ago(3, 16), notes: null },
    { babyId: BABY_ID, loggedById: USER1, type: 'DIRTY', occurredAt: ago(3, 8), notes: null },
    { babyId: BABY_ID, loggedById: USER2, type: 'WET', occurredAt: ago(2, 18), notes: null },
    { babyId: BABY_ID, loggedById: USER1, type: 'BOTH', occurredAt: ago(2, 9), notes: null },
    { babyId: BABY_ID, loggedById: USER2, type: 'WET', occurredAt: ago(1, 14), notes: null },
    { babyId: BABY_ID, loggedById: USER1, type: 'WET', occurredAt: ago(0, 5), notes: null },
  ]

  // ── Weight logs — 3 measurements spanning 6 weeks ────────────────────────────

  type WeightInput = {
    babyId: string
    loggedById: string
    lbs: number
    oz: number
    recordedAt: Date
    notes: string | null
  }

  const weightData: WeightInput[] = [
    { babyId: BABY_ID, loggedById: USER2, lbs: 7, oz: 4, recordedAt: ago(42), notes: 'Birth weight' },
    { babyId: BABY_ID, loggedById: USER1, lbs: 7, oz: 11, recordedAt: ago(28), notes: '2 week checkup' },
    { babyId: BABY_ID, loggedById: USER2, lbs: 9, oz: 2, recordedAt: ago(7), notes: '1 month checkup' },
  ]

  // ── AI conversation — 1 seeded Q&A ───────────────────────────────────────────

  const aiData = [
    {
      babyId: BABY_ID,
      userId: USER1,
      role: 'USER' as const,
      content: 'Is 8 feedings a day normal for a 6 week old?',
    },
    {
      babyId: BABY_ID,
      userId: USER1,
      role: 'ASSISTANT' as const,
      content:
        `Yes, 8 feedings per day is very normal for a 6-week-old! Newborns typically feed 8–12 times in 24 hours — roughly every 2–3 hours. At 6 weeks, some babies start spacing out slightly, but 8 feedings is still well within the typical range. The most important thing is that ${babyName} is showing steady weight gain and has plenty of wet and dirty diapers. If you notice fewer than 6 wet diapers a day or signs of poor weight gain, that's worth checking with your pediatrician.`,
    },
  ]

  // ── Purchases — 4 BOUGHT, 2 GIFTED, 3 NEEDED, 1 SKIP ────────────────────────

  type PurchaseInput = {
    babyId: string
    name: string
    category: string
    status: 'BOUGHT' | 'GIFTED' | 'NEEDED' | 'SKIP'
    price: number | null
    notes: string | null
  }

  const purchaseData: PurchaseInput[] = [
    { babyId: BABY_ID, name: 'Infant car seat', category: 'Travel', status: 'BOUGHT', price: 249.99, notes: null },
    { babyId: BABY_ID, name: 'Baby sound machine', category: 'Sleep', status: 'BOUGHT', price: 89.99, notes: null },
    { babyId: BABY_ID, name: 'Nasal aspirator', category: 'Health', status: 'BOUGHT', price: 21.99, notes: null },
    { babyId: BABY_ID, name: 'Bassinet', category: 'Sleep', status: 'BOUGHT', price: 200.00, notes: null },
    { babyId: BABY_ID, name: 'Breast milk warmer', category: 'Feeding', status: 'GIFTED', price: null, notes: 'Baby shower gift' },
    { babyId: BABY_ID, name: 'Nursing pillow', category: 'Feeding', status: 'GIFTED', price: null, notes: 'Baby shower gift' },
    { babyId: BABY_ID, name: 'Pack \'n Play', category: 'Sleep', status: 'NEEDED', price: 79.99, notes: null },
    { babyId: BABY_ID, name: 'Diaper pail', category: 'Diapering', status: 'NEEDED', price: 44.99, notes: null },
    { babyId: BABY_ID, name: 'Baby carrier', category: 'Travel', status: 'NEEDED', price: 180.00, notes: null },
    { babyId: BABY_ID, name: 'Video monitor', category: 'Safety', status: 'SKIP', price: 299.99, notes: 'Have sound machine already' },
  ]

  // ── Sickness episode — resolved (started 2d ago, ended 1d ago) ───────────────

  const episode = await prisma.sicknessEpisode.create({
    data: {
      babyId: BABY_ID,
      startedById: USER2,
      startedAt: ago(2, 6),
      endedAt: ago(1, 8),
      notes: 'Mild fever and congestion. Resolved within 24 hours.',
      symptoms: {
        create: [
          { label: 'Fever' },
          { label: 'Runny nose' },
          { label: 'Fussiness' },
        ],
      },
    },
  })

  const tempLogs = [
    { babyId: BABY_ID, episodeId: episode.id, loggedById: USER2, tempF: 100.8, method: 'FOREHEAD' as const, recordedAt: ago(2, 5), notes: 'First reading' },
    { babyId: BABY_ID, episodeId: episode.id, loggedById: USER1, tempF: 101.6, method: 'FOREHEAD' as const, recordedAt: ago(2, 2), notes: 'Rising' },
    { babyId: BABY_ID, episodeId: episode.id, loggedById: USER2, tempF: 100.2, method: 'FOREHEAD' as const, recordedAt: ago(1, 20), notes: 'After Tylenol' },
    { babyId: BABY_ID, episodeId: episode.id, loggedById: USER1, tempF: 98.9, method: 'FOREHEAD' as const, recordedAt: ago(1, 12), notes: 'Back to normal' },
  ]

  const medLogs = [
    { babyId: BABY_ID, sicknessEpisodeId: episode.id, loggedById: USER2, name: 'Infant Tylenol', dosageNote: '2.5 mL', givenAt: ago(2, 3), notes: 'For fever' },
    { babyId: BABY_ID, sicknessEpisodeId: episode.id, loggedById: USER1, name: 'Saline nasal drops', dosageNote: '2 drops each nostril', givenAt: ago(2, 1), notes: null },
    { babyId: BABY_ID, sicknessEpisodeId: episode.id, loggedById: USER2, name: 'Infant Tylenol', dosageNote: '2.5 mL', givenAt: ago(1, 18), notes: 'Fever returning' },
  ]

  // ── Tummy time logs — 5 sessions across 3 days ───────────────────────────────

  const tummyData = [
    { babyId: BABY_ID, loggedById: USER2, startedAt: ago(3, 11), endedAt: ago(3, 10, 45), durationSec: 900, notes: null },
    { babyId: BABY_ID, loggedById: USER1, startedAt: ago(2, 15), endedAt: ago(2, 14, 48), durationSec: 720, notes: 'Lifted head well' },
    { babyId: BABY_ID, loggedById: USER2, startedAt: ago(2, 9), endedAt: ago(2, 8, 50), durationSec: 600, notes: null },
    { babyId: BABY_ID, loggedById: USER1, startedAt: ago(1, 14), endedAt: ago(1, 13, 45), durationSec: 900, notes: null },
    { babyId: BABY_ID, loggedById: USER2, startedAt: ago(0, 9), endedAt: ago(0, 8, 50), durationSec: 600, notes: 'Fussed at 10 min' },
  ]

  // ── Mood logs — mix of moods across 3 days ────────────────────────────────────

  const moodData = [
    { babyId: BABY_ID, loggedById: USER1, mood: 'HAPPY' as const, occurredAt: ago(3, 14), notes: 'Very alert after nap' },
    { babyId: BABY_ID, loggedById: USER2, mood: 'FUSSY' as const, occurredAt: ago(2, 18), notes: null },
    { babyId: BABY_ID, loggedById: USER1, mood: 'CRYING' as const, occurredAt: ago(2, 11), notes: 'Gas pains, settled with bicycle legs' },
    { babyId: BABY_ID, loggedById: USER2, mood: 'ALERT' as const, occurredAt: ago(1, 15), notes: null },
    { babyId: BABY_ID, loggedById: USER1, mood: 'HAPPY' as const, occurredAt: ago(0, 8), notes: null },
  ]

  // ── Standalone medication logs (not episode-linked) ───────────────────────────

  const standaloneMedData = [
    { babyId: BABY_ID, loggedById: USER2, name: 'Vitamin D drops', dosageNote: '400 IU', givenAt: ago(3, 8), notes: 'Daily supplement' },
    { babyId: BABY_ID, loggedById: USER1, name: 'Vitamin D drops', dosageNote: '400 IU', givenAt: ago(2, 8), notes: null },
    { babyId: BABY_ID, loggedById: USER2, name: 'Vitamin D drops', dosageNote: '400 IU', givenAt: ago(1, 8), notes: null },
    { babyId: BABY_ID, loggedById: USER1, name: 'Vitamin D drops', dosageNote: '400 IU', givenAt: ago(0, 8), notes: null },
  ]

  // ── Insert everything ─────────────────────────────────────────────────────────

  await Promise.all([
    prisma.feedingLog.createMany({ data: feedingData }),
    prisma.sleepLog.createMany({ data: sleepData }),
    prisma.diaperLog.createMany({ data: diaperData }),
    prisma.weightLog.createMany({ data: weightData }),
    prisma.aIConversationLog.createMany({ data: aiData }),
    prisma.purchase.createMany({ data: purchaseData }),
    prisma.temperatureLog.createMany({ data: tempLogs }),
    prisma.medicationLog.createMany({ data: [...medLogs, ...standaloneMedData] }),
    prisma.tummyTimeLog.createMany({ data: tummyData }),
    prisma.moodLog.createMany({ data: moodData }),
  ])

  // ── Mark ~60% of hospital bag checklist items as checked ─────────────────────

  const checklistTypes = ['HOSPITAL_BAG_MOM', 'HOSPITAL_BAG_BABY'] as const
  for (const [i, type] of checklistTypes.entries()) {
    const list = await prisma.checklist.findFirst({
      where: { babyId: BABY_ID, type },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!list) continue
    const toCheck = list.items.slice(0, Math.floor(list.items.length * 0.6))
    await prisma.checklistItem.updateMany({
      where: { id: { in: toCheck.map((item) => item.id) } },
      data: { isChecked: true, checkedAt: new Date(), checkedById: i % 2 === 0 ? USER1 : USER2 },
    })
  }

  res.json({ data: { ok: true, message: 'Demo data seeded', episodeId: episode.id }, error: null })
})
