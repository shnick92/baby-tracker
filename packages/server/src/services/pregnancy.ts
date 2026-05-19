import { prisma } from '../lib/prisma'

const BABY_SIZES: Record<number, string> = {
  4: '🌱 poppy seed',
  5: '🌿 sesame seed',
  6: '🟤 lentil',
  7: '🫐 blueberry',
  8: '🍓 raspberry',
  9: '🍇 grape',
  10: '🍊 kumquat',
  11: '🍐 fig',
  12: '🍋 lime',
  13: '🍑 peach',
  14: '🍋 lemon',
  15: '🍎 apple',
  16: '🥑 avocado',
  17: '🍐 pear',
  18: '🫑 bell pepper',
  19: '🥭 mango',
  20: '🍌 banana',
  21: '🥕 carrot',
  22: '🥥 coconut',
  23: '🍊 grapefruit',
  24: '🌽 ear of corn',
  25: '🥦 cauliflower',
  26: '🌿 scallion',
  27: '🥬 head of lettuce',
  28: '🍆 eggplant',
  29: '🎃 butternut squash',
  30: '🥬 cabbage',
  31: '🍌 bunch of bananas',
  32: '🎃 squash',
  33: '🍍 pineapple',
  34: '🍈 cantaloupe',
  35: '🍈 honeydew melon',
  36: '🥭 papaya',
  37: '🍈 winter melon',
  38: '🎃 pumpkin',
  39: '🍉 watermelon',
  40: '🍉 watermelon',
}

export type PregnancyStatusResult = {
  weeksPregnant: number
  weeksRemaining: number
  progressPct: number
  babySize: string
  dueDate: string
  born: boolean
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
const TOTAL_WEEKS = 40

export function calculatePregnancyStatus(
  dueDate: Date,
  birthDate: Date | null,
  now: Date = new Date(),
): PregnancyStatusResult {
  const born = birthDate !== null
  const lmp = new Date(dueDate.getTime() - TOTAL_WEEKS * MS_PER_WEEK)
  const raw = Math.floor((now.getTime() - lmp.getTime()) / MS_PER_WEEK)
  const weeksPregnant = Math.min(TOTAL_WEEKS, Math.max(0, raw))
  const weeksRemaining = Math.max(0, TOTAL_WEEKS - weeksPregnant)
  const progressPct = Math.round((weeksPregnant / TOTAL_WEEKS) * 100)
  const sizeKey = Math.min(TOTAL_WEEKS, Math.max(4, weeksPregnant))
  const babySize = BABY_SIZES[sizeKey] ?? 'growing'

  return { weeksPregnant, weeksRemaining, progressPct, babySize, dueDate: dueDate.toISOString(), born }
}

export async function getPregnancyStatus(babyId: string, userId: string): Promise<PregnancyStatusResult | null> {
  const baby = await prisma.baby.findFirst({
    where: { id: babyId, parents: { some: { userId } } },
  })

  if (!baby || !baby.dueDate) return null

  return calculatePregnancyStatus(baby.dueDate, baby.birthDate)
}
