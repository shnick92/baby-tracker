import { sk } from './base'

export function AvatarSkeleton({ size = 32 }: { size?: number }) {
  return (
    <div
      className={`rounded-full ${sk} flex-shrink-0`}
      style={{ width: size, height: size }}
    />
  )
}
