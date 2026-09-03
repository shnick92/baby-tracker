import { TextLineSkeleton, SectionLabelSkeleton, IconButtonSkeleton, skeletonCls } from '@components/skeletons'

function AppointmentRowSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 px-4 py-3">
      <div className={`flex-shrink-0 rounded-xl w-[60px] h-[64px] ${skeletonCls}`} />
      <div className="flex-1 space-y-2 min-w-0">
        <TextLineSkeleton width="w-2/3" />
        <TextLineSkeleton width="w-1/2" height="h-3" />
      </div>
      <IconButtonSkeleton />
    </div>
  )
}

function DoctorCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-4 space-y-2">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex-shrink-0 ${skeletonCls}`} />
        <div className="flex-1 space-y-2">
          <TextLineSkeleton width="w-1/2" />
          <TextLineSkeleton width="w-1/3" height="h-3" />
        </div>
      </div>
      <TextLineSkeleton width="w-3/4" height="h-3" />
      <div className="flex gap-2 pt-1">
        <div className={`h-9 flex-1 rounded-xl ${skeletonCls}`} />
        <div className={`h-9 w-9 rounded-xl ${skeletonCls}`} />
      </div>
    </div>
  )
}

export function DoctorsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <SectionLabelSkeleton width="w-36" />
        <div className="space-y-2">
          <AppointmentRowSkeleton />
          <AppointmentRowSkeleton />
        </div>
      </div>
      <div>
        <SectionLabelSkeleton width="w-24" />
        <div className="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          <DoctorCardSkeleton />
          <DoctorCardSkeleton />
          <DoctorCardSkeleton />
        </div>
      </div>
    </div>
  )
}
