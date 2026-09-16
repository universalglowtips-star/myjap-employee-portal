import { apiClient } from '../client'
import type {
  PayrollPeriodEmployeeQuantity,
  PayrollPeriodQuantityListResponse,
  PayrollPeriodQuantityUpdateRequest,
} from '../types/payrollPeriodQuantity'
import type { ApiSuccessResponse } from '../types/common'

/** GET payroll-periods/{id}/quantities - "Jumlah" yang udah diisi HRD untuk periode ini. */
export async function fetchPayrollPeriodQuantities(payrollPeriodId: number): Promise<PayrollPeriodEmployeeQuantity[]> {
  const res = await apiClient.get<PayrollPeriodQuantityListResponse>(`/payroll-periods/${payrollPeriodId}/quantities`)
  return res.data.data
}

/**
 * PUT payroll-periods/{id}/quantities - batch upsert SEKALIGUS (array
 * penuh, bukan 1 baris). 422 kalau periode udah bukan Draft lagi.
 */
export async function updatePayrollPeriodQuantities(
  payrollPeriodId: number,
  payload: PayrollPeriodQuantityUpdateRequest
): Promise<PayrollPeriodEmployeeQuantity[]> {
  const res = await apiClient.put<ApiSuccessResponse<PayrollPeriodEmployeeQuantity[]>>(
    `/payroll-periods/${payrollPeriodId}/quantities`,
    payload
  )
  return res.data.data
}
