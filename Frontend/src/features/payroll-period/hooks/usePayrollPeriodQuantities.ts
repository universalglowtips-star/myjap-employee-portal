import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPayrollPeriodQuantities, updatePayrollPeriodQuantities } from '../../../api/endpoints/payrollPeriodQuantity'
import type { PayrollPeriodEmployeeQuantity, PayrollPeriodQuantityUpdateRequest } from '../../../api/types/payrollPeriodQuantity'
import type { NormalizedApiError } from '../../../api/client'

export const payrollPeriodQuantitiesQueryKey = (payrollPeriodId: number) =>
  ['payroll-period-quantities', payrollPeriodId] as const

export function usePayrollPeriodQuantities(payrollPeriodId: number, enabled: boolean = true) {
  return useQuery<PayrollPeriodEmployeeQuantity[], NormalizedApiError>({
    queryKey: payrollPeriodQuantitiesQueryKey(payrollPeriodId),
    queryFn: () => fetchPayrollPeriodQuantities(payrollPeriodId),
    enabled,
  })
}

export function useUpdatePayrollPeriodQuantities(payrollPeriodId: number) {
  const queryClient = useQueryClient()
  return useMutation<PayrollPeriodEmployeeQuantity[], NormalizedApiError, PayrollPeriodQuantityUpdateRequest>({
    mutationFn: (payload) => updatePayrollPeriodQuantities(payrollPeriodId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollPeriodQuantitiesQueryKey(payrollPeriodId) })
    },
  })
}
