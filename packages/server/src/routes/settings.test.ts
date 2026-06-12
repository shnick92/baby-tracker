import { describe, it, expect } from 'vitest'
import { updateNotificationSettingsSchema, NOTIFICATION_SETTINGS_DEFAULTS } from '@tracker/shared'

describe('updateNotificationSettingsSchema', () => {
  it('accepts a partial patch', () => {
    const result = updateNotificationSettingsSchema.safeParse({ feedingReminderEnabled: true })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ feedingReminderEnabled: true })
    }
  })

  it('accepts a full valid payload', () => {
    const result = updateNotificationSettingsSchema.safeParse({
      feedingReminderEnabled: true,
      feedingReminderMinutes: 240,
      wakeWindowAlertEnabled: false,
      weeklyDigestEnabled: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects an interval below 30 minutes', () => {
    expect(updateNotificationSettingsSchema.safeParse({ feedingReminderMinutes: 15 }).success).toBe(false)
  })

  it('rejects an interval above 12 hours', () => {
    expect(updateNotificationSettingsSchema.safeParse({ feedingReminderMinutes: 800 }).success).toBe(false)
  })

  it('rejects fractional minutes', () => {
    expect(updateNotificationSettingsSchema.safeParse({ feedingReminderMinutes: 90.5 }).success).toBe(false)
  })

  it('rejects non-boolean toggles', () => {
    expect(updateNotificationSettingsSchema.safeParse({ weeklyDigestEnabled: 'yes' }).success).toBe(false)
  })
})

describe('NOTIFICATION_SETTINGS_DEFAULTS', () => {
  it('matches the Prisma schema defaults', () => {
    expect(NOTIFICATION_SETTINGS_DEFAULTS).toEqual({
      feedingReminderEnabled: false,
      feedingReminderMinutes: 180,
      wakeWindowAlertEnabled: true,
      weeklyDigestEnabled: true,
    })
  })
})
