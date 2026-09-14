import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createApprovalWorkflow, updateApprovalWorkflow, deleteApprovalWorkflow } from '../../../api/endpoints/approvalWorkflow'
import type { ApprovalWorkflowCreateRequest, ApprovalWorkflowUpdateRequest } from '../../../api/types/approvalWorkflow'
import { approvalWorkflowsQueryKey } from './useApprovalWorkflows'

/** Semua mutation invalidate approvalWorkflowsQueryKey (apapun filternya) - pola persis useWorkShiftMutations/useDepartmentMutations. */
export function useCreateApprovalWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ApprovalWorkflowCreateRequest) => createApprovalWorkflow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalWorkflowsQueryKey })
    },
  })
}

export function useUpdateApprovalWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ApprovalWorkflowUpdateRequest }) => updateApprovalWorkflow(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalWorkflowsQueryKey })
    },
  })
}

export function useDeleteApprovalWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteApprovalWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalWorkflowsQueryKey })
    },
  })
}
