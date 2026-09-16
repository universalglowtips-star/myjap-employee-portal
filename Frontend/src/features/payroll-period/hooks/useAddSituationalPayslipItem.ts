import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPayslip, updatePayslip } from '../../../api/endpoints/payslip'
import type { Payslip } from '../../../api/types/payslip'
import type { NormalizedApiError } from '../../../api/client'

export interface AddSituationalPayslipItemInput {
  payslipId: number
  salaryComponentId: number
  amount: number
  notes?: string | null
}

/**
 * Task 15b - tambah 1 item Situasional (bonus dadakan dst) ke payslip
 * yang sudah digenerate. PayslipController::update() FULL REPLACE
 * `items` (delete semua lalu insert ulang) - mutationFn ini SENGAJA
 * fetchPayslip() ULANG di dalam dirinya sendiri (bukan pakai data
 * React Query cache dari hasil generate/fetch sebelumnya) supaya
 * "ambil item terbaru sesaat sebelum submit" gak mungkin kelewat
 * kepakai state basi - race condition antar tab/user lain gak bisa
 * bikin item lain HILANG diam-diam.
 *
 * rate/quantity item existing WAJIB ikut dikirim balik apa adanya
 * (bukan cuma salary_component_id/amount/notes) - full-replace berarti
 * field yang gak disertakan balik null, jadi tanpa ini breakdown
 * formula item scheduled_variable yang SUDAH ADA bakal hilang diam-diam
 * begitu HRD nambah 1 item Situasional (gap yang ketahuan pas nutup
 * Fase 2 C.6+E.3).
 */
export function useAddSituationalPayslipItem(payrollPeriodId: number) {
  const queryClient = useQueryClient()

  return useMutation<Payslip, NormalizedApiError, AddSituationalPayslipItemInput>({
    mutationFn: async ({ payslipId, salaryComponentId, amount, notes }) => {
      const freshPayslip = await fetchPayslip(payslipId)

      const existingItems = (freshPayslip.items ?? []).map((item) => ({
        salary_component_id: item.salary_component_id,
        amount: Number(item.amount),
        rate: item.rate === null ? null : Number(item.rate),
        quantity: item.quantity === null ? null : Number(item.quantity),
        notes: item.notes,
      }))

      return updatePayslip(payslipId, {
        items: [...existingItems, { salary_component_id: salaryComponentId, amount, notes: notes ?? null }],
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-period', payrollPeriodId] })
    },
  })
}
