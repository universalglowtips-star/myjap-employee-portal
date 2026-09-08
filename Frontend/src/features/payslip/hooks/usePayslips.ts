import { useQuery } from '@tanstack/react-query'
import { fetchPayslips } from '../../../api/endpoints/payslip'
import type { PayslipListResponse, PayslipQueryParams } from '../../../api/types/payslip'
import type { NormalizedApiError } from '../../../api/client'

/** GET /payslips - ScopesOwnData + restrictToPublishedIfEmployee otomatis batasin EMPLOYEE ke slip Published miliknya sendiri, dipakai APA ADANYA baik di view Karyawan maupun view Admin (backend yang beda-in lewat role user login). queryKey terpisah dari ['payslips-summary'] (Employee Home card, usePayslipsSummary.ts) - query yang beda tujuan, jangan berbagi cache. */
export function usePayslips(params: PayslipQueryParams) {
  return useQuery<PayslipListResponse, NormalizedApiError>({
    queryKey: ['payslips', params],
    queryFn: () => fetchPayslips(params),
  })
}
