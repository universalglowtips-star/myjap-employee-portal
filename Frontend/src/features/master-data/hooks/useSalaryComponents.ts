import { useQuery } from '@tanstack/react-query'
import { fetchSalaryComponents } from '../../../api/endpoints/salaryComponents'
import type { SalaryComponent } from '../../../api/types/salaryComponent'
import type { NormalizedApiError } from '../../../api/client'

/** Query key 'salary-components' - dipakai juga di mutations buat invalidation, harus persis sama stringnya. Pola persis useDepartments/usePositions/useWorkShifts/useOfficeLocations. */
export const salaryComponentsQueryKey = ['salary-components'] as const

export function useSalaryComponents(enabled: boolean = true) {
  return useQuery<SalaryComponent[], NormalizedApiError>({
    queryKey: salaryComponentsQueryKey,
    queryFn: fetchSalaryComponents,
    enabled,
  })
}
