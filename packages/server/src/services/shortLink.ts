import { prisma } from '../lib/prisma'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const CODE_LENGTH = 6
const MAX_RETRIES = 5

export function generateCode(length = CODE_LENGTH): string {
  return Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

export async function createShortLink({
  originalUrl,
  babyId,
  createdById,
}: {
  originalUrl: string
  babyId: string
  createdById: string
}): Promise<string> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateCode()
    try {
      await prisma.shortLink.create({ data: { code, originalUrl, babyId, createdById } })
      return code
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}
