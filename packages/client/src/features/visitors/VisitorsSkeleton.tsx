import { TextLineSkeleton, SectionLabelSkeleton, IconButtonSkeleton, skeletonCls } from '@components/skeletons'

function SlotSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 px-4 py-3">
      <div className={`flex-shrink-0 rounded-xl w-[52px] h-[64px] ${skeletonCls}`} />
      <div className="flex-1 space-y-2 min-w-0">
        <TextLineSkeleton width="w-2/3" />
        <TextLineSkeleton width="w-1/3" height="h-3" />
      </div>
      <IconButtonSkeleton />
    </div>
  )
}

function MonthGroupSkeleton({ labelWidth, slots }: { labelWidth: string; slots: number }) {
  return (
    <div>
      <SectionLabelSkeleton width={labelWidth} />
      <div className="space-y-2">
        {Array.from({ length: slots }).map((_, i) => (
          <SlotSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function VisitorsSkeleton() {
  return (
    <div className="space-y-6">
      <MonthGroupSkeleton labelWidth="w-28" slots={2} />
      <MonthGroupSkeleton labelWidth="w-24" slots={3} />
    </div>
  )
}
