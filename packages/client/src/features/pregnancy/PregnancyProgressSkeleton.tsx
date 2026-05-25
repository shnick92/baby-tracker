import { skeletonCls } from '@components/skeletons'

export function PregnancyProgressSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 pt-3 pb-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`h-3 w-20 ${skeletonCls} rounded`} />
        <div className={`h-5 w-24 ${skeletonCls} rounded-full`} />
      </div>
      <div className="flex justify-center">
        <div className={`w-[144px] h-[144px] rounded-full ${skeletonCls}`} />
      </div>
      <div className="text-center mt-3 space-y-2">
        <div className={`h-4 w-36 ${skeletonCls} rounded mx-auto`} />
        <div className={`h-3 w-48 ${skeletonCls} rounded mx-auto`} />
      </div>
    </div>
  )
}
