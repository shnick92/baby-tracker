import { useQuery } from '@tanstack/react-query'
import type { ExportDataType } from '@tracker/shared'
import { api } from '@lib/axios'

export type ExportPreview = Record<ExportDataType, number> & { total: number }

export function useExportPreview(
  babyId: string | null,
  types: ExportDataType[],
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: ['exportPreview', babyId, [...types].sort().join(','), from, to],
    enabled: !!babyId && types.length > 0 && !!from && !!to,
    queryFn: () =>
      api
        .get<{ data: ExportPreview; error: null }>(
          `/api/export/preview?babyId=${babyId}&types=${types.join(',')}&from=${from}&to=${to}`,
        )
        .then((r) => r.data.data),
  })
}
