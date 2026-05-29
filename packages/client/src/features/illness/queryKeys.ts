export const illnessKeys = {
  all: (babyId: string) => ['illness', babyId] as const,
  active: (babyId: string) => ['illness', babyId, 'active'] as const,
  detail: (episodeId: string) => ['illness', 'episode', episodeId] as const,
}
