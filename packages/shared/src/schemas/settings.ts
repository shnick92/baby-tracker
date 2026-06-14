import { z } from 'zod'

// Notification preferences — one row per baby, shared by both parents.
export const updateNotificationSettingsSchema = z.object({
  feedingReminderEnabled: z.boolean().optional(),
  feedingReminderMinutes: z
    .number({ invalid_type_error: 'Interval must be a number' })
    .int('Interval must be whole minutes')
    .min(30, 'Min 30 minutes')
    .max(720, 'Max 12 hours')
    .optional(),
  wakeWindowAlertEnabled: z.boolean().optional(),
  weeklyDigestEnabled: z.boolean().optional(),
  partnerNamesAlertEnabled: z.boolean().optional(),
})

export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>

export type NotificationSettingsDTO = {
  feedingReminderEnabled: boolean
  feedingReminderMinutes: number
  wakeWindowAlertEnabled: boolean
  weeklyDigestEnabled: boolean
  partnerNamesAlertEnabled: boolean
}

export const NOTIFICATION_SETTINGS_DEFAULTS: NotificationSettingsDTO = {
  feedingReminderEnabled: false,
  feedingReminderMinutes: 180,
  wakeWindowAlertEnabled: true,
  weeklyDigestEnabled: true,
  partnerNamesAlertEnabled: true,
}
