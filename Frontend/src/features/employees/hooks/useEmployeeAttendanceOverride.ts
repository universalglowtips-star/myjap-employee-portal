import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchEmployeeAttendanceOverride,
  updateEmployeeAttendanceOverride,
  deleteEmployeeAttendanceOverride,
} from '../../../api/endpoints/employeeAttendanceOverride'
import type {
  EmployeeAttendanceLocationOverride,
  EmployeeAttendanceLocationOverrideShowData,
  EmployeeAttendanceLocationOverrideUpdateRequest,
} from '../../../api/types/employeeAttendanceOverride'
import type { NormalizedApiError } from '../../../api/client'

/** Query key per-employee (bukan 1 key global) - pola persis officeLocationSupervisorsQueryKey/rolePermissionsQueryKey. */
export const employeeAttendanceOverrideQueryKey = (employeeId: number) =>
  ['employee-attendance-override', employeeId] as const

export function useEmployeeAttendanceOverride(employeeId: number, enabled: boolean = true) {
  return useQuery<EmployeeAttendanceLocationOverrideShowData, NormalizedApiError>({
    queryKey: employeeAttendanceOverrideQueryKey(employeeId),
    queryFn: () => fetchEmployeeAttendanceOverride(employeeId),
    enabled,
  })
}

export function useUpdateEmployeeAttendanceOverride(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation<EmployeeAttendanceLocationOverride, NormalizedApiError, EmployeeAttendanceLocationOverrideUpdateRequest>({
    mutationFn: (payload) => updateEmployeeAttendanceOverride(employeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeAttendanceOverrideQueryKey(employeeId) })
    },
  })
}

export function useDeleteEmployeeAttendanceOverride(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation<void, NormalizedApiError, void>({
    mutationFn: () => deleteEmployeeAttendanceOverride(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeAttendanceOverrideQueryKey(employeeId) })
    },
  })
}
