export const medicationKeys = {
  all: ['medicationLogs'] as const,
  list: (babyId: string) => ['medicationLogs', babyId] as const,
}
