export const aiKeys = {
  insights: (babyId: string) => ['ai', 'insights', babyId] as const,
  weeklySummaries: (babyId: string) => ['ai', 'weekly-summaries', babyId] as const,
  chatHistory: (babyId: string) => ['ai', 'chat', 'history', babyId] as const,
}
