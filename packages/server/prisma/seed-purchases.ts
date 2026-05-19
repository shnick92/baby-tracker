/**
 * Purchases seed script — populates realistic baby purchase data.
 *
 * Usage:
 *   SEED_BABY_ID=<cuid> npx tsx packages/server/prisma/seed-purchases.ts
 *
 * If SEED_BABY_ID is not set, uses the first Baby record in the database.
 * Safe to run multiple times — clears existing purchases for the baby first.
 */

import { PrismaClient, PurchaseStatus } from '@prisma/client'

const prisma = new PrismaClient()

type PurchaseSeed = {
  name: string
  category: string
  status: PurchaseStatus
  price?: number
  notes?: string
  url?: string
}

// WORK IN PROGRESS — not ready for seeding quite yet.
const PURCHASES: PurchaseSeed[] = [
  // ── Nursery ──────────────────────────────────────────────────────────────
  {
    name: 'Crib',
    category: 'Nursery',
    status: 'NEEDED',
    price: 157.50,
    notes: 'Dream On Me Owen 5-in-1 Convertible Full-Size Baby Crib in Matte Black',
  },
  {
    name: 'Crib Mattress',
    category: 'Nursery',
    status: 'NEEDED',
    price: 69.99,
    notes: 'Dream On Me, 52" x 28" x 5"',
  },
  {
    name: 'Changing Table',
    category: 'Nursery',
    status: 'NEEDED',
    price: 399.00,
    notes: 'Graco Read-with-Me 3 Drawer Chest'
  },
  {
    name: 'Dresser / Wardrobe',
    category: 'Nursery',
    status: 'SKIP',
    notes: 'Graco will double as dresser and changing table',
  },
  {
    name: 'Baby Monitor (video, no wifi)',
    category: 'Nursery',
    status: 'NEEDED',
    price: 129.99,
    notes: 'Babysense PRO Full HD 5.5" Split Screen Baby Monitor',
  },
  {
    name: 'Humidifier',
    category: 'Nursery',
    status: 'NEEDED',
    price: 44.99,
  },
  {
    name: 'Nightlight',
    category: 'Nursery',
    status: 'NEEDED',
    price: 79.99,
    notes: 'Hatch Baby',
  },
  {
    name: 'White Noise Machine',
    category: 'Nursery',
    status: 'SKIP',
    notes: "Hatch Baby does white noise too",
  },

  // ── Feeding ───────────────────────────────────────────────────────────────
  {
    name: 'Breast Pump',
    category: 'Feeding',
    status: 'GIFTED',
    notes: 'Covered by insurance — Cimilre S7',
  },
    {
    name: 'Milk Storage Bags (400pk)',
    category: 'Feeding',
    status: 'GIFTED',
    notes: 'Covered by insurance',
  },
  {
    name: 'Nursing Pillow (Boppy)',
    category: 'Feeding',
    status: 'NEEDED',
    price: 54.99,
  },
  {
    name: 'Nipple Cream (Lanolin)',
    category: 'Feeding',
    status: 'NEEDED',
    price: 11.99,
  },
  {
    name: 'Baby Bottles 4oz Set',
    category: 'Feeding',
    status: 'BOUGHT',
    price: 34.99,
    notes: "Dr. Brown's, 4-pack",
  },
  {
    name: 'Baby Bottles 8oz Set',
    category: 'Feeding',
    status: 'NEEDED',
    price: 34.99,
  },
  {
    name: 'Bottle Brush',
    category: 'Feeding',
    status: 'BOUGHT',
    price: 9.99,
  },
  {
    name: 'Bottle Drying Rack',
    category: 'Feeding',
    status: 'BOUGHT',
    price: 17.99,
  },
  {
    name: 'Formula (backup)',
    category: 'Feeding',
    status: 'NEEDED',
    notes: "Backup only if breastfeeding doesn't work out",
  },
  {
    name: 'Nursing Bras x3',
    category: 'Feeding',
    status: 'BOUGHT',
    price: 89.0,
  },

  // ── Clothing ──────────────────────────────────────────────────────────────
  {
    name: 'Newborn Onesies (10pk)',
    category: 'Clothing',
    status: 'BOUGHT',
    price: 34.99,
  },
  {
    name: '0–3 Month Sleep Sacks (2pk)',
    category: 'Clothing',
    status: 'BOUGHT',
    price: 44.99,
  },
  {
    name: '3–6 Month Onesies',
    category: 'Clothing',
    status: 'NEEDED',
    price: 29.99,
  },
  {
    name: 'Newborn Mittens',
    category: 'Clothing',
    status: 'BOUGHT',
    price: 11.99,
  },
  {
    name: 'Swaddle Blankets (4pk)',
    category: 'Clothing',
    status: 'GIFTED',
    notes: 'Aden + Anais muslin — gift from coworker',
  },
  {
    name: 'Newborn Hats (3pk)',
    category: 'Clothing',
    status: 'BOUGHT',
    price: 14.99,
  },
  {
    name: 'Infant Socks (6pk)',
    category: 'Clothing',
    status: 'BOUGHT',
    price: 13.99,
  },
  {
    name: '0–3 Month Outfits (misc)',
    category: 'Clothing',
    status: 'GIFTED',
    notes: 'Various gifts from baby shower',
  },
  {
    name: 'Snowsuit / Bunting',
    category: 'Clothing',
    status: 'SKIP',
    notes: 'Due in October — will assess weather when closer',
  },
  {
    name: 'Sun Hat',
    category: 'Clothing',
    status: 'NEEDED',
    price: 11.99,
    notes: 'For October walks once home',
  },

  // ── Travel ────────────────────────────────────────────────────────────────
  {
    name: 'Infant Car Seat',
    category: 'Travel',
    status: 'BOUGHT',
    price: 279.99,
    notes: 'Chicco KeyFit 35 — already installed and inspected',
  },
  {
    name: 'Travel System Stroller',
    category: 'Travel',
    status: 'BOUGHT',
    price: 449.99,
    notes: 'Compatible with Chicco car seat',
  },
  {
    name: 'Baby Carrier / Wrap',
    category: 'Travel',
    status: 'GIFTED',
    notes: "Solly Baby wrap — gift from Jess's mom",
  },
  {
    name: 'Diaper Bag Backpack',
    category: 'Travel',
    status: 'BOUGHT',
    price: 84.99,
  },
  {
    name: 'Portable Changing Pad',
    category: 'Travel',
    status: 'BOUGHT',
    price: 21.99,
  },
  {
    name: 'Car Seat Mirror',
    category: 'Travel',
    status: 'NEEDED',
    price: 19.99,
  },

  // ── Health & Safety ───────────────────────────────────────────────────────
  {
    name: 'Nasal Aspirator (Frida)',
    category: 'Health & Safety',
    status: 'BOUGHT',
    price: 14.99,
  },
  {
    name: 'Baby Nail Clippers',
    category: 'Health & Safety',
    status: 'BOUGHT',
    price: 11.99,
  },
  {
    name: 'Rectal Thermometer',
    category: 'Health & Safety',
    status: 'BOUGHT',
    price: 17.99,
  },
  {
    name: 'Baby Grooming Kit',
    category: 'Health & Safety',
    status: 'GIFTED',
  },
  {
    name: 'Infant First Aid Kit',
    category: 'Health & Safety',
    status: 'NEEDED',
    price: 34.99,
  },
  {
    name: 'Baby Bathtub',
    category: 'Health & Safety',
    status: 'BOUGHT',
    price: 37.99,
  },
  {
    name: 'Gentle Baby Wash + Shampoo',
    category: 'Health & Safety',
    status: 'BOUGHT',
    price: 13.99,
  },
  {
    name: 'Baby Lotion',
    category: 'Health & Safety',
    status: 'BOUGHT',
    price: 11.99,
  },
  {
    name: 'Baby Laundry Detergent',
    category: 'Health & Safety',
    status: 'BOUGHT',
    price: 13.99,
  },
  {
    name: 'Diaper Pail',
    category: 'Health & Safety',
    status: 'BOUGHT',
    price: 54.99,
  },
  {
    name: 'Diaper Pail Refills (3pk)',
    category: 'Health & Safety',
    status: 'NEEDED',
    price: 21.99,
  },
  {
    name: 'Diapers — Newborn (1 case)',
    category: 'Health & Safety',
    status: 'BOUGHT',
    price: 42.0,
  },
  {
    name: 'Diapers — Size 1 (1 case)',
    category: 'Health & Safety',
    status: 'NEEDED',
    price: 47.99,
  },
  {
    name: 'Baby Wipes (9pk)',
    category: 'Health & Safety',
    status: 'BOUGHT',
    price: 37.99,
  },

  // ── Baby Gear ─────────────────────────────────────────────────────────────
  {
    name: 'Baby Bouncer / Rocker',
    category: 'Baby Gear',
    status: 'BOUGHT',
  },
  {
    name: 'Play Mat with Activity Arch',
    category: 'Baby Gear',
    status: 'BOUGHT',
    price: 64.99,
  },
  {
    name: 'Pacifiers (3pk)',
    category: 'Baby Gear',
    status: 'BOUGHT',
    price: 11.99,
  },
  {
    name: 'Pacifier Clips (2pk)',
    category: 'Baby Gear',
    status: 'NEEDED',
    price: 9.99,
  },
  {
    name: 'Baby Swing',
    category: 'Baby Gear',
    status: 'SKIP',
    notes: 'Not enough floor space in the nursery',
  },
  {
    name: 'Bath Support / Sling',
    category: 'Baby Gear',
    status: 'BOUGHT',
    price: 27.99,
  },
]

async function main() {
  const babyId =
    process.env.SEED_BABY_ID ??
    (await prisma.baby.findFirst({ select: { id: true } }))?.id

  if (!babyId) {
    throw new Error('No baby record found. Run the main seed script first.')
  }

  // Delete existing purchases for this baby (idempotent)
  const deleted = await prisma.purchase.deleteMany({ where: { babyId } })
  if (deleted.count > 0) {
    console.log(`Cleared ${deleted.count} existing purchase(s) for baby ${babyId}`)
  }

  // Insert all purchases
  await prisma.purchase.createMany({
    data: PURCHASES.map((p) => ({ ...p, babyId })),
  })

  // ── Summary ───────────────────────────────────────────────────────────────
  const all = await prisma.purchase.findMany({ where: { babyId } })

  const byStatus = all.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  const byCategory = all.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1
    return acc
  }, {})

  console.log(`\nInserted ${all.length} purchases for baby ${babyId}\n`)

  console.log('By status:')
  for (const [status, count] of Object.entries(byStatus).sort()) {
    console.log(`  ${status.padEnd(8)} ${count}`)
  }

  console.log('\nBy category:')
  for (const [category, count] of Object.entries(byCategory).sort()) {
    console.log(`  ${category.padEnd(20)} ${count}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
