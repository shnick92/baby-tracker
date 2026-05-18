import { Router } from 'express'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { signAccess, issueRefreshToken, COOKIE_OPTS } from '../services/tokens'

export const passkeyRouter = Router()

const RP_ID = process.env.RP_ID ?? 'localhost'
const RP_NAME = process.env.RP_NAME ?? 'Baby Tracker'
const RP_ORIGIN = process.env.RP_ORIGIN ?? 'http://localhost:5173'
const CHALLENGE_TTL_MS = 5 * 60 * 1000

async function consumeChallenge(challenge: string): Promise<boolean> {
  const stored = await prisma.challenge.findUnique({ where: { challenge } })
  if (!stored || stored.expiresAt < new Date()) return false
  await prisma.challenge.delete({ where: { id: stored.id } })
  return true
}

// POST /api/auth/passkey/register/options — authenticated user adds a passkey
passkeyRouter.post('/register/options', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { credentials: true },
  })
  if (!user) {
    res.status(404).json({ data: null, error: 'User not found' })
    return
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email,
    userDisplayName: user.name,
    userID: new TextEncoder().encode(user.id),
    excludeCredentials: user.credentials.map((c) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  await prisma.challenge.create({
    data: { challenge: options.challenge, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) },
  })

  res.json({ data: options, error: null })
})

// POST /api/auth/passkey/register/verify — verify and store the new credential
passkeyRouter.post('/register/verify', authMiddleware, async (req, res) => {
  const { response, deviceName } = req.body as {
    response: RegistrationResponseJSON
    deviceName?: string
  }

  if (!response) {
    res.status(400).json({ data: null, error: 'Missing response' })
    return
  }

  let result
  try {
    result = await verifyRegistrationResponse({
      response,
      expectedChallenge: consumeChallenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
    })
  } catch {
    res.status(400).json({ data: null, error: 'Registration verification failed' })
    return
  }

  if (!result.verified || !result.registrationInfo) {
    res.status(400).json({ data: null, error: 'Registration not verified' })
    return
  }

  const { credential } = result.registrationInfo

  await prisma.credential.create({
    data: {
      userId: req.user!.userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceName: deviceName ?? null,
    },
  })

  res.json({ data: { verified: true }, error: null })
})

// POST /api/auth/passkey/auth/options — public; uses discoverable credentials
passkeyRouter.post('/auth/options', async (_req, res) => {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
  })

  await prisma.challenge.create({
    data: { challenge: options.challenge, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) },
  })

  res.json({ data: options, error: null })
})

// POST /api/auth/passkey/auth/verify — public; issues tokens on success
passkeyRouter.post('/auth/verify', async (req, res) => {
  const { response } = req.body as { response: AuthenticationResponseJSON }

  if (!response?.id) {
    res.status(400).json({ data: null, error: 'Missing response' })
    return
  }

  const storedCredential = await prisma.credential.findUnique({
    where: { credentialId: response.id },
    include: { user: true },
  })

  if (!storedCredential) {
    res.status(401).json({ data: null, error: 'Passkey not recognised' })
    return
  }

  let result
  try {
    result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: consumeChallenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: storedCredential.credentialId,
        publicKey: storedCredential.publicKey,
        counter: Number(storedCredential.counter),
        transports: storedCredential.transports as AuthenticatorTransportFuture[],
      },
    })
  } catch {
    res.status(400).json({ data: null, error: 'Authentication verification failed' })
    return
  }

  if (!result.verified) {
    res.status(401).json({ data: null, error: 'Authentication not verified' })
    return
  }

  await prisma.credential.update({
    where: { id: storedCredential.id },
    data: { counter: result.authenticationInfo.newCounter, lastUsedAt: new Date() },
  })

  const { user } = storedCredential
  const rawToken = await issueRefreshToken(user.id)
  const babyUser = await prisma.babyUser.findFirst({ where: { userId: user.id } })

  res.cookie('rt', rawToken, COOKIE_OPTS).json({
    data: {
      accessToken: signAccess(user.id, user.email, user.role),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, hasPasskey: true },
      babyId: babyUser?.babyId ?? null,
    },
    error: null,
  })
})
