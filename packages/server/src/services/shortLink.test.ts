import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/prisma', () => ({
  prisma: {
    shortLink: {
      create: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { generateCode, createShortLink, isAlreadyShortened } from './shortLink'

const mockCreate = vi.mocked(prisma.shortLink.create)

const stubLink = (code: string) => ({
  id: 'sl1',
  code,
  originalUrl: 'https://example.com',
  babyId: 'b1',
  createdById: 'u1',
  createdAt: new Date(),
})

describe('generateCode', () => {
  it('returns a 6-character alphanumeric string', () => {
    const code = generateCode()
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[A-Za-z0-9]{6}$/)
  })

  it('respects a custom length', () => {
    expect(generateCode(10)).toHaveLength(10)
  })

  it('produces different codes across many calls', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateCode()))
    expect(codes.size).toBeGreaterThan(190)
  })
})

describe('isAlreadyShortened', () => {
  it('returns true for known shortener domains', () => {
    expect(isAlreadyShortened('https://amzn.to/3xYzAbc')).toBe(true)
    expect(isAlreadyShortened('https://bit.ly/3xYzAbc')).toBe(true)
    expect(isAlreadyShortened('https://tinyurl.com/abc123')).toBe(true)
    expect(isAlreadyShortened('https://t.co/abc123')).toBe(true)
    expect(isAlreadyShortened('https://rb.gy/abc123')).toBe(true)
  })

  it('returns false for regular product URLs', () => {
    expect(isAlreadyShortened('https://www.amazon.com/dp/B08N5WRWNW')).toBe(false)
    expect(isAlreadyShortened('https://babylist.com/list/some-item')).toBe(false)
    expect(isAlreadyShortened('https://www.target.com/p/something')).toBe(false)
  })

  it('returns false for malformed URLs without throwing', () => {
    expect(isAlreadyShortened('not-a-url')).toBe(false)
    expect(isAlreadyShortened('')).toBe(false)
  })
})

describe('createShortLink', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a ShortLink record and returns the generated code', async () => {
    mockCreate.mockResolvedValue(stubLink('ignored'))

    const code = await createShortLink({ originalUrl: 'https://example.com', babyId: 'b1', createdById: 'u1' })

    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[A-Za-z0-9]{6}$/)
    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ code, originalUrl: 'https://example.com', babyId: 'b1', createdById: 'u1' }),
    })
  })

  it('retries when a code collides and succeeds on the second attempt', async () => {
    mockCreate
      .mockRejectedValueOnce(new Error('Unique constraint failed on the fields: (`code`)'))
      .mockResolvedValue(stubLink('ignored'))

    const code = await createShortLink({ originalUrl: 'https://example.com', babyId: 'b1', createdById: 'u1' })

    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[A-Za-z0-9]{6}$/)
  })

  it('throws after all 5 retry attempts are exhausted', async () => {
    const err = new Error('Unique constraint failed on the fields: (`code`)')
    mockCreate.mockRejectedValue(err)

    await expect(
      createShortLink({ originalUrl: 'https://example.com', babyId: 'b1', createdById: 'u1' }),
    ).rejects.toThrow('Unique constraint failed')

    expect(mockCreate).toHaveBeenCalledTimes(5)
  })
})
