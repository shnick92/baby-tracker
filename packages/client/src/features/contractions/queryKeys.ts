export const contractionKeys = {
  all: ['contractionLogs'] as const,
  list: (babyId: string) => ['contractionLogs', babyId] as const,
}
