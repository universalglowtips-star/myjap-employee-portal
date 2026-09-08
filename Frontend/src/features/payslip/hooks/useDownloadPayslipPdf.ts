import { useMutation } from '@tanstack/react-query'
import { downloadPayslipPdf } from '../../../api/endpoints/payslip'

/** POST-like side effect (file download) lewat useMutation, bukan useQuery - gak ada data yang perlu di-cache, cuma butuh isPending/onError buat UI (tombol loading + toast gagal). */
export function useDownloadPayslipPdf() {
  return useMutation({
    mutationFn: ({ id, filenameFallback }: { id: number; filenameFallback: string }) => downloadPayslipPdf(id, filenameFallback),
  })
}
