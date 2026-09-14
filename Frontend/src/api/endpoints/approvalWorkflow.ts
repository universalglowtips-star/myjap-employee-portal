import { apiClient } from '../client'
import type {
  ApprovalWorkflowListResponse,
  ApprovalWorkflowQueryParams,
  ApprovalWorkflowCreateRequest,
  ApprovalWorkflowUpdateRequest,
  ApprovalWorkflow,
} from '../types/approvalWorkflow'
import type { ApiSuccessResponse } from '../types/common'

/** GET /approval-workflows - permission approval-workflow.view (HRD only + SUPER_ADMIN bypass). Eager-load steps.approverRole+creator sudah dari backend, tidak perlu fetch tambahan buat tabel/form edit. */
export async function fetchApprovalWorkflows(params: ApprovalWorkflowQueryParams): Promise<ApprovalWorkflowListResponse> {
  const res = await apiClient.get<ApprovalWorkflowListResponse>('/approval-workflows', { params })
  return res.data
}

/** POST /approval-workflows - permission approval-workflow.create. */
export async function createApprovalWorkflow(payload: ApprovalWorkflowCreateRequest): Promise<ApprovalWorkflow> {
  const res = await apiClient.post<ApiSuccessResponse<ApprovalWorkflow>>('/approval-workflows', payload)
  return res.data.data
}

/** PUT /approval-workflows/{id} - permission approval-workflow.update. applies_to_period_type TIDAK dikirim di sini (backend gak menerimanya di update, dikonfirmasi baca controller - field ini immutable setelah create). */
export async function updateApprovalWorkflow(id: number, payload: ApprovalWorkflowUpdateRequest): Promise<ApprovalWorkflow> {
  const res = await apiClient.put<ApiSuccessResponse<ApprovalWorkflow>>(`/approval-workflows/${id}`, payload)
  return res.data.data
}

/** DELETE /approval-workflows/{id} - permission approval-workflow.delete. Backend tolak (422) kalau ada PayrollPeriod berstatus Submitted/Approved yang masih pakai workflow ini - pesan errornya sudah jelas, tampilkan apa adanya ke user. */
export async function deleteApprovalWorkflow(id: number): Promise<void> {
  await apiClient.delete(`/approval-workflows/${id}`)
}
