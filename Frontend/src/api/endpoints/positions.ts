import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { Position, PositionCreateRequest, PositionUpdateRequest } from '../types/position'

/** GET /positions - index gak paginated (backend balikin array flat via `data`, sama pola-nya kayak /departments - ada field `total` tambahan di response yang gak dipakai di sini), permission position.view. */
export async function fetchPositions(): Promise<Position[]> {
  const res = await apiClient.get<ApiSuccessResponse<Position[]>>('/positions')
  return res.data.data
}

/** POST /positions - 201, permission position.create. */
export async function createPosition(payload: PositionCreateRequest): Promise<Position> {
  const res = await apiClient.post<ApiSuccessResponse<Position>>('/positions', payload)
  return res.data.data
}

/** PUT /positions/{id} - permission position.update. */
export async function updatePosition(id: number, payload: PositionUpdateRequest): Promise<Position> {
  const res = await apiClient.put<ApiSuccessResponse<Position>>(`/positions/${id}`, payload)
  return res.data.data
}

/** DELETE /positions/{id} - soft delete (SoftDeletes trait), permission position.delete. */
export async function deletePosition(id: number): Promise<void> {
  await apiClient.delete(`/positions/${id}`)
}
