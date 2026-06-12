import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CalendarClock, KeyRound, Moon as MoonIcon, Ruler, Trash2 } from 'lucide-react'

import { api } from '@lib/axios'
import { useAuthStore } from '@stores/authStore'
import { useSettingsStore, type ThemePreference } from '@stores/settingsStore'
import { applyTheme, watchSystemTheme } from '@lib/utils'
import { disablePush } from '@hooks/usePushSubscription'
import { AddPasskeyButton } from '@features/auth'
import { TextLineSkeleton } from '@components/skeletons'

import { useNotificationSettings, useUpdateNotificationSettings } from './useNotificationSettings'
import { usePasskeys, useRemovePasskey } from './usePasskeys'
import { Toggle } from './components/Toggle'

const cardCls = 'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700'
const sectionLabelCls = 'text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1 mb-2'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
]

const REMINDER_INTERVALS = [
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '4h', minutes: 240 },
]

function ThemePreview({ value }: { value: ThemePreference }) {
  const dark = (
    <div className="w-full h-full bg-gray-900 p-1.5 space-y-1">
      <div className="h-1.5 w-3/4 rounded bg-gray-700" />
      <div className="h-1.5 w-1/2 rounded bg-gray-700" />
    </div>
  )
  const light = (
    <div className="w-full h-full bg-gray-100 p-1.5 space-y-1">
      <div className="h-1.5 w-3/4 rounded bg-gray-300" />
      <div className="h-1.5 w-1/2 rounded bg-gray-300" />
    </div>
  )
  if (value === 'system') {
    return (
      <div className="w-full h-10 rounded-lg overflow-hidden flex border border-gray-200 dark:border-gray-600">
        <div className="w-1/2 h-full">{dark}</div>
        <div className="w-1/2 h-full">{light}</div>
      </div>
    )
  }
  return (
    <div className="w-full h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
      {value === 'dark' ? dark : light}
    </div>
  )
}

function SettingsRow({ icon, label, sub, action }: {
  icon: React.ReactNode
  label: string
  sub?: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-gray-300">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

function NotificationSettingsSkeleton() {
  return (
    <div className={`${cardCls} p-4 space-y-3`}>
      <TextLineSkeleton width="w-1/2" />
      <TextLineSkeleton width="w-3/4" />
      <TextLineSkeleton width="w-1/3" />
    </div>
  )
}

export function SettingsPage() {
  const { user, babyId, logout } = useAuthStore()
  const { theme, units, pushEnabled, setTheme, setUnits, setPushEnabled } = useSettingsStore()

  const { data: notif, isLoading: notifLoading } = useNotificationSettings(babyId)
  const updateNotif = useUpdateNotificationSettings(babyId)

  const [showPasskeys, setShowPasskeys] = useState(false)
  const { data: passkeys, isLoading: passkeysLoading } = usePasskeys(showPasskeys)
  const removePasskey = useRemovePasskey()

  const [customInterval, setCustomInterval] = useState(false)

  // Apply + watch theme whenever the preference changes
  useEffect(() => {
    applyTheme(theme)
    return watchSystemTheme(theme)
  }, [theme])

  const handlePushToggle = (enabled: boolean) => {
    setPushEnabled(enabled)
    if (!enabled) void disablePush()
  }

  const handleLogout = () => {
    api.post('/api/auth/logout').catch(() => null).finally(() => logout())
  }

  const isCustomInterval =
    customInterval || (notif != null && !REMINDER_INTERVALS.some((i) => i.minutes === notif.feedingReminderMinutes))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Theme, units, notifications & data</p>
      </header>

      <main className="max-w-lg md:max-w-4xl mx-auto px-4 py-6">
        <div className="md:grid md:grid-cols-2 md:gap-8 md:items-start space-y-6 md:space-y-0">
          {/* Left column */}
          <div className="space-y-6">
            <section>
              <p className={sectionLabelCls}>Theme</p>
              <div className={`${cardCls} p-4`}>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Appearance</p>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={`rounded-xl p-2 border-2 transition-colors min-h-[44px] ${
                        theme === opt.value
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20'
                          : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                      }`}
                    >
                      <ThemePreview value={opt.value} />
                      <p className={`text-xs font-medium mt-1.5 ${
                        theme === opt.value
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {opt.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <p className={sectionLabelCls}>Display</p>
              <div className={cardCls}>
                <SettingsRow
                  icon={<Ruler size={18} />}
                  label="Volume units"
                  sub="How feeding volumes are displayed"
                  action={
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                      {(['oz', 'ml'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnits(u)}
                          className={`px-3 py-2 text-xs font-semibold min-w-[44px] min-h-[40px] transition-colors ${
                            units === u
                              ? 'bg-emerald-500 text-white'
                              : 'bg-transparent text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  }
                />
              </div>
            </section>

            <section>
              <p className={sectionLabelCls}>Account</p>
              <div className={`${cardCls} divide-y divide-gray-100 dark:divide-gray-700`}>
                <SettingsRow
                  icon={<span className="text-sm font-bold">{user?.name?.[0]?.toUpperCase() ?? '?'}</span>}
                  label={user?.name ?? ''}
                  sub={user?.email}
                  action={
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-xs font-semibold text-red-500 dark:text-red-400 px-3 py-2 min-h-[44px]"
                    >
                      Sign out
                    </button>
                  }
                />
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPasskeys((v) => !v)}
                    className="w-full text-left"
                  >
                    <SettingsRow
                      icon={<KeyRound size={18} />}
                      label="Passkeys"
                      sub="Biometric sign-in devices"
                      action={
                        <span className={`text-gray-300 dark:text-gray-600 transition-transform ${showPasskeys ? 'rotate-90' : ''}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      }
                    />
                  </button>
                  {showPasskeys && (
                    <div className="px-4 pb-4 space-y-2">
                      {passkeysLoading && <TextLineSkeleton width="w-2/3" />}
                      {passkeys?.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">No passkeys registered yet.</p>
                      )}
                      {passkeys?.map((pk) => (
                        <div key={pk.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {pk.deviceName ?? 'Unnamed device'}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                              Added {new Date(pk.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove passkey ${pk.deviceName ?? ''}`}
                            onClick={() => removePasskey.mutate(pk.id)}
                            disabled={removePasskey.isPending}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-40"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <AddPasskeyButton />
                    </div>
                  )}
                </div>
                <Link to="/alerts" className="block">
                  <SettingsRow
                    icon={<Bell size={18} />}
                    label="Alert History"
                    sub="Recent SOS alerts"
                    action={
                      <svg className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    }
                  />
                </Link>
              </div>
            </section>

          </div>

          {/* Right column — notifications */}
          <section>
            <p className={sectionLabelCls}>Notifications</p>
            <div className="space-y-3">
              <div className={cardCls}>
                <SettingsRow
                  icon={<Bell size={18} />}
                  label="Push Notifications"
                  sub={pushEnabled ? 'Enabled on this device' : 'Disabled on this device'}
                  action={<Toggle checked={pushEnabled} onChange={handlePushToggle} label="Push notifications" />}
                />
              </div>

              {notifLoading || !notif ? (
                <NotificationSettingsSkeleton />
              ) : (
                <>
                  <div className={`${cardCls} p-4`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🍼</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Feeding Reminder</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Remind me if no feed is logged</p>
                      </div>
                      <Toggle
                        checked={notif.feedingReminderEnabled}
                        onChange={(v) => updateNotif.mutate({ feedingReminderEnabled: v })}
                        label="Feeding reminder"
                      />
                    </div>
                    {notif.feedingReminderEnabled && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {REMINDER_INTERVALS.map((i) => (
                          <button
                            key={i.minutes}
                            type="button"
                            onClick={() => {
                              setCustomInterval(false)
                              updateNotif.mutate({ feedingReminderMinutes: i.minutes })
                            }}
                            className={`px-3.5 py-2 rounded-full text-xs font-semibold min-h-[36px] transition-colors ${
                              !isCustomInterval && notif.feedingReminderMinutes === i.minutes
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {i.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setCustomInterval(true)}
                          className={`px-3.5 py-2 rounded-full text-xs font-semibold min-h-[36px] transition-colors ${
                            isCustomInterval
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          Custom
                        </button>
                        {isCustomInterval && (
                          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <input
                              type="number"
                              min={30}
                              max={720}
                              defaultValue={notif.feedingReminderMinutes}
                              onBlur={(e) => {
                                const v = Number(e.target.value)
                                if (v >= 30 && v <= 720) updateNotif.mutate({ feedingReminderMinutes: v })
                              }}
                              className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-gray-100"
                            />
                            min
                          </label>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={cardCls}>
                    <SettingsRow
                      icon={<MoonIcon size={18} />}
                      label="Wake Window Alert"
                      sub="Alert when baby has been awake too long"
                      action={
                        <Toggle
                          checked={notif.wakeWindowAlertEnabled}
                          onChange={(v) => updateNotif.mutate({ wakeWindowAlertEnabled: v })}
                          label="Wake window alert"
                        />
                      }
                    />
                  </div>

                  <div className={cardCls}>
                    <SettingsRow
                      icon={<CalendarClock size={18} />}
                      label="Weekly Digest"
                      sub="Sundays at 8 PM"
                      action={
                        <Toggle
                          checked={notif.weeklyDigestEnabled}
                          onChange={(v) => updateNotif.mutate({ weeklyDigestEnabled: v })}
                          label="Weekly digest"
                        />
                      }
                    />
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
