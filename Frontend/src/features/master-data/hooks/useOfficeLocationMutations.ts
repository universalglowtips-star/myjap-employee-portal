import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOfficeLocation, updateOfficeLocation, deleteOfficeLocation } from '../../../api/endpoints/officeLocations'
import type { OfficeLocationCreateRequest, OfficeLocationUpdateRequest } from '../../../api/types/officeLocation'
import { officeLocationsQueryKey } from './useOfficeLocations'

/** 3 mutation terpisah, tiap satu invalidate officeLocationsQueryKey setelah sukses - pola persis useDepartmentMutations/usePositionMutations/useWorkShiftMutations. */
export function useCreateOfficeLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OfficeLocationCreateRequest) => createOfficeLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: officeLocationsQueryKey })
    },
  })
}

export function useUpdateOfficeLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OfficeLocationUpdateRequest }) =>
      updateOfficeLocation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: officeLocationsQueryKey })
    },
  })
}

export function useDeleteOfficeLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteOfficeLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: officeLocationsQueryKey })
    },
  })
}
