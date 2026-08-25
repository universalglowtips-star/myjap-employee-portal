import { useQuery } from '@tanstack/react-query'
import { fetchEmployeesPaginated } from '../../../api/endpoints/employees'
import type { EmployeeListResponse, EmployeeQueryParams } from '../../../api/types/employee'
import type { NormalizedApiError } from '../../../api/client'

/** Query key nyertain `params` UTUH - pola persis useAuditLogs, ganti halaman otomatis refetch, gak nyangkut data lama. */
export function useEmployeesPaginated(params: EmployeeQueryParams, enabled: boolean = true) {
  return useQuery<EmployeeListResponse, NormalizedApiError>({
    queryKey: ['employees', params],
    queryFn: () => fetchEmployeesPaginated(params),
    enabled,
  })
}
