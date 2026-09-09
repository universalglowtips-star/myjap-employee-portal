import { useQuery } from '@tanstack/react-query'
import { fetchPayrollPeriod } from '../../../api/endpoints/payrollPeriod'
import type { PayrollPeriodDetailResponse } from '../../../api/types/payrollPeriod'
import type { NormalizedApiError } from '../../../api/client'

export function usePayrollPeriod(id: number | undefined) {
  return useQuery<PayrollPeriodDetailResponse, NormalizedApiError>({
    queryKey: ['payroll-period', id],
    queryFn: () => fetchPayrollPeriod(id as number),
    enabled: id !== undefined,
  })
}
