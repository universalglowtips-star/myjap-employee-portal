import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchEmployeeSalaryComponents,
  createEmployeeSalaryComponent,
  deleteEmployeeSalaryComponent,
} from '../../../api/endpoints/employeeSalaryComponent'
import type { EmployeeSalaryComponent, EmployeeSalaryComponentCreateRequest } from '../../../api/types/employeeSalaryComponent'
import type { NormalizedApiError } from '../../../api/client'

/** Query key per-employee - pola persis employeeOfficeScopesQueryKey. */
export const employeeSalaryComponentsQueryKey = (employeeId: number) =>
  ['employee-salary-components', employeeId] as const

export function useEmployeeSalaryComponents(employeeId: number, enabled: boolean = true) {
  return useQuery<EmployeeSalaryComponent[], NormalizedApiError>({
    queryKey: employeeSalaryComponentsQueryKey(employeeId),
    queryFn: () => fetchEmployeeSalaryComponents(employeeId),
    enabled,
  })
}

export function useCreateEmployeeSalaryComponent(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation<EmployeeSalaryComponent, NormalizedApiError, EmployeeSalaryComponentCreateRequest>({
    mutationFn: (payload) => createEmployeeSalaryComponent(employeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeSalaryComponentsQueryKey(employeeId) })
    },
  })
}

export function useDeleteEmployeeSalaryComponent(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation<void, NormalizedApiError, number>({
    mutationFn: (salaryComponentId) => deleteEmployeeSalaryComponent(employeeId, salaryComponentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeSalaryComponentsQueryKey(employeeId) })
    },
  })
}
