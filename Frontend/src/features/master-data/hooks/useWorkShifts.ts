import { useQuery } from '@tanstack/react-query'
import { fetchWorkShifts } from '../../../api/endpoints/workShifts'
import type { WorkShift } from '../../../api/types/workShift'
import type { NormalizedApiError } from '../../../api/client'

/** Query key 'work-shifts' - dipakai juga di mutations buat invalidation, harus persis sama stringnya. Pola persis useDepartments/usePositions. */
export const workShiftsQueryKey = ['work-shifts'] as const

export function useWorkShifts(enabled: boolean = true) {
  return useQuery<WorkShift[], NormalizedApiError>({
    queryKey: workShiftsQueryKey,
    queryFn: fetchWorkShifts,
    enabled,
  })
}
