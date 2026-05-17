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

async function main() {
  const u1Name = process.env.SEED_USER_1_NAME ?? 'Nick'
  const u1Email = process.env.SEED_USER_1_EMAIL ?? 'nick@example.com'
  const u1Password = process.env.SEED_USER_1_PASSWORD ?? 'changeme'

  const u2Name = process.env.SEED_USER_2_NAME ?? 'Jess'
  const u2Email = process.env.SEED_USER_2_EMAIL ?? 'jess@example.com'
  const u2Password = process.env.SEED_USER_2_PASSWORD ?? 'changeme'

  const [hash1, hash2] = await Promise.all([bcrypt.hash(u1Password, 12), bcrypt.hash(u2Password, 12)])

  const [user1, user2] = await Promise.all([
    prisma.user.upsert({
      where: { email: u1Email },
      update: {},
      create: { name: u1Name, email: u1Email, passwordHash: hash1 },
    }),
    prisma.user.upsert({
      where: { email: u2Email },
      update: {},
      create: { name: u2Name, email: u2Email, passwordHash: hash2 },
    }),
  ])

  const baby = await prisma.baby.upsert({
    where: { id: SEED_BABY_ID },
    update: {},
    create: { id: SEED_BABY_ID, dueDate: new Date('2026-10-01') },
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

  console.log(`Seeded: ${user1.name} (${user1.email}), ${user2.name} (${user2.email}), baby ${baby.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
