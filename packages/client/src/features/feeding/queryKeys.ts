export const feedingKeys = {
  all: ['feedings'] as const,
  list: (babyId: string) => ['feedings', babyId] as const,
}
