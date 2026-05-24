export const historyKeys = {
  daily: (babyId: string, date: string) => ['history', 'daily', babyId, date] as const,
  weekly: (babyId: string) => ['history', 'weekly', babyId] as const,
}
