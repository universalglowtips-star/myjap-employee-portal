import { useMutation, useQueryClient } from '@tanstack/react-query'
import { generateBulkPayroll, publishBulkPayroll } from '../../../api/endpoints/payslip'
import type { GenerateBulkRequest, GenerateBulkResponse, PublishBulkRequest, PublishBulkResponse } from '../../../api/types/payslip'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Task 15b - generateBulk()/publishBulk() BISA menyentuh beberapa
 * periode sekaligus (1 per cabang), TAPI dipicu dari 1 halaman Detail
 * Periode tertentu - invalidate periode yang lagi dibuka (biar payslip
 * baru langsung kelihatan di halaman ini) + list periode (period lain
 * yang ikut ke-generate/publish baru muncul/berubah status kalau
 * user balik ke List).
 *
 * periodId OPSIONAL (gap "Mulai Periode Baru") - dipanggil juga dari
 * PayrollBulkGeneratePage yang BELUM PUNYA periode existing sama
 * sekali (justru itu tujuannya - bikin yang pertama). Di situ cuma
 * invalidate list, gak ada periode spesifik buat di-invalidate.
 */
export function useGenerateBulkPayroll(periodId?: number) {
  const queryClient = useQueryClient()
  return useMutation<GenerateBulkResponse, NormalizedApiError, GenerateBulkRequest>({
    mutationFn: (payload) => generateBulkPayroll(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
      if (periodId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['payroll-period', periodId] })
      }
    },
  })
}

export function usePublishBulkPayroll(periodId: number) {
  const queryClient = useQueryClient()
  return useMutation<PublishBulkResponse, NormalizedApiError, PublishBulkRequest>({
    mutationFn: (payload) => publishBulkPayroll(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-period', periodId] })
    },
  })
}
