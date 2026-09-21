import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchOfficeLocationSalaryRates,
  updateOfficeLocationSalaryRates,
} from '../../../api/endpoints/officeLocationSalaryRates'
import type {
  OfficeLocationSalaryRateListResponse,
  OfficeLocationSalaryRateUpdateRequest,
} from '../../../api/types/officeLocationSalaryRate'
import type { NormalizedApiError } from '../../../api/client'

export const officeLocationSalaryRatesQueryKey = (officeLocationId: number) =>
  ['office-location-salary-rates', officeLocationId] as const

export function useOfficeLocationSalaryRates(officeLocationId: number | null) {
  return useQuery<OfficeLocationSalaryRateListResponse['data'], NormalizedApiError>({
    queryKey: officeLocationSalaryRatesQueryKey(officeLocationId ?? 0),
    queryFn: () => fetchOfficeLocationSalaryRates(officeLocationId as number),
    enabled: officeLocationId !== null,
  })
}

export function useUpdateOfficeLocationSalaryRates(officeLocationId: number | null) {
  const queryClient = useQueryClient()
  return useMutation<void, NormalizedApiError, OfficeLocationSalaryRateUpdateRequest>({
    mutationFn: (payload) => updateOfficeLocationSalaryRates(officeLocationId as number, payload),
    onSuccess: () => {
      if (officeLocationId !== null) {
        queryClient.invalidateQueries({ queryKey: officeLocationSalaryRatesQueryKey(officeLocationId) })
      }
    },
  })
}
