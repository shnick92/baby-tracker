import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/prisma', () => ({
  prisma: {
    notificationSettings: { findUnique: vi.fn() },
    babyName: { count: vi.fn() },
    user: { findUnique: vi.fn() },
    babyUser: { findMany: vi.fn() },
    pushSubscription: { delete: vi.fn() },
  },
}))

vi.mock('../lib/push', () => ({
  sendPush: vi.fn(),
}))

import { prisma } from '../lib/prisma'
import { sendPush } from '../lib/push'
import { sendPartnerNamesAlert } from './babyNames'

const mockFindSettings = vi.mocked(prisma.notificationSettings.findUnique)
const mockCount = vi.mocked(prisma.babyName.count)
const mockFindUser = vi.mocked(prisma.user.findUnique)
const mockFindBabyUsers = vi.mocked(prisma.babyUser.findMany)
const mockSendPush = vi.mocked(sendPush)

const stubSubscription = (id: string) => ({
  id,
  userId: 'partner-1',
  endpoint: `https://push.example.com/${id}`,
  p256dh: 'p256dh-key',
  auth: 'auth-key',
  platform: 'other',
  createdAt: new Date(),
})

// prisma.babyUser.findMany's TS type collapses to the bare model (no `include`)
// once wrapped by vi.mocked — there's no call-site generic to carry the
// `include: { user: { include: { pushSubscriptions: true } } }` shape through.
// This cast is the narrowest fix; it targets the mock's real inferred return
// type rather than `any`.
type BabyUserWithPushSubs = Awaited<ReturnType<typeof prisma.babyUser.findMany>>
const stubBabyUser = (subs: ReturnType<typeof stubSubscription>[]) =>
  ({ babyId: 'b1', userId: 'partner-1', user: { pushSubscriptions: subs } }) as unknown as BabyUserWithPushSubs[number]

describe('sendPartnerNamesAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindSettings.mockResolvedValue(null) // no row yet — falls back to NOTIFICATION_SETTINGS_DEFAULTS (enabled: true)
    mockFindUser.mockResolvedValue({
      id: 'u1',
      email: 'nick@example.com',
      name: 'Nick Stone',
      passwordHash: 'hash',
      phone: null,
      role: 'PARENT',
      createdAt: new Date(),
    })
    mockFindBabyUsers.mockResolvedValue([stubBabyUser([stubSubscription('sub1')])])
    mockSendPush.mockResolvedValue(undefined)
  })

  it('reports the fixed batch size, not the adder\'s cumulative total', async () => {
    mockCount.mockResolvedValue(25) // adder has 25 names total — alert should still describe a batch of 5

    await sendPartnerNamesAlert('b1', 'u1')

    expect(mockSendPush).toHaveBeenCalledOnce()
    const payload = mockSendPush.mock.calls[0]![1]
    expect(payload.body).toContain('5 new name candidates')
    expect(payload.body).not.toContain('25')
  })

  it('does not alert when the count is not a multiple of 5', async () => {
    mockCount.mockResolvedValue(26)

    await sendPartnerNamesAlert('b1', 'u1')

    expect(mockSendPush).not.toHaveBeenCalled()
  })

  it('does not alert on zero names', async () => {
    mockCount.mockResolvedValue(0)

    await sendPartnerNamesAlert('b1', 'u1')

    expect(mockSendPush).not.toHaveBeenCalled()
  })

  it('does not alert when partner alerts are disabled', async () => {
    mockFindSettings.mockResolvedValue({
      id: 'ns1',
      babyId: 'b1',
      feedingReminderEnabled: false,
      feedingReminderMinutes: 180,
      wakeWindowAlertEnabled: true,
      weeklyDigestEnabled: true,
      partnerNamesAlertEnabled: false,
      updatedAt: new Date(),
      lastFeedingNotifiedAt: null,
    })
    mockCount.mockResolvedValue(5)

    await sendPartnerNamesAlert('b1', 'u1')

    expect(mockSendPush).not.toHaveBeenCalled()
  })

  it('does not alert when the partner has no push subscriptions', async () => {
    mockFindBabyUsers.mockResolvedValue([stubBabyUser([])])
    mockCount.mockResolvedValue(10)

    await sendPartnerNamesAlert('b1', 'u1')

    expect(mockSendPush).not.toHaveBeenCalled()
  })
})
