import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchEmployeeOfficeScopes,
  createEmployeeOfficeScope,
  deleteEmployeeOfficeScope,
} from '../../../api/endpoints/employeeOfficeScope'
import type { EmployeeOfficeScope, EmployeeOfficeScopeCreateRequest } from '../../../api/types/employeeOfficeScope'
import type { NormalizedApiError } from '../../../api/client'

/** Query key per-employee - pola persis employeeAttendanceOverrideQueryKey/officeLocationSupervisorsQueryKey. */
export const employeeOfficeScopesQueryKey = (employeeId: number) => ['employee-office-scopes', employeeId] as const

export function useEmployeeOfficeScopes(employeeId: number, enabled: boolean = true) {
  return useQuery<EmployeeOfficeScope[], NormalizedApiError>({
    queryKey: employeeOfficeScopesQueryKey(employeeId),
    queryFn: () => fetchEmployeeOfficeScopes(employeeId),
    enabled,
  })
}

export function useCreateEmployeeOfficeScope(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation<EmployeeOfficeScope, NormalizedApiError, EmployeeOfficeScopeCreateRequest>({
    mutationFn: (payload) => createEmployeeOfficeScope(employeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeOfficeScopesQueryKey(employeeId) })
    },
  })
}

export function useDeleteEmployeeOfficeScope(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation<void, NormalizedApiError, number>({
    mutationFn: (officeLocationId) => deleteEmployeeOfficeScope(employeeId, officeLocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeOfficeScopesQueryKey(employeeId) })
    },
  })
}
