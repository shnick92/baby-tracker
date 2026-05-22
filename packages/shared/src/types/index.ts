export type ApiResponse<T> = {
  data: T | null
  error: string | null
  meta?: Record<string, unknown>
}

export type Role = 'PARENT' | 'ADMIN'

export type FeedingType = 'BREAST_LEFT' | 'BREAST_RIGHT' | 'BOTTLE' | 'PUMP'

export type SleepType = 'NAP' | 'NIGHT'

export type DiaperType = 'WET' | 'DIRTY' | 'BOTH'

export type DiaperColor = 'YELLOW' | 'GREEN' | 'BROWN' | 'BLACK' | 'RED' | 'OTHER'

export type DiaperConsistency = 'SEEDY' | 'PASTY' | 'RUNNY' | 'FIRM' | 'WATERY' | 'CUSTOM'

export type MoodType = 'HAPPY' | 'FUSSY' | 'CRYING' | 'SLEEPING' | 'ALERT' | 'BATH' | 'WALK'

export type ChecklistType =
  | 'HOSPITAL_BAG_MOM'
  | 'HOSPITAL_BAG_BABY'
  | 'HOME_PREP'
  | 'BEFORE_HOME'
  | 'PURCHASES'

export type PurchaseStatus = 'NEEDED' | 'BOUGHT' | 'GIFTED' | 'SKIP'

export type MilestoneCategory =
  | 'MOTOR_GROSS'
  | 'MOTOR_FINE'
  | 'SOCIAL'
  | 'LANGUAGE'
  | 'COGNITIVE'
  | 'FEEDING'
  | 'CUSTOM'

export type AlertStatus = 'SENT' | 'SEEN' | 'ACKNOWLEDGED'

export type EmergencyAlert = {
  id: string
  babyId: string
  sentById: string
  sentBy: { id: string; name: string }
  sentToId: string
  sentTo: { id: string; name: string }
  message: string | null
  status: AlertStatus
  sentAt: string
  seenAt: string | null
}

export type SocketStatus = 'connecting' | 'synced' | 'unsynced'

export type SleepSettings = {
  napIdealMinutes: number
  nightIdealMinutes: number
  wakeWindowMaxMinutes: number
}
