import { apiClient } from '../client'
import type { PayslipListResponse, PayslipQueryParams } from '../types/payslip'

/** GET /payslips - restrictToPublishedIfEmployee + ScopesOwnData otomatis batasin EMPLOYEE ke slip Published miliknya sendiri (dikonfirmasi backend, bukan asumsi UI). */
export async function fetchPayslips(params: PayslipQueryParams): Promise<PayslipListResponse> {
  const res = await apiClient.get<PayslipListResponse>('/payslips', { params })
  return res.data
}
