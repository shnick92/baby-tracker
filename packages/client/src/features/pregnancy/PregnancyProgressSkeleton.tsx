import { skeletonCls } from '@components/skeletons'

export function PregnancyProgressSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-5">
      <div className={`flex-shrink-0 w-[88px] h-[88px] rounded-full ${skeletonCls}`} />
      <div className="flex-1 space-y-2">
        <div className={`h-4 w-24 ${skeletonCls} rounded`} />
        <div className={`h-3 w-44 ${skeletonCls} rounded`} />
        <div className={`h-3 w-36 ${skeletonCls} rounded`} />
      </div>
    </div>
  )
}
