import { useQuery } from '@tanstack/react-query'
import { fetchPayslips } from '../../../api/endpoints/payslip'
import type { PayslipListResponse } from '../../../api/types/payslip'
import type { NormalizedApiError } from '../../../api/client'

/**
 * GET /payslips (per_page=5, bukan 1) - backend otomatis batasin
 * EMPLOYEE cuma lihat slip miliknya sendiri yang sudah Published
 * (restrictToPublishedIfEmployee, dikonfirmasi investigasi Task 9.5
 * Bagian B - bukan asumsi UI). Card butuh `total` (jumlah slip
 * published) SEKALIGUS slip terbaru, bukan cuma 1 angka - query sudah
 * ->latest() di backend, item pertama = slip paling baru dibuat.
 */
export function usePayslipsSummary(enabled: boolean = true) {
  return useQuery<PayslipListResponse, NormalizedApiError>({
    queryKey: ['payslips-summary'],
    queryFn: () => fetchPayslips({ per_page: 5 }),
    enabled,
  })
}
