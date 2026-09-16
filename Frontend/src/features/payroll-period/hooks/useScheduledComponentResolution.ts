import { useQuery } from '@tanstack/react-query'
import { fetchPositionSalaryComponents } from '../../../api/endpoints/positionSalaryComponent'
import { fetchEmployeeSalaryComponents } from '../../../api/endpoints/employeeSalaryComponent'
import type { NormalizedApiError } from '../../../api/client'

export interface ScheduledComponentResolutionMaps {
  /** positionRateMap[positionId][salaryComponentId] = amount (string, decimal:2 dari backend). */
  positionRateMap: Record<number, Record<number, string>>
  /** overrideMap[employeeId][salaryComponentId] = amount. */
  overrideMap: Record<number, Record<number, string>>
}

/**
 * Task 15b - "Isi Data Periode" butuh tau, per (karyawan, komponen
 * scheduled_variable), apakah ADA tarif yang resolve (override
 * karyawan ATAU default jabatan) - itu yang nentuin sel mana yang
 * dikasih input quantity (SAMA PERSIS logic resolveComponentRate() di
 * PayslipController, direplikasi di frontend murni buat nentuin sel
 * mana yang perlu diisi, BUKAN buat ngitung apa-apa - generate tetap
 * dihitung ulang 100% di backend).
 *
 * TIDAK ADA endpoint "bulk resolve" di backend (di luar approval D.1) -
 * jadi di-compose dari endpoint per-komponen (posisi) + per-karyawan
 * (override) yang SUDAH ADA, SATU PER SATU (BUKAN Promise.all) -
 * dikonfirmasi lewat debugging nyata (lihat usePositionRatesForComponents.ts):
 * N request paralel ber-Authorization-header ke `php artisan serve`
 * (single-threaded di dev) HANG SELAMANYA, bukan cuma lambat. Sekuensial
 * lebih lambat tapi pasti selesai - dampaknya cuma nambah waktu load
 * awal section "Isi Data Periode", bukan korban baru fungsional apapun.
 */
export function useScheduledComponentResolution(
  scheduledComponentIds: number[],
  employeeIds: number[],
  enabled: boolean = true
) {
  return useQuery<ScheduledComponentResolutionMaps, NormalizedApiError>({
    queryKey: ['scheduled-component-resolution', scheduledComponentIds, employeeIds],
    queryFn: async () => {
      const positionRateMap: Record<number, Record<number, string>> = {}
      const overrideMap: Record<number, Record<number, string>> = {}

      for (const id of scheduledComponentIds) {
        const list = await fetchPositionSalaryComponents(id)
        for (const rate of list) {
          positionRateMap[rate.position_id] ??= {}
          positionRateMap[rate.position_id][rate.salary_component_id] = rate.amount
        }
      }

      for (const id of employeeIds) {
        const list = await fetchEmployeeSalaryComponents(id)
        for (const override of list) {
          overrideMap[override.employee_id] ??= {}
          overrideMap[override.employee_id][override.salary_component_id] = override.amount
        }
      }

      return { positionRateMap, overrideMap }
    },
    enabled: enabled && scheduledComponentIds.length > 0 && employeeIds.length > 0,
  })
}
