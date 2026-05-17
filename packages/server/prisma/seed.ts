import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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

  // Create baby with a deterministic seed ID so this script is idempotent
  const SEED_BABY_ID = 'seed-baby-001'

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

  console.log(`Seeded: ${user1.name} (${user1.email}), ${user2.name} (${user2.email}), baby ${baby.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
