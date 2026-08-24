import { useQuery } from '@tanstack/react-query'
import { fetchPositions } from '../../../api/endpoints/positions'
import type { Position } from '../../../api/types/position'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Query key 'positions' - dipakai juga di mutations buat invalidation
 * (harus persis sama string-nya, itu yang bikin TanStack Query tau
 * data mana yang perlu di-refetch setelah create/update/delete).
 *
 * Pola PERSIS sama kayak useDepartments.ts (Tugas 1 reference) -
 * `enabled` buat gating query barengan PermissionGate (lihat
 * PositionListPage), generic error type <Position[], NormalizedApiError>
 * biar TanStack Query tau bentuk error dari interceptor client.ts.
 */
export const positionsQueryKey = ['positions'] as const

export function usePositions(enabled: boolean = true) {
  return useQuery<Position[], NormalizedApiError>({
    queryKey: positionsQueryKey,
    queryFn: fetchPositions,
    enabled,
  })
}
