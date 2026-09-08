import { useQuery } from '@tanstack/react-query'
import { fetchPayslip } from '../../../api/endpoints/payslip'
import type { Payslip } from '../../../api/types/payslip'
import type { NormalizedApiError } from '../../../api/client'

/** GET /payslips/{id} - detail + breakdown items, dipakai modal detail. `enabled` opsional buat nahan fetch sebelum modal beneran kebuka (id null). */
export function usePayslip(id: number | null) {
  return useQuery<Payslip, NormalizedApiError>({
    queryKey: ['payslip', id],
    queryFn: () => fetchPayslip(id as number),
    enabled: id !== null,
  })
}
