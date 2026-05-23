export const moodKeys = {
  all: ['moodLogs'] as const,
  list: (babyId: string) => ['moodLogs', babyId] as const,
  activities: (babyId: string) => ['moodActivities', babyId] as const,
}
