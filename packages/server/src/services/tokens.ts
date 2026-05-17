import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { prisma } from '../lib/prisma'

export const ACCESS_TTL_SEC = 15 * 60
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: REFRESH_TTL_MS,
  path: '/api/auth',
}

export function signAccess(userId: string, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: ACCESS_TTL_SEC,
  })
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(40).toString('hex')
  await prisma.refreshToken.create({
    data: { userId, token: rawToken, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  })
  return rawToken
}
