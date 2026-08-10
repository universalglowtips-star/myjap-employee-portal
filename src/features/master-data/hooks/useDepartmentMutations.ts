import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDepartment, updateDepartment, deleteDepartment } from '../../../api/endpoints/departments'
import type { DepartmentCreateRequest, DepartmentUpdateRequest } from '../../../api/types/department'
import { departmentsQueryKey } from './useDepartments'

/**
 * 3 mutation terpisah (bukan 1 hook gabungan) - tiap mutation invalidate
 * query list yang sama (departmentsQueryKey) setelah sukses, jadi Table
 * otomatis refetch data terbaru tanpa manual state management.
 *
 * TIDAK ada global state baru dibuat - cache TanStack Query itu sendiri
 * yang jadi "source of truth" data Department, authStore TIDAK disentuh
 * sama sekali.
 */
export function useCreateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: DepartmentCreateRequest) => createDepartment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentsQueryKey })
    },
  })
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DepartmentUpdateRequest }) =>
      updateDepartment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentsQueryKey })
    },
  })
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentsQueryKey })
    },
  })
}
