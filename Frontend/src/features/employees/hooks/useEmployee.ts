import { useQuery } from '@tanstack/react-query'
import { fetchEmployee } from '../../../api/endpoints/employees'
import type { Employee } from '../../../api/types/employee'
import type { NormalizedApiError } from '../../../api/client'

/** Dipakai buat pre-fill Form Edit (Fase 8c) - query key per-id, cache independen dari list. */
export function useEmployee(id: number, enabled: boolean = true) {
  return useQuery<Employee, NormalizedApiError>({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployee(id),
    enabled,
  })
}
