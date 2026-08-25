import { useQuery } from '@tanstack/react-query'
import { fetchArchivedEmployees } from '../../../api/endpoints/employees'
import type { EmployeeListResponse, EmployeeQueryParams } from '../../../api/types/employee'
import type { NormalizedApiError } from '../../../api/client'

/** Query key terpisah dari 'employees' (List utama) - cache independen, gak saling nyangkut invalidation. */
export function useArchivedEmployees(params: EmployeeQueryParams, enabled: boolean = true) {
  return useQuery<EmployeeListResponse, NormalizedApiError>({
    queryKey: ['employees-archived', params],
    queryFn: () => fetchArchivedEmployees(params),
    enabled,
  })
}
