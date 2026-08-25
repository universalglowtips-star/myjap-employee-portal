import { useQuery } from '@tanstack/react-query'
import { fetchOfficeLocations } from '../../../api/endpoints/officeLocations'
import type { OfficeLocation } from '../../../api/types/officeLocation'
import type { NormalizedApiError } from '../../../api/client'

/** Query key 'office-locations' - dipakai juga di mutations buat invalidation, harus persis sama stringnya. Pola persis useDepartments/usePositions/useWorkShifts. */
export const officeLocationsQueryKey = ['office-locations'] as const

export function useOfficeLocations(enabled: boolean = true) {
  return useQuery<OfficeLocation[], NormalizedApiError>({
    queryKey: officeLocationsQueryKey,
    queryFn: fetchOfficeLocations,
    enabled,
  })
}
