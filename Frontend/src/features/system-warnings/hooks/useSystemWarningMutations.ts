import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resolveSystemWarning } from '../../../api/endpoints/systemWarnings'

/**
 * Invalidate ['system-warnings'] (list ini) DAN ['dashboard-summary']
 * (KPI card "Peringatan Sistem" di Dashboard baca unresolved_count dari
 * situ) - resolve satu warning di sini harus langsung nurunin angka di
 * KPI card tanpa perlu reload halaman Dashboard manual.
 */
export function useResolveSystemWarning() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => resolveSystemWarning(id),
    onSettled: () => {
      // onSettled (BUKAN cuma onSuccess) - kalau gagal karena race
      // condition (warning ini udah di-resolve orang lain barengan,
      // backend balikin 422), list TETAP harus di-refresh biar baris
      // itu ke-sync nunjukin status resolved yang sebenarnya, bukan
      // nyangkut nunjukin state lama "belum resolved" yang udah gak akurat.
      queryClient.invalidateQueries({ queryKey: ['system-warnings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}
