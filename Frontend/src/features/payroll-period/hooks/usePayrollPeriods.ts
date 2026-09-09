import { useQuery } from '@tanstack/react-query'
import { fetchPayrollPeriods } from '../../../api/endpoints/payrollPeriod'
import type { PayrollPeriodListResponse, PayrollPeriodQueryParams } from '../../../api/types/payrollPeriod'
import type { NormalizedApiError } from '../../../api/client'

export function usePayrollPeriods(params: PayrollPeriodQueryParams) {
  return useQuery<PayrollPeriodListResponse, NormalizedApiError>({
    queryKey: ['payroll-periods', params],
    queryFn: () => fetchPayrollPeriods(params),
  })
}
