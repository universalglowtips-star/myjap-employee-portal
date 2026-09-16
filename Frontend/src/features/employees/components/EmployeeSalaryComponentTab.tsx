import { useState } from 'react'
import { Trash2, Lock, AlertTriangle } from 'lucide-react'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Select } from '../../../components/ui/Select'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Button } from '../../../components/ui/Button'
import { Table } from '../../../components/ui/Table'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useEmployee } from '../hooks/useEmployee'
import { useSalaryComponents } from '../../master-data/hooks/useSalaryComponents'
import { usePositionRatesForComponents } from '../../master-data/hooks/usePositionRatesForComponents'
import {
  useEmployeeSalaryComponents,
  useCreateEmployeeSalaryComponent,
  useDeleteEmployeeSalaryComponent,
} from '../hooks/useEmployeeSalaryComponents'
import type { SalaryComponent } from '../../../api/types/salaryComponent'
import type { NormalizedApiError } from '../../../api/client'

interface EmployeeSalaryComponentTabProps {
  employeeId: number
}

interface RowData {
  component: SalaryComponent
  positionDefault: string | null
  override: string | null
}

/**
 * Task 15b - override nominal/tarif komponen gaji per karyawan
 * (employee_salary_components), tampilkan default jabatan sebagai
 * REFERENSI (instruksi E.1). Komponen BASIC (Gaji Pokok) dan kategori
 * situational SENGAJA dikeluarkan dari daftar - BASIC selalu pakai
 * employees.basic_salary langsung (override di sini gak akan pernah
 * kepakai, resolveComponentRate() backend hardcode skip tabel ini
 * buat kode BASIC), situational gak punya konsep default/override
 * tersimpan sama sekali (ditambah manual per payslip, bukan di sini).
 *
 * Live-list, pola sama EmployeeOfficeScopeTab, ditambah 1 kolom
 * referensi (Default Jabatan) yang read-only murni.
 */
export function EmployeeSalaryComponentTab({ employeeId }: EmployeeSalaryComponentTabProps) {
  const { data: employee } = useEmployee(employeeId)
  const positionId = employee?.position_id

  const { data: allComponents, isLoading: isLoadingComponents, isError: isErrorComponents } = useSalaryComponents()

  // Komponen yang BISA di-override - selain BASIC (selalu basic_salary
  // langsung) dan situational (gak ada default/override tersimpan).
  const eligibleComponents = (allComponents ?? []).filter((c) => c.code !== 'BASIC' && c.category !== 'situational')
  const eligibleComponentIds = eligibleComponents.map((c) => c.id)

  // TIDAK ADA endpoint "GET /positions/{id}/salary-components" (backend
  // cuma punya arah component->positions, keputusan D.1) - diambil
  // lintas SEMUA komponen eligible lalu difilter ke position_id
  // karyawan ini CLIENT-SIDE di bawah (lihat usePositionRatesForComponents).
  const { data: allPositionRates } = usePositionRatesForComponents(eligibleComponentIds)
  const { data: overrides, isLoading: isLoadingOverrides, isError: isErrorOverrides } = useEmployeeSalaryComponents(employeeId)
  const createMutation = useCreateEmployeeSalaryComponent(employeeId)
  const deleteMutation = useDeleteEmployeeSalaryComponent(employeeId)

  const [selectedComponentId, setSelectedComponentId] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [pendingAdd, setPendingAdd] = useState<{ componentId: number; componentName: string; amount: number } | null>(null)
  const [pendingRemove, setPendingRemove] = useState<{ componentId: number; componentName: string } | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  const isLoading = isLoadingComponents || isLoadingOverrides
  const isError = isErrorComponents || isErrorOverrides

  const positionRates = (allPositionRates ?? []).filter((r) => r.position_id === positionId)
  const positionDefaultMap = new Map(positionRates.map((r) => [r.salary_component_id, r.amount]))
  const overrideMap = new Map((overrides ?? []).map((o) => [o.salary_component_id, o]))

  const rows: RowData[] = eligibleComponents.map((component) => ({
    component,
    positionDefault: positionDefaultMap.get(component.id) ?? null,
    override: overrideMap.get(component.id)?.amount ?? null,
  }))

  const overriddenIds = new Set(overrideMap.keys())
  const availableOptions = eligibleComponents
    .filter((c) => !overriddenIds.has(c.id))
    .map((c) => ({ value: String(c.id), label: c.name }))

  function handleOpenAddConfirm() {
    const component = eligibleComponents.find((c) => String(c.id) === selectedComponentId)
    const amount = Number(amountInput)
    if (!component || Number.isNaN(amount) || amount < 0) return
    setPendingAdd({ componentId: component.id, componentName: component.name, amount })
  }

  async function handleConfirmAdd() {
    if (!pendingAdd) return
    try {
      await createMutation.mutateAsync({ salary_component_id: pendingAdd.componentId, amount: pendingAdd.amount })
      setToast({ variant: 'success', message: `Override "${pendingAdd.componentName}" berhasil disimpan.` })
      setSelectedComponentId('')
      setAmountInput('')
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setPendingAdd(null)
    }
  }

  async function handleConfirmRemove() {
    if (!pendingRemove) return
    try {
      await deleteMutation.mutateAsync(pendingRemove.componentId)
      setToast({ variant: 'success', message: `Override "${pendingRemove.componentName}" berhasil dicabut, karyawan kembali ikut default jabatan.` })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setPendingRemove(null)
    }
  }

  return (
    <PermissionGate
      code="employee.update"
      fallback={
        <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
          <Lock size={24} strokeWidth={2} className="text-neutral-400" />
          <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk melihat komponen gaji karyawan ini.</p>
        </div>
      }
    >
      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
          <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
          <p className="font-body text-sm text-neutral-900">Data komponen gaji karyawan gagal dimuat.</p>
        </div>
      ) : (
        <div className="rounded-md bg-white p-6 shadow-sm">
          <p className="mb-4 font-body text-sm text-neutral-600">
            Gaji Pokok TIDAK ada di daftar ini - diatur langsung lewat field "Gaji Pokok" di form Edit Karyawan. Komponen
            Situasional (bonus dadakan dst) TIDAK ada default/override - ditambahkan manual per slip gaji setelah payroll
            digenerate.
          </p>

          <Table<RowData>
            isLoading={isLoading}
            data={rows}
            rowKey={(row) => row.component.id}
            emptyMessage="Belum ada komponen gaji fixed/scheduled_variable yang aktif."
            columns={[
              { key: 'name', header: 'Komponen', render: (row) => row.component.name },
              {
                key: 'category',
                header: 'Kategori',
                render: (row) => (row.component.category === 'scheduled_variable' ? 'Variabel Terjadwal' : 'Tetap'),
              },
              {
                key: 'position_default',
                header: 'Default Jabatan',
                align: 'right',
                mono: true,
                render: (row) => (row.positionDefault === null ? '—' : formatCurrency(row.positionDefault)),
              },
              {
                key: 'override',
                header: 'Override Karyawan',
                align: 'right',
                mono: true,
                render: (row) => (row.override === null ? '—' : formatCurrency(row.override)),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) =>
                  row.override === null ? null : (
                    <button
                      type="button"
                      onClick={() => setPendingRemove({ componentId: row.component.id, componentName: row.component.name })}
                      aria-label={`Cabut override ${row.component.name}`}
                      className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-status-rejected"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  ),
              },
            ]}
          />

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-neutral-200 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add_override_component">Komponen</Label>
              <Select
                id="add_override_component"
                className="py-2"
                value={selectedComponentId}
                options={availableOptions}
                placeholder={availableOptions.length === 0 ? 'Semua komponen sudah di-override' : 'Pilih Komponen'}
                disabled={availableOptions.length === 0}
                onChange={(e) => setSelectedComponentId(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add_override_amount">Jumlah Override (Rp)</Label>
              <Input
                id="add_override_amount"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                className="w-40 py-2"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleOpenAddConfirm}
              disabled={!selectedComponentId || amountInput === '' || createMutation.isPending}
            >
              Tambah Override
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingAdd}
        onCancel={() => setPendingAdd(null)}
        onConfirm={handleConfirmAdd}
        title="Tambah Override Komponen Gaji"
        description={pendingAdd ? `Karyawan ini akan dapat ${formatCurrency(pendingAdd.amount)} untuk "${pendingAdd.componentName}", menggantikan default jabatannya. Lanjutkan?` : ''}
        confirmLabel="Ya, Simpan"
        isConfirming={createMutation.isPending}
      />

      <ConfirmDialog
        open={!!pendingRemove}
        onCancel={() => setPendingRemove(null)}
        onConfirm={handleConfirmRemove}
        title="Cabut Override"
        description={`Override "${pendingRemove?.componentName}" akan dicabut, karyawan ini kembali ikut default jabatannya (atau tidak dapat komponen ini sama sekali kalau jabatannya juga belum diatur). Lanjutkan?`}
        variant="danger"
        confirmLabel="Ya, Cabut"
        isConfirming={deleteMutation.isPending}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </PermissionGate>
  )
}
