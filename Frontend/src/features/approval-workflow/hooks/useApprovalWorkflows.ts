import { useQuery } from '@tanstack/react-query'
import { fetchApprovalWorkflows } from '../../../api/endpoints/approvalWorkflow'
import type { ApprovalWorkflowListResponse, ApprovalWorkflowQueryParams } from '../../../api/types/approvalWorkflow'
import type { NormalizedApiError } from '../../../api/client'

export const approvalWorkflowsQueryKey = ['approval-workflows'] as const

export function useApprovalWorkflows(params: ApprovalWorkflowQueryParams, enabled: boolean = true) {
  return useQuery<ApprovalWorkflowListResponse, NormalizedApiError>({
    queryKey: [...approvalWorkflowsQueryKey, params],
    queryFn: () => fetchApprovalWorkflows(params),
    enabled,
  })
}
