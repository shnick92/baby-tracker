import { TextLineSkeleton, SectionLabelSkeleton, IconButtonSkeleton, skeletonCls } from '@components/skeletons'

function RowSkeleton({ wide }: { wide?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1 space-y-1.5">
        <TextLineSkeleton width={wide ? 'w-2/3' : 'w-1/2'} />
        <TextLineSkeleton width="w-16" height="h-3" />
      </div>
      <div className={`h-7 w-14 ${skeletonCls} rounded-full flex-shrink-0`} />
      <IconButtonSkeleton />
    </div>
  )
}

function GroupSkeleton({ labelWidth, rows }: { labelWidth: string; rows: number }) {
  return (
    <div>
      <SectionLabelSkeleton width={labelWidth} />
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, i) => (
          <RowSkeleton key={i} wide={i % 2 === 0} />
        ))}
      </div>
    </div>
  )
}

export function PurchasesSkeleton() {
  return (
    <div className="space-y-6">
      <GroupSkeleton labelWidth="w-20" rows={3} />
      <GroupSkeleton labelWidth="w-16" rows={4} />
      <GroupSkeleton labelWidth="w-24" rows={2} />
    </div>
  )
}
