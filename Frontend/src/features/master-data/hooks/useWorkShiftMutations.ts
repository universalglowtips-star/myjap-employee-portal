import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createWorkShift, updateWorkShift, deleteWorkShift } from '../../../api/endpoints/workShifts'
import type { WorkShiftCreateRequest, WorkShiftUpdateRequest } from '../../../api/types/workShift'
import { workShiftsQueryKey } from './useWorkShifts'

/** 3 mutation terpisah, tiap satu invalidate workShiftsQueryKey setelah sukses - pola persis useDepartmentMutations/usePositionMutations. */
export function useCreateWorkShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: WorkShiftCreateRequest) => createWorkShift(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workShiftsQueryKey })
    },
  })
}

export function useUpdateWorkShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: WorkShiftUpdateRequest }) => updateWorkShift(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workShiftsQueryKey })
    },
  })
}

export function useDeleteWorkShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteWorkShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workShiftsQueryKey })
    },
  })
}
