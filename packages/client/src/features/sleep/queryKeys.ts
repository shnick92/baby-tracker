export const sleepKeys = {
  all: ['sleepLogs'] as const,
  list: (babyId: string) => ['sleepLogs', babyId] as const,
}
