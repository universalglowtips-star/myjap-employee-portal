import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Label } from '../../../components/ui/Label'
import { Button } from '../../../components/ui/Button'
import { Table } from '../../../components/ui/Table'
import { Toast } from '../../../components/ui/Toast'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { useSalaryComponents } from '../../master-data/hooks/useSalaryComponents'
import { usePayrollPeriodActiveEmployees } from '../hooks/usePayrollPeriodActiveEmployees'
import { useScheduledComponentResolution } from '../hooks/useScheduledComponentResolution'
import { usePayrollPeriodQuantities, useUpdatePayrollPeriodQuantities } from '../hooks/usePayrollPeriodQuantities'
import { useGenerateBulkPayroll } from '../hooks/useBulkPayrollMutations'
import { getMonthYearFromPeriod } from '../lib/payrollPeriodFormat'
import type { PayrollPeriod } from '../../../api/types/payrollPeriod'
import type { GenerateBulkMissingQuantitiesError } from '../../../api/types/payslip'
import type { Employee } from '../../../api/types/employee'
import type { NormalizedApiError } from '../../../api/client'

interface PayrollPeriodQuantitiesSectionProps {
  period: PayrollPeriod
}

type QuantityState = Record<number, Record<number, string>>

/**
 * Task 15b - "Isi Data Periode" (Hari Kerja/Jumlah Resi dst) + tombol
 * Generate, MENGGANTIKAN rencana lama task-15-instruksi.md yang sudah
 * outdated (instruksi E.2). Cuma tampil selagi period.status === 'Draft' -
 * begitu disubmit, "Jumlah" dianggap final (backend PayrollPeriodQuantityController
 * juga nge-block PUT selain Draft, guard di SINI murni UX, bukan
 * satu-satunya lapisan).
 *
 * Kolom TIDAK fixed - 1 kolom per komponen scheduled_variable aktif
 * yang resolve buat MINIMAL 1 karyawan di cabang ini (kolom yang gak
 * relevan buat siapapun di cabang ini disembunyikan, bukan nampilin
 * kolom penuh tanda "-"). Sel TETAP "-" (bukan input) buat pasangan
 * (karyawan, komponen) yang gak resolve - gak ada quantity yang perlu
 * diisi buat kombinasi itu sama sekali.
 */
export function PayrollPeriodQuantitiesSection({ period }: PayrollPeriodQuantitiesSectionProps) {
  const { data: allComponents } = useSalaryComponents()
  const scheduledComponents = (allComponents ?? []).filter((c) => c.category === 'scheduled_variable' && c.is_active)
  const scheduledComponentIds = scheduledComponents.map((c) => c.id)

  const { data: allActiveEmployees } = usePayrollPeriodActiveEmployees()
  const officeEmployees = (allActiveEmployees ?? []).filter((e) => e.office_location_id === period.office_location_id)
  const officeEmployeeIds = officeEmployees.map((e) => e.id)

  const { data: resolution, isLoading: isLoadingResolution } = useScheduledComponentResolution(
    scheduledComponentIds,
    officeEmployeeIds
  )
  const { data: existingQuantities, isLoading: isLoadingQuantities } = usePayrollPeriodQuantities(period.id)
  const updateMutation = useUpdatePayrollPeriodQuantities(period.id)
  const generateMutation = useGenerateBulkPayroll(period.id)

  const [values, setValues] = useState<QuantityState>({})
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)
  const [missingQuantities, setMissingQuantities] = useState<GenerateBulkMissingQuantitiesError['missing_quantities'] | null>(null)

  useEffect(() => {
    if (!existingQuantities) return
    const initial: QuantityState = {}
    for (const row of existingQuantities) {
      initial[row.employee_id] ??= {}
      initial[row.employee_id][row.salary_component_id] = row.quantity
    }
    setValues(initial)
  }, [existingQuantities])

  function resolves(employeeId: number, componentId: number): boolean {
    if (!resolution) return false
    const employee = officeEmployees.find((e) => e.id === employeeId)
    const overrideAmount = resolution.overrideMap[employeeId]?.[componentId]
    const positionAmount = employee ? resolution.positionRateMap[employee.position_id]?.[componentId] : undefined
    return overrideAmount !== undefined || positionAmount !== undefined
  }

  const relevantComponents = scheduledComponents.filter((c) => officeEmployeeIds.some((eid) => resolves(eid, c.id)))
  const relevantEmployees = officeEmployees.filter((e) => relevantComponents.some((c) => resolves(e.id, c.id)))

  function handleValueChange(employeeId: number, componentId: number, value: string) {
    setValues((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], [componentId]: value },
    }))
  }

  async function handleSaveQuantities() {
    const quantities: Array<{ employee_id: number; salary_component_id: number; quantity: number }> = []

    for (const employee of relevantEmployees) {
      for (const component of relevantComponents) {
        if (!resolves(employee.id, component.id)) continue
        const raw = values[employee.id]?.[component.id]
        if (raw === undefined || raw === '') continue
        const num = Number(raw)
        if (Number.isNaN(num) || num < 0) continue
        quantities.push({ employee_id: employee.id, salary_component_id: component.id, quantity: num })
      }
    }

    if (quantities.length === 0) {
      setToast({ variant: 'error', message: 'Belum ada Jumlah yang diisi.' })
      return
    }

    try {
      await updateMutation.mutateAsync({ quantities })
      setToast({ variant: 'success', message: `${quantities.length} baris Jumlah berhasil disimpan.` })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    }
  }

  async function handleGenerate() {
    setMissingQuantities(null)
    const { month, year } = getMonthYearFromPeriod(period.period_start)

    try {
      const result = await generateMutation.mutateAsync({ month, year })
      const otherPeriods = result.periods.filter((p) => p.id !== period.id)
      const extra = otherPeriods.length > 0 ? ` Periode cabang lain di bulan yang sama ikut digenerate (${otherPeriods.map((p) => p.period_code).join(', ')}).` : ''
      setToast({
        variant: 'success',
        message: `${result.total_created} payslip dibuat, ${result.total_skipped} dilewati (sudah ada/tidak punya komponen apapun).${extra}`,
      })
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.status === 422 && apiError.details && 'missing_quantities' in apiError.details) {
        setMissingQuantities((apiError.details as unknown as GenerateBulkMissingQuantitiesError).missing_quantities)
      } else {
        setToast({ variant: 'error', message: apiError.message })
      }
    }
  }

  if (period.status !== 'Draft') return null

  const isLoading = isLoadingResolution || isLoadingQuantities

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label as="p">Isi Data Periode</Label>
        <PermissionGate code="payroll.generate-bulk">
          <div className="flex gap-2">
            {/* variant='secondary' gak type-safe dipasangin loading (Button.tsx
                Langkah 5 - cuma primary+loading yang punya bukti visual
                Figma) - disabled aja selagi pending, konsisten batasan itu. */}
            <Button size="small" variant="secondary" onClick={handleSaveQuantities} disabled={updateMutation.isPending}>
              Simpan Jumlah
            </Button>
            {generateMutation.isPending ? (
              <Button size="small" loading onClick={handleGenerate}>
                Generate
              </Button>
            ) : (
              <Button size="small" onClick={handleGenerate}>
                Generate
              </Button>
            )}
          </div>
        </PermissionGate>
      </div>

      <p className="mt-1 font-body text-sm text-neutral-600">
        Isi Jumlah (Hari Kerja/Jumlah Resi dst) per karyawan untuk komponen Variabel Terjadwal sebelum Generate. Komponen
        yang tidak berlaku untuk karyawan tertentu (jabatannya belum diatur) ditandai "—", tidak perlu diisi.
      </p>

      {missingQuantities && missingQuantities.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-status-rejected bg-status-rejected/5 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} strokeWidth={2} className="shrink-0 text-status-rejected" />
            <p className="font-body text-sm font-medium text-neutral-900">
              Generate gagal - {missingQuantities.length} kombinasi Jumlah belum diisi:
            </p>
          </div>
          <ul className="ml-6 list-disc font-body text-sm text-neutral-900">
            {missingQuantities.map((m, i) => (
              <li key={i}>
                {m.employee_name} - {m.salary_component_name} ({m.period_code})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <Table<Employee>
          isLoading={isLoading}
          data={relevantEmployees}
          rowKey={(row) => row.id}
          emptyMessage="Tidak ada karyawan dengan komponen Variabel Terjadwal yang berlaku di cabang ini."
          columns={[
            { key: 'employee', header: 'Karyawan', render: (row) => row.full_name },
            ...relevantComponents.map((component) => ({
              key: `component-${component.id}`,
              header: component.name,
              align: 'right' as const,
              render: (row: Employee) =>
                resolves(row.id, component.id) ? (
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    aria-label={`Jumlah ${component.name} untuk ${row.full_name}`}
                    value={values[row.id]?.[component.id] ?? ''}
                    onChange={(e) => handleValueChange(row.id, component.id, e.target.value)}
                    className="w-24 rounded-sm border border-neutral-200 px-2 py-1 text-right font-mono text-sm text-neutral-900 focus:outline-none focus:border-2 focus:border-primary-600"
                  />
                ) : (
                  <span className="text-neutral-400">—</span>
                ),
            })),
          ]}
        />
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </Card>
  )
}
