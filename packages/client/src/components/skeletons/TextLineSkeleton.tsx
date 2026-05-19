import { sk } from './base'

export function TextLineSkeleton({ width = 'w-full', height = 'h-3.5' }: { width?: string; height?: string }) {
  return <div className={`${height} ${width} ${sk} rounded`} />
}
