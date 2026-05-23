export const weightKeys = {
  all: ['weightLogs'] as const,
  list: (babyId: string) => ['weightLogs', babyId] as const,
}
