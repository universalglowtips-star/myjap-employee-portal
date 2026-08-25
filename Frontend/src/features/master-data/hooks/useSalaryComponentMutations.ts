import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createSalaryComponent,
  updateSalaryComponent,
  deleteSalaryComponent,
} from '../../../api/endpoints/salaryComponents'
import type { SalaryComponentCreateRequest, SalaryComponentUpdateRequest } from '../../../api/types/salaryComponent'
import { salaryComponentsQueryKey } from './useSalaryComponents'

/** 3 mutation terpisah, tiap satu invalidate salaryComponentsQueryKey setelah sukses - pola persis modul master data lain. */
export function useCreateSalaryComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SalaryComponentCreateRequest) => createSalaryComponent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryComponentsQueryKey })
    },
  })
}

export function useUpdateSalaryComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SalaryComponentUpdateRequest }) =>
      updateSalaryComponent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryComponentsQueryKey })
    },
  })
}

export function useDeleteSalaryComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteSalaryComponent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryComponentsQueryKey })
    },
  })
}
