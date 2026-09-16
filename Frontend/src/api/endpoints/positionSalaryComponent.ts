import { apiClient } from '../client'
import type {
  PositionSalaryComponent,
  PositionSalaryComponentListResponse,
  PositionSalaryComponentCreateRequest,
} from '../types/positionSalaryComponent'
import type { ApiSuccessResponse } from '../types/common'

/** GET salary-components/{id}/positions - daftar jabatan yang dapat komponen gaji ini + nominal/tarifnya. */
export async function fetchPositionSalaryComponents(salaryComponentId: number): Promise<PositionSalaryComponent[]> {
  const res = await apiClient.get<PositionSalaryComponentListResponse>(`/salary-components/${salaryComponentId}/positions`)
  return res.data.data
}

/** POST salary-components/{id}/positions - upsert (submit ulang jabatan yang sama = UPDATE nominal, bukan error). */
export async function createPositionSalaryComponent(
  salaryComponentId: number,
  payload: PositionSalaryComponentCreateRequest
): Promise<PositionSalaryComponent> {
  const res = await apiClient.post<ApiSuccessResponse<PositionSalaryComponent>>(
    `/salary-components/${salaryComponentId}/positions`,
    payload
  )
  return res.data.data
}

/** DELETE salary-components/{id}/positions/{positionId} - positionId di PATH. */
export async function deletePositionSalaryComponent(salaryComponentId: number, positionId: number): Promise<void> {
  await apiClient.delete(`/salary-components/${salaryComponentId}/positions/${positionId}`)
}
