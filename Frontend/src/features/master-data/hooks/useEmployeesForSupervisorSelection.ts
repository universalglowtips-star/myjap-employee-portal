import { useQuery } from '@tanstack/react-query'
import { fetchEmployeesForSupervisorSelection } from '../../../api/endpoints/employees'
import type { Employee } from '../../../api/types/employee'
import type { NormalizedApiError } from '../../../api/client'

/** Query key terpisah dari fetchEmployeesForFilter (Audit Log) - beda tujuan pemakaian, cache terpisah. */
export const employeesForSupervisorSelectionQueryKey = ['employees-for-supervisor-selection'] as const

export function useEmployeesForSupervisorSelection(enabled: boolean = true) {
  return useQuery<Employee[], NormalizedApiError>({
    queryKey: employeesForSupervisorSelectionQueryKey,
    queryFn: fetchEmployeesForSupervisorSelection,
    enabled,
  })
}
