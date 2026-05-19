import { TextLineSkeleton, SectionLabelSkeleton, skeletonCls } from '@components/skeletons'

function RowSkeleton({ wide }: { wide?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className={`w-5 h-5 rounded ${skeletonCls} flex-shrink-0`} />
      <TextLineSkeleton width={wide ? 'w-2/3' : 'w-1/2'} />
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

export function ChecklistSkeleton() {
  return (
    <div className="space-y-6">
      <GroupSkeleton labelWidth="w-28" rows={4} />
      <GroupSkeleton labelWidth="w-20" rows={3} />
      <GroupSkeleton labelWidth="w-24" rows={5} />
    </div>
  )
}
