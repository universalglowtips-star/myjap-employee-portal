import { useQuery } from '@tanstack/react-query'
import { fetchSystemWarnings } from '../../../api/endpoints/systemWarnings'
import type { SystemWarningListResponse, SystemWarningQueryParams } from '../../../api/types/systemWarning'
import type { NormalizedApiError } from '../../../api/client'

/** Query key nyertain `params` utuh - toggle include_resolved/pindah halaman harus jadi cache entry beda, pola sama persis useAuditLogs. */
export function useSystemWarnings(params: SystemWarningQueryParams, enabled: boolean = true) {
  return useQuery<SystemWarningListResponse, NormalizedApiError>({
    queryKey: ['system-warnings', params],
    queryFn: () => fetchSystemWarnings(params),
    enabled,
  })
}
