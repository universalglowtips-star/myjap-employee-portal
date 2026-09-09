import { apiClient } from '../client'
import type {
  PayrollPeriodListResponse,
  PayrollPeriodQueryParams,
  PayrollPeriodDetailResponse,
  PayrollPeriod,
} from '../types/payrollPeriod'

/** GET /payroll-periods - permission dashboard.view (agregat lintas karyawan, BUKAN payroll-period.view - dikonfirmasi routes/api.php investigasi Task 13). */
export async function fetchPayrollPeriods(params: PayrollPeriodQueryParams): Promise<PayrollPeriodListResponse> {
  const res = await apiClient.get<PayrollPeriodListResponse>('/payroll-periods', { params })
  return res.data
}

/** GET /payroll-periods/{id} - permission dashboard.view sama seperti index(). */
export async function fetchPayrollPeriod(id: number): Promise<PayrollPeriodDetailResponse> {
  const res = await apiClient.get<PayrollPeriodDetailResponse>(`/payroll-periods/${id}`)
  return res.data
}

interface MutationResponse {
  success: boolean
  message: string
  data: PayrollPeriod
}

/** POST /payroll-periods/{id}/submit - permission payroll-period.submit (HANYA HRD yang punya, dikonfirmasi RolePermissionSeeder). */
export async function submitPayrollPeriod(id: number): Promise<MutationResponse> {
  const res = await apiClient.post<MutationResponse>(`/payroll-periods/${id}/submit`)
  return res.data
}

/** POST /payroll-periods/{id}/approve - permission payroll-period.approve (MANAGER/FINANCE/HRD). Server yang nentuin level mana yang diproses, notes opsional. */
export async function approvePayrollPeriod(id: number, notes?: string): Promise<MutationResponse> {
  const res = await apiClient.post<MutationResponse>(`/payroll-periods/${id}/approve`, { notes: notes || undefined })
  return res.data
}

/** POST /payroll-periods/{id}/reject - permission payroll-period.reject. reason WAJIB (backend validate 'required'). */
export async function rejectPayrollPeriod(id: number, reason: string): Promise<MutationResponse> {
  const res = await apiClient.post<MutationResponse>(`/payroll-periods/${id}/reject`, { reason })
  return res.data
}
