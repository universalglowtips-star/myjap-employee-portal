import { useQuery } from '@tanstack/react-query'
import { fetchPositionSalaryComponents } from '../../../api/endpoints/positionSalaryComponent'
import type { PositionSalaryComponent } from '../../../api/types/positionSalaryComponent'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Task 15b - backend CUMA punya GET /salary-components/{id}/positions
 * (component -> positions, keputusan D.1: dikelola dari sisi Komponen
 * Gaji). TIDAK ADA endpoint kebalikannya (position -> components) -
 * jadi buat kebutuhan "dikasih 1 jabatan karyawan, tampilkan SEMUA
 * default rate lintas komponen" (EmployeeSalaryComponentTab), di-compose
 * dari endpoint yang SUDAH ADA, SATU PER SATU (BUKAN Promise.all) -
 * dikonfirmasi lewat debugging nyata: Promise.all N request paralel
 * (masing-masing bawa header Authorization, yang men-trigger CORS
 * preflight OPTIONS di browser) ke `php artisan serve` (single-threaded
 * di dev) benar-benar HANG SELAMANYA begitu N cukup besar (~13 di sini) -
 * bukan cuma lambat. Sekuensial lebih lambat tapi PASTI selesai,
 * gak bergantung asumsi soal concurrency server tujuan.
 */
export function usePositionRatesForComponents(salaryComponentIds: number[], enabled: boolean = true) {
  return useQuery<PositionSalaryComponent[], NormalizedApiError>({
    queryKey: ['position-rates-for-components', salaryComponentIds],
    queryFn: async () => {
      const all: PositionSalaryComponent[] = []
      for (const id of salaryComponentIds) {
        const list = await fetchPositionSalaryComponents(id)
        all.push(...list)
      }
      return all
    },
    enabled: enabled && salaryComponentIds.length > 0,
  })
}
