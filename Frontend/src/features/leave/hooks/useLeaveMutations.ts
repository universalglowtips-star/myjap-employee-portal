import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createLeave,
  updateLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  deleteLeave,
  type CreateLeavePayload,
  type UpdateLeavePayload,
} from '../../../api/endpoints/leave'

/** Semua mutation Leave invalidate ['leaves'] (list, apapun filternya) - dan ['leave-quota'] cuma buat create/cancel (satu-satunya aksi yang bisa mengubah SUM(total_days) Approved Annual Leave: create butuh Approved buat kepotong kuota jadi sebenarnya gak langsung ngubah quota - tapi diinvalidate juga biar aman kalau backend/alur berubah nanti, murah buat di-refetch). */
function invalidateLeaveQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['leaves'] })
  queryClient.invalidateQueries({ queryKey: ['leave-quota'] })
}

export function useCreateLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateLeavePayload) => createLeave(payload),
    onSuccess: () => invalidateLeaveQueries(queryClient),
  })
}

export function useUpdateLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateLeavePayload }) => updateLeave(id, payload),
    onSuccess: () => invalidateLeaveQueries(queryClient),
  })
}

export function useApproveLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approvalNotes }: { id: number; approvalNotes?: string }) => approveLeave(id, approvalNotes),
    onSuccess: () => invalidateLeaveQueries(queryClient),
  })
}

export function useRejectLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approvalNotes }: { id: number; approvalNotes: string }) => rejectLeave(id, approvalNotes),
    onSuccess: () => invalidateLeaveQueries(queryClient),
  })
}

export function useCancelLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cancelReason }: { id: number; cancelReason: string }) => cancelLeave(id, cancelReason),
    onSuccess: () => invalidateLeaveQueries(queryClient),
  })
}

export function useDeleteLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteLeave(id),
    onSuccess: () => invalidateLeaveQueries(queryClient),
  })
}
