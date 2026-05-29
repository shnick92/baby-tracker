import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SEED_BABY_ID = 'seed-baby-001'

const CHECKLIST_DEFAULTS = {
  HOSPITAL_BAG_MOM: [
    { category: 'Documents', label: 'Insurance card & ID', sortOrder: 0 },
    { category: 'Documents', label: 'Birth plan (printed copies)', sortOrder: 1 },
    { category: 'Documents', label: 'Hospital pre-registration paperwork', sortOrder: 2 },
    { category: 'Clothing', label: 'Comfortable robe or nightgown', sortOrder: 10 },
    { category: 'Clothing', label: 'Non-slip socks or slippers', sortOrder: 11 },
    { category: 'Clothing', label: 'Going-home outfit (loose)', sortOrder: 12 },
    { category: 'Clothing', label: 'Nursing bra x2', sortOrder: 13 },
    { category: 'Comfort', label: 'Pillow from home', sortOrder: 20 },
    { category: 'Comfort', label: 'Phone charger + portable battery', sortOrder: 21 },
    { category: 'Comfort', label: 'Snacks for labor', sortOrder: 22 },
    { category: 'Comfort', label: 'Lip balm', sortOrder: 23 },
    { category: 'Comfort', label: 'Hair ties / headband', sortOrder: 24 },
    { category: 'Toiletries', label: 'Shampoo, conditioner, body wash', sortOrder: 30 },
    { category: 'Toiletries', label: 'Toothbrush & toothpaste', sortOrder: 31 },
    { category: 'Toiletries', label: 'Deodorant', sortOrder: 32 },
    { category: 'Toiletries', label: 'Maternity pads (hospital provides but bring extras)', sortOrder: 33 },
  ],
  HOSPITAL_BAG_BABY: [
    { category: 'Clothing', label: 'Onesies (newborn & 0-3m) x3', sortOrder: 0 },
    { category: 'Clothing', label: 'Sleepers / footed pajamas x2', sortOrder: 1 },
    { category: 'Clothing', label: 'Socks x3 pairs', sortOrder: 2 },
    { category: 'Clothing', label: 'Hat (newborn size)', sortOrder: 3 },
    { category: 'Clothing', label: 'Going-home outfit', sortOrder: 4 },
    { category: 'Feeding', label: 'Nursing pillow', sortOrder: 10 },
    { category: 'Feeding', label: 'Bottles (if bottle feeding)', sortOrder: 11 },
    { category: 'Feeding', label: 'Pacifiers x2', sortOrder: 12 },
    { category: 'Care', label: 'Swaddle blankets x2', sortOrder: 20 },
    { category: 'Care', label: 'Diaper bag (packed)', sortOrder: 21 },
    { category: 'Car seat', label: 'Infant car seat (installed in car)', sortOrder: 30 },
  ],
  HOME_PREP: [
    { category: 'Nursery', label: 'Crib / bassinet assembled', sortOrder: 0 },
    { category: 'Nursery', label: 'Crib mattress with waterproof cover', sortOrder: 1 },
    { category: 'Nursery', label: 'Dresser / wardrobe stocked with washed clothes', sortOrder: 2 },
    { category: 'Nursery', label: 'Baby monitor set up', sortOrder: 3 },
    { category: 'Nursery', label: 'White noise machine', sortOrder: 4 },
    { category: 'Feeding station', label: 'Nursing chair / glider in place', sortOrder: 10 },
    { category: 'Feeding station', label: 'Burp cloths stocked', sortOrder: 11 },
    { category: 'Feeding station', label: 'Breast pump assembled & tested', sortOrder: 12 },
    { category: 'Feeding station', label: 'Bottles sterilized', sortOrder: 13 },
    { category: 'Safety', label: 'Outlet covers installed', sortOrder: 20 },
    { category: 'Safety', label: 'Cabinet locks on dangerous cabinets', sortOrder: 21 },
    { category: 'Safety', label: 'Baby-proofed stair gates (if applicable)', sortOrder: 22 },
    { category: 'Safety', label: 'Smoke & CO detectors tested', sortOrder: 23 },
    { category: 'Car', label: 'Car seat installed & inspected', sortOrder: 30 },
    { category: 'Household', label: 'Fridge stocked with easy meals', sortOrder: 40 },
    { category: 'Household', label: 'Laundry done & caught up', sortOrder: 41 },
    { category: 'Household', label: 'Postpartum recovery supplies stocked', sortOrder: 42 },
  ],
  BEFORE_HOME: [
    { category: 'Hospital discharge', label: 'Newborn hearing test done', sortOrder: 0 },
    { category: 'Hospital discharge', label: 'Bilirubin / jaundice check complete', sortOrder: 1 },
    { category: 'Hospital discharge', label: 'Pediatrician follow-up appointment booked', sortOrder: 2 },
    { category: 'Hospital discharge', label: 'Lactation consultant visited (if breastfeeding)', sortOrder: 3 },
    { category: 'Hospital discharge', label: 'Discharge paperwork & birth certificate started', sortOrder: 4 },
    { category: 'Notifications', label: 'Both families notified', sortOrder: 10 },
    { category: 'Notifications', label: 'Workplace notified (maternity/paternity leave started)', sortOrder: 11 },
    { category: 'Practical', label: 'Car seat base confirmed in car', sortOrder: 20 },
    { category: 'Practical', label: 'Going-home outfit on baby', sortOrder: 21 },
    { category: 'Practical', label: 'Take last hospital photos', sortOrder: 22 },
  ],
} as const

async function seedChecklists(babyId: string) {
  for (const [type, items] of Object.entries(CHECKLIST_DEFAULTS)) {
    const checklist = await prisma.checklist.upsert({
      where: { babyId_type: { babyId, type: type as keyof typeof CHECKLIST_DEFAULTS } },
      create: { babyId, type: type as keyof typeof CHECKLIST_DEFAULTS },
      update: {},
    })

    for (const item of items) {
      const existing = await prisma.checklistItem.findFirst({
        where: { checklistId: checklist.id, label: item.label },
      })
      if (!existing) {
        await prisma.checklistItem.create({
          data: { checklistId: checklist.id, ...item },
        })
      }
    }
  }
  console.log('Seeded default checklist items')
}

// Sample weight measurements — roughly tracks a typical newborn growth curve
async function seedWeightLogs(babyId: string, loggedById: string) {
  const existing = await prisma.weightLog.count({ where: { babyId } })
  if (existing > 0) return

  // Birth on Oct 1; measurements at 0, 3, 7, 14, 21, 30, 45, 60, 90, 120, 150, 180 days
  const birthDate = new Date('2026-10-01')
  const samples: { daysAfterBirth: number; lbs: number; oz: number; notes?: string }[] = [
    { daysAfterBirth: 0,   lbs: 7, oz: 6,  notes: 'Birth weight' },
    { daysAfterBirth: 3,   lbs: 7, oz: 1,  notes: 'Day 3 checkup — typical drop' },
    { daysAfterBirth: 7,   lbs: 7, oz: 8 },
    { daysAfterBirth: 14,  lbs: 7, oz: 14 },
    { daysAfterBirth: 21,  lbs: 8, oz: 5 },
    { daysAfterBirth: 30,  lbs: 9, oz: 1,  notes: '1-month checkup' },
    { daysAfterBirth: 45,  lbs: 9, oz: 14 },
    { daysAfterBirth: 60,  lbs: 10, oz: 11, notes: '2-month checkup' },
    { daysAfterBirth: 90,  lbs: 12, oz: 2,  notes: '3-month checkup' },
    { daysAfterBirth: 120, lbs: 13, oz: 8,  notes: '4-month checkup' },
    { daysAfterBirth: 150, lbs: 14, oz: 12, notes: '5-month checkup' },
    { daysAfterBirth: 180, lbs: 15, oz: 10, notes: '6-month checkup' },
  ]

  for (const s of samples) {
    const recordedAt = new Date(birthDate)
    recordedAt.setDate(birthDate.getDate() + s.daysAfterBirth)
    await prisma.weightLog.create({
      data: { babyId, loggedById, lbs: s.lbs, oz: s.oz, recordedAt, notes: s.notes },
    })
  }
  console.log('Seeded sample weight logs')
}

async function seedTummyTimeLogs(babyId: string, loggedById: string) {
  const existing = await prisma.tummyTimeLog.count({ where: { babyId } })
  if (existing > 0) return

  const now = new Date()
  const samples: { minutesAgo: number; durationSec: number; notes?: string }[] = [
    { minutesAgo: 30,  durationSec: 5 * 60 },
    { minutesAgo: 150, durationSec: 7 * 60, notes: 'Lifted head!' },
    { minutesAgo: 300, durationSec: 4 * 60 },
    { minutesAgo: 1500, durationSec: 6 * 60 }, // yesterday
    { minutesAgo: 1620, durationSec: 8 * 60, notes: 'Really enjoyed it' },
    { minutesAgo: 2880, durationSec: 5 * 60 }, // 2 days ago
    { minutesAgo: 3000, durationSec: 3 * 60 },
  ]

  for (const s of samples) {
    const startedAt = new Date(now.getTime() - s.minutesAgo * 60 * 1000)
    const endedAt = new Date(startedAt.getTime() + s.durationSec * 1000)
    await prisma.tummyTimeLog.create({
      data: { babyId, loggedById, startedAt, endedAt, durationSec: s.durationSec, notes: s.notes },
    })
  }
  console.log('Seeded sample tummy time logs')
}

async function seedMoodLogs(babyId: string, loggedById: string) {
  const existing = await prisma.moodLog.count({ where: { babyId } })
  if (existing > 0) return

  const now = new Date()
  const samples: { minutesAgo: number; mood: 'HAPPY' | 'FUSSY' | 'CRYING' | 'SLEEPING' | 'ALERT' | 'BATH' | 'WALK'; notes?: string }[] = [
    { minutesAgo: 20,   mood: 'HAPPY' },
    { minutesAgo: 90,   mood: 'ALERT', notes: 'Wide awake after feed' },
    { minutesAgo: 180,  mood: 'SLEEPING' },
    { minutesAgo: 300,  mood: 'FUSSY', notes: 'Gassy' },
    { minutesAgo: 480,  mood: 'BATH' },
    { minutesAgo: 600,  mood: 'HAPPY' },
    { minutesAgo: 1440, mood: 'WALK', notes: 'Morning walk around the block' },
    { minutesAgo: 1560, mood: 'CRYING', notes: 'Hungry' },
    { minutesAgo: 1620, mood: 'HAPPY' },
    { minutesAgo: 2880, mood: 'ALERT' },
    { minutesAgo: 2940, mood: 'SLEEPING' },
  ]

  for (const s of samples) {
    const occurredAt = new Date(now.getTime() - s.minutesAgo * 60 * 1000)
    await prisma.moodLog.create({
      data: { babyId, loggedById, mood: s.mood, occurredAt, notes: s.notes },
    })
  }
  console.log('Seeded sample mood logs')
}

// Dense 7-day feed/sleep/diaper logs for testing AI insights generation.
// Only runs when SEED_INSIGHTS_DATA=true — avoids polluting the standard dev DB.
async function seedInsightsData(babyId: string, loggedById: string) {
  const existing = await prisma.feedingLog.count({ where: { babyId } })
  if (existing > 0) {
    console.log('Skipping insights seed — feeding logs already present')
    return
  }

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000
  const HOUR = 60 * 60 * 1000

  // 8 bottle feeds per day for 7 days, ~3h apart with ±15 min jitter
  for (let day = 6; day >= 0; day--) {
    for (let feed = 0; feed < 8; feed++) {
      const jitterMs = (Math.random() - 0.5) * 30 * 60 * 1000
      const fedAt = new Date(now - day * DAY - feed * 3 * HOUR + jitterMs)
      await prisma.feedingLog.create({
        data: {
          babyId,
          loggedById,
          type: 'BOTTLE',
          startedAt: fedAt,
          endedAt: new Date(fedAt.getTime() + 20 * 60 * 1000),
          volumeOz: 3 + Math.random() * 1.5,
        },
      })
    }
  }

  // 4 naps + 1 night sleep per day for 7 days
  for (let day = 6; day >= 0; day--) {
    // Night sleep: 10 PM – 5 AM (7 h)
    const nightStart = new Date(now - day * DAY - 22 * HOUR)
    await prisma.sleepLog.create({
      data: {
        babyId, loggedById,
        type: 'NIGHT',
        startedAt: nightStart,
        endedAt: new Date(nightStart.getTime() + 7 * HOUR),
      },
    })
    // 4 naps: 9 AM, 12 PM, 3 PM, 6 PM — 45 min each
    for (const napHour of [9, 12, 15, 18]) {
      const napStart = new Date(now - day * DAY - (24 - napHour) * HOUR)
      await prisma.sleepLog.create({
        data: {
          babyId, loggedById,
          type: 'NAP',
          startedAt: napStart,
          endedAt: new Date(napStart.getTime() + 45 * 60 * 1000),
        },
      })
    }
  }

  // 8 diapers per day for 7 days
  for (let day = 6; day >= 0; day--) {
    for (let d = 0; d < 8; d++) {
      const occurredAt = new Date(now - day * DAY - d * 3 * HOUR)
      await prisma.diaperLog.create({
        data: {
          babyId, loggedById,
          type: d % 3 === 0 ? 'DIRTY' : 'WET',
          occurredAt,
        },
      })
    }
  }

  console.log('Seeded 7-day insights data: 56 feeds, 35 sleeps, 56 diapers')
}

async function main() {
  const u1Name = process.env.SEED_USER_1_NAME ?? 'Nick'
  const u1Email = process.env.SEED_USER_1_EMAIL ?? 'nick@example.com'
  const u1Password = process.env.SEED_USER_1_PASSWORD ?? 'changeme'
  const u1Phone = process.env.SEED_USER_1_PHONE ?? null

  const u2Name = process.env.SEED_USER_2_NAME ?? 'Jess'
  const u2Email = process.env.SEED_USER_2_EMAIL ?? 'jess@example.com'
  const u2Password = process.env.SEED_USER_2_PASSWORD ?? 'changeme'
  const u2Phone = process.env.SEED_USER_2_PHONE ?? null

  const [hash1, hash2] = await Promise.all([bcrypt.hash(u1Password, 12), bcrypt.hash(u2Password, 12)])

  const [user1, user2] = await Promise.all([
    prisma.user.upsert({
      where: { email: u1Email },
      update: { phone: u1Phone },
      create: { name: u1Name, email: u1Email, passwordHash: hash1, phone: u1Phone },
    }),
    prisma.user.upsert({
      where: { email: u2Email },
      update: { phone: u2Phone },
      create: { name: u2Name, email: u2Email, passwordHash: hash2, phone: u2Phone },
    }),
  ])

  const baby = await prisma.baby.upsert({
    where: { id: SEED_BABY_ID },
    update: { birthDate: new Date('2026-10-01') },
    create: { id: SEED_BABY_ID, dueDate: new Date('2026-10-01'), birthDate: new Date('2026-10-01') },
  })

  await Promise.all([
    prisma.babyUser.upsert({
      where: { babyId_userId: { babyId: baby.id, userId: user1.id } },
      update: {},
      create: { babyId: baby.id, userId: user1.id },
    }),
    prisma.babyUser.upsert({
      where: { babyId_userId: { babyId: baby.id, userId: user2.id } },
      update: {},
      create: { babyId: baby.id, userId: user2.id },
    }),
  ])

  await seedChecklists(baby.id)
  await seedWeightLogs(baby.id, user1.id)
  await seedTummyTimeLogs(baby.id, user1.id)
  await seedMoodLogs(baby.id, user1.id)

  if (process.env['SEED_INSIGHTS_DATA'] === 'true') {
    await seedInsightsData(baby.id, user1.id)
  }

  console.log(`Seeded: ${user1.name} (${user1.email}), ${user2.name} (${user2.email}), baby ${baby.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
