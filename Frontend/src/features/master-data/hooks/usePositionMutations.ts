import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPosition, updatePosition, deletePosition } from '../../../api/endpoints/positions'
import type { PositionCreateRequest, PositionUpdateRequest } from '../../../api/types/position'
import { positionsQueryKey } from './usePositions'

/**
 * Pola PERSIS sama kayak useDepartmentMutations.ts (Tugas 1 reference) -
 * 3 mutation terpisah, masing-masing invalidate query list yang sama
 * setelah sukses.
 */
export function useCreatePosition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PositionCreateRequest) => createPosition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: positionsQueryKey })
    },
  })
}

export function useUpdatePosition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PositionUpdateRequest }) =>
      updatePosition(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: positionsQueryKey })
    },
  })
}

export function useDeletePosition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePosition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: positionsQueryKey })
    },
  })
}
