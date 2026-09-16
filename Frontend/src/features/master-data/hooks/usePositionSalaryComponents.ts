import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPositionSalaryComponents,
  createPositionSalaryComponent,
  deletePositionSalaryComponent,
} from '../../../api/endpoints/positionSalaryComponent'
import type { PositionSalaryComponent, PositionSalaryComponentCreateRequest } from '../../../api/types/positionSalaryComponent'
import type { NormalizedApiError } from '../../../api/client'

/** Query key per-komponen - pola persis employeeOfficeScopesQueryKey. */
export const positionSalaryComponentsQueryKey = (salaryComponentId: number) =>
  ['position-salary-components', salaryComponentId] as const

export function usePositionSalaryComponents(salaryComponentId: number, enabled: boolean = true) {
  return useQuery<PositionSalaryComponent[], NormalizedApiError>({
    queryKey: positionSalaryComponentsQueryKey(salaryComponentId),
    queryFn: () => fetchPositionSalaryComponents(salaryComponentId),
    enabled,
  })
}

export function useCreatePositionSalaryComponent(salaryComponentId: number) {
  const queryClient = useQueryClient()
  return useMutation<PositionSalaryComponent, NormalizedApiError, PositionSalaryComponentCreateRequest>({
    mutationFn: (payload) => createPositionSalaryComponent(salaryComponentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: positionSalaryComponentsQueryKey(salaryComponentId) })
    },
  })
}

export function useDeletePositionSalaryComponent(salaryComponentId: number) {
  const queryClient = useQueryClient()
  return useMutation<void, NormalizedApiError, number>({
    mutationFn: (positionId) => deletePositionSalaryComponent(salaryComponentId, positionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: positionSalaryComponentsQueryKey(salaryComponentId) })
    },
  })
}
