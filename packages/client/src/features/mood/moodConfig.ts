export type BuiltInMood = 'HAPPY' | 'FUSSY' | 'CRYING' | 'SLEEPING' | 'ALERT' | 'BATH' | 'WALK'
export type QualifierMood = 'HAPPY' | 'FUSSY' | 'CRYING' | 'ALERT'

export const MOOD_STATES: { mood: QualifierMood; label: string; emoji: string }[] = [
  { mood: 'HAPPY',  label: 'Happy',  emoji: '😄' },
  { mood: 'ALERT',  label: 'Alert',  emoji: '👀' },
  { mood: 'FUSSY',  label: 'Fussy',  emoji: '😤' },
  { mood: 'CRYING', label: 'Crying', emoji: '😢' },
]

export const BUILT_IN_ACTIVITIES: { mood: BuiltInMood; label: string; emoji: string }[] = [
  { mood: 'BATH', label: 'Bath', emoji: '🛁' },
  { mood: 'WALK', label: 'Walk', emoji: '🚶' },
]

// Activities that open the qualifier bottom sheet (mood pairing makes sense)
export const ACTIVITIES_WITH_QUALIFIER = BUILT_IN_ACTIVITIES

export const MOOD_COLORS: Record<string, string> = {
  HAPPY:  'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-300',
  ALERT:  'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300',
  FUSSY:  'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50 text-orange-700 dark:text-orange-300',
  CRYING: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300',
  BATH:   'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50 text-cyan-700 dark:text-cyan-300',
  WALK:   'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300',
  CUSTOM: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300',
}

export const SOURCE_COLORS: Record<string, string> = {
  feeding:    'bg-blue-50 dark:bg-blue-900/20',
  diaper:     'bg-teal-50 dark:bg-teal-900/20',
  sleep:      'bg-purple-50 dark:bg-purple-900/20',
  tummytime:  'bg-orange-50 dark:bg-orange-900/20',
}

const ALL_BUILT_INS = [...MOOD_STATES, ...BUILT_IN_ACTIVITIES] as { mood: string; emoji: string; label: string }[]

export function getBuiltInConfig(mood: string) {
  return ALL_BUILT_INS.find((m) => m.mood === mood)
}
