export const tummyTimeKeys = {
  all: ['tummyTimeLogs'] as const,
  list: (babyId: string) => ['tummyTimeLogs', babyId] as const,
}
