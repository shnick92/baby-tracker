export const diaperKeys = {
  all: ['diaperLogs'] as const,
  list: (babyId: string) => ['diaperLogs', babyId] as const,
}
