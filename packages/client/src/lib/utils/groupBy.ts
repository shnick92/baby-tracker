export function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const item of items) {
    const k = key(item)
    if (!groups[k]) groups[k] = []
    groups[k].push(item)
  }
  return groups
}
