import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { loginSchema } from '@tracker/shared'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { signAccess, issueRefreshToken, COOKIE_OPTS } from '../services/tokens'

export const authRouter = Router()

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ data: null, error: 'Invalid request body' })
    return
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ data: null, error: 'Invalid credentials' })
    return
  }

  const rawToken = await issueRefreshToken(user.id)
  const babyUser = await prisma.babyUser.findFirst({ where: { userId: user.id } })

  res.cookie('rt', rawToken, COOKIE_OPTS).json({
    data: {
      accessToken: signAccess(user.id, user.email, user.role),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      babyId: babyUser?.babyId ?? null,
    },
    error: null,
  })
})

// POST /api/auth/refresh
authRouter.post('/refresh', async (req, res) => {
  const rawToken = (req.cookies as Record<string, string | undefined>)['rt']
  if (!rawToken) {
    res.status(401).json({ data: null, error: 'No refresh token' })
    return
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: rawToken },
    include: { user: true },
  })

  if (!stored || stored.expiresAt < new Date()) {
    res.clearCookie('rt', { path: '/api/auth' })
    res.status(401).json({ data: null, error: 'Refresh token invalid or expired' })
    return
  }

  // Rotate refresh token
  await prisma.refreshToken.delete({ where: { id: stored.id } })
  const newRaw = await issueRefreshToken(stored.userId)
  const babyUser = await prisma.babyUser.findFirst({ where: { userId: stored.userId } })

  res.cookie('rt', newRaw, COOKIE_OPTS).json({
    data: {
      accessToken: signAccess(stored.user.id, stored.user.email, stored.user.role),
      user: { id: stored.user.id, name: stored.user.name, email: stored.user.email, role: stored.user.role },
      babyId: babyUser?.babyId ?? null,
    },
    error: null,
  })
})

// POST /api/auth/logout
authRouter.post('/logout', authMiddleware, async (req, res) => {
  const rawToken = (req.cookies as Record<string, string | undefined>)['rt']
  if (rawToken) {
    await prisma.refreshToken.deleteMany({ where: { token: rawToken } }).catch(() => null)
  }
  res.clearCookie('rt', { path: '/api/auth' }).json({ data: { success: true }, error: null })
})

// GET /api/auth/me
authRouter.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, name: true, email: true, role: true },
  })
  if (!user) {
    res.status(404).json({ data: null, error: 'User not found' })
    return
  }
  const babyUser = await prisma.babyUser.findFirst({ where: { userId: user.id } })
  res.json({ data: { user, babyId: babyUser?.babyId ?? null }, error: null })
})
