import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchOfficeLocationSupervisors, updateOfficeLocationSupervisors } from '../../../api/endpoints/officeLocationSupervisors'
import type { OfficeLocationSupervisorsData } from '../../../api/types/officeLocationSupervisor'
import type { NormalizedApiError } from '../../../api/client'

/** Query key per-lokasi (bukan 1 key global) - officeLocationId di dalam array biar invalidation gak nyenggol lokasi lain. Pola persis rolePermissionsQueryKey. */
export const officeLocationSupervisorsQueryKey = (officeLocationId: number) =>
  ['office-location-supervisors', officeLocationId] as const

export function useOfficeLocationSupervisors(officeLocationId: number, enabled: boolean = true) {
  return useQuery<OfficeLocationSupervisorsData, NormalizedApiError>({
    queryKey: officeLocationSupervisorsQueryKey(officeLocationId),
    queryFn: () => fetchOfficeLocationSupervisors(officeLocationId),
    enabled,
  })
}

/** Invalidate query supervisor lokasi itu setelah sukses simpan - Tab Supervisor auto-refetch data terbaru. */
export function useUpdateOfficeLocationSupervisors(officeLocationId: number) {
  const queryClient = useQueryClient()
  return useMutation<OfficeLocationSupervisorsData, NormalizedApiError, number[]>({
    mutationFn: (employeeIds: number[]) => updateOfficeLocationSupervisors(officeLocationId, employeeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: officeLocationSupervisorsQueryKey(officeLocationId) })
    },
  })
}
