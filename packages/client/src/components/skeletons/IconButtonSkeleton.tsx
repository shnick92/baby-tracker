import { sk } from './base'

const SIZE_CLS = { 7: 'h-7 w-7', 8: 'h-8 w-8', 10: 'h-10 w-10' } as const

export function IconButtonSkeleton({ size = 8 }: { size?: keyof typeof SIZE_CLS }) {
  return <div className={`${SIZE_CLS[size]} ${sk} rounded-full flex-shrink-0`} />
}
