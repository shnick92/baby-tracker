import { TextLineSkeleton } from './TextLineSkeleton'

export function StatSkeleton() {
  return (
    <div className="space-y-1.5">
      <TextLineSkeleton width="w-16" height="h-8" />
      <TextLineSkeleton width="w-24" height="h-3" />
    </div>
  )
}
