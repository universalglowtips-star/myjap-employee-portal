import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitPayrollPeriod, approvePayrollPeriod, rejectPayrollPeriod } from '../../../api/endpoints/payrollPeriod'

/** Semua mutation invalidate list (['payroll-periods'], apapun filternya) + detail periode yang barusan diaksi (['payroll-period', id]) - pola sama persis useLeaveMutations.ts (Task 11). */
function invalidatePayrollPeriodQueries(queryClient: ReturnType<typeof useQueryClient>, id: number) {
  queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
  queryClient.invalidateQueries({ queryKey: ['payroll-period', id] })
}

export function useSubmitPayrollPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => submitPayrollPeriod(id),
    onSuccess: (_data, id) => invalidatePayrollPeriodQueries(queryClient, id),
  })
}

export function useApprovePayrollPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => approvePayrollPeriod(id, notes),
    onSuccess: (_data, { id }) => invalidatePayrollPeriodQueries(queryClient, id),
  })
}

export function useRejectPayrollPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectPayrollPeriod(id, reason),
    onSuccess: (_data, { id }) => invalidatePayrollPeriodQueries(queryClient, id),
  })
}
