import { sk } from './base'

export function SectionLabelSkeleton({ width = 'w-24' }: { width?: string }) {
  return <div className={`h-3 ${width} ${sk} rounded mb-3`} />
}
