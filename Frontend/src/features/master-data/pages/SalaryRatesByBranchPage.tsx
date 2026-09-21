import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Card } from '../../../components/ui/Card'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import { Table } from '../../../components/ui/Table'
import { Toast } from '../../../components/ui/Toast'
import { cn } from '../../../lib/cn'
import { useOfficeLocationsForFilter } from '../../attendance/hooks/useOfficeLocationsForFilter'
import { useOfficeLocationSalaryRates, useUpdateOfficeLocationSalaryRates } from '../hooks/useOfficeLocationSalaryRates'
import type { OfficeLocationSalaryRateEmployee } from '../../../api/types/officeLocationSalaryRate'
import type { NormalizedApiError } from '../../../api/client'

/** key: `${employee_id}:${salary_component_id}` */
type EditedRates = Record<string, string>
type EditedBasicSalaries = Record<number, string>

/**
 * Task 16 - "Atur Tarif per Cabang". HRD pilih 1 cabang, langsung dapat
 * tabel karyawan x komponen gaji relevan cabang itu, edit banyak sel
 * sekaligus, Simpan 1x (batch, 1 request - endpoint BARU
 * OfficeLocationSalaryRateController, TIDAK ada tabel baru, murni cara
 * cepat mengisi employee_salary_components/employees.basic_salary yang
 * sudah ada sejak Task 15b).
 *
 * "Tahap Setup" - terpisah TOTAL dari "Isi Data Periode" bulanan
 * (PayrollPeriodQuantitiesSection). Halaman ini TIDAK menyentuh Jumlah
 * Hari Kerja/Jumlah Resi sama sekali.
 *
 * Sel komponen yang TIDAK applicable (jabatan karyawan belum diatur DAN
 * gak ada override individual) ditandai "—" (BUKAN input) - sengaja
 * gak bisa diisi langsung dari grid ini, biar HRD gak salah kasih
 * komponen ke jabatan yang gak berhak (mis. Bonus DLV ke Leader). Kasus
 * pengecualian di luar itu tetap lewat halaman Detail Karyawan
 * (EmployeeSalaryComponentTab) yang sudah ada, bukan di sini.
 *
 * Kolom "Jabatan" DITAMBAHKAN di luar daftar kolom eksplisit di
 * instruksi - HRD butuh konteks itu buat ngerti KENAPA suatu sel "—"
 * (jabatannya belum diatur), pola sama "gap di luar spek dilaporkan"
 * seperti kolom Tipe di SalaryComponentListPage.
 */
export function SalaryRatesByBranchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const officeLocationId = searchParams.get('office_location_id') ? Number(searchParams.get('office_location_id')) : null

  const canEdit = usePermission('employee.update')

  const { data: officeLocations, isError: isOfficeLocationsError } = useOfficeLocationsForFilter()
  const { data, isLoading, isError } = useOfficeLocationSalaryRates(canEdit ? officeLocationId : null)
  const updateMutation = useUpdateOfficeLocationSalaryRates(officeLocationId)

  const [editedRates, setEditedRates] = useState<EditedRates>({})
  const [editedBasicSalaries, setEditedBasicSalaries] = useState<EditedBasicSalaries>({})
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  // Ganti cabang -> buang draft edit lama, jangan sampai kebawa nyangkut ke cabang lain.
  useEffect(() => {
    setEditedRates({})
    setEditedBasicSalaries({})
  }, [officeLocationId])

  function handleOfficeChange(value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set('office_location_id', value)
      else next.delete('office_location_id')
      return next
    })
  }

  function rateKey(employeeId: number, componentId: number): string {
    return `${employeeId}:${componentId}`
  }

  async function handleSave() {
    if (!data) return

    const rates: Array<{ employee_id: number; salary_component_id: number; amount: number | null }> = []
    for (const [key, raw] of Object.entries(editedRates)) {
      const [employeeIdStr, componentIdStr] = key.split(':')
      if (raw === '') {
        rates.push({ employee_id: Number(employeeIdStr), salary_component_id: Number(componentIdStr), amount: null })
        continue
      }
      const num = Number(raw)
      if (Number.isNaN(num) || num < 0) continue
      rates.push({ employee_id: Number(employeeIdStr), salary_component_id: Number(componentIdStr), amount: num })
    }

    const basicSalaries: Array<{ employee_id: number; amount: number }> = []
    for (const [employeeIdStr, raw] of Object.entries(editedBasicSalaries)) {
      if (raw === '') continue // Gaji Pokok gak punya konsep "kosongkan -> fallback default", diam-diam dilewati (bukan error) - konsisten pola PayrollPeriodQuantitiesSection.
      const num = Number(raw)
      if (Number.isNaN(num) || num < 0) continue
      basicSalaries.push({ employee_id: Number(employeeIdStr), amount: num })
    }

    if (rates.length === 0 && basicSalaries.length === 0) {
      setToast({ variant: 'error', message: 'Belum ada perubahan tarif yang diisi.' })
      return
    }

    try {
      await updateMutation.mutateAsync({
        ...(rates.length > 0 ? { rates } : {}),
        ...(basicSalaries.length > 0 ? { basic_salaries: basicSalaries } : {}),
      })
      setEditedRates({})
      setEditedBasicSalaries({})
      setToast({ variant: 'success', message: 'Tarif komponen gaji berhasil disimpan.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    }
  }

  const officeOptions = [
    { value: '', label: 'Pilih Cabang' },
    ...(officeLocations ?? []).map((o) => ({ value: String(o.id), label: o.office_name })),
  ]

  const components = data?.components ?? []
  const employees = data?.employees ?? []
  const hasUnsavedChanges = Object.keys(editedRates).length > 0 || Object.keys(editedBasicSalaries).length > 0

  return (
    <AppShell title="Atur Tarif per Cabang">
      <PermissionGate
        code="employee.update"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk mengatur tarif komponen gaji.</p>
          </div>
        }
      >
        <Card className="mb-4">
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="filter-office-location">Cabang</Label>
            <Select
              id="filter-office-location"
              options={officeOptions}
              disabled={isOfficeLocationsError}
              value={officeLocationId !== null ? String(officeLocationId) : ''}
              onChange={(e) => handleOfficeChange(e.target.value)}
            />
            {isOfficeLocationsError && <p className="font-body text-xs text-status-rejected">Gagal memuat daftar cabang.</p>}
          </div>
          <p className="mt-3 font-body text-sm text-neutral-600">
            Pilih cabang untuk mengatur tarif Gaji Pokok, Uang Harian, Bonus DLV, dan komponen lain per karyawan. Sel yang
            ditandai "—" berarti komponen itu tidak berlaku untuk jabatan karyawan tersebut. Kosongkan sel yang sudah
            terisi untuk mengembalikannya ke default jabatan.
          </p>
        </Card>

        {officeLocationId === null ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <p className="font-body text-sm text-neutral-600">Pilih cabang dulu untuk menampilkan tabel tarif.</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">Data tarif komponen gaji belum dapat dimuat. Coba lagi.</p>
          </div>
        ) : (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label as="p">{data?.office_location.office_name ?? 'Tarif Komponen Gaji'}</Label>
              {updateMutation.isPending ? (
                <Button size="small" loading onClick={handleSave}>
                  Simpan
                </Button>
              ) : (
                <Button size="small" onClick={handleSave} disabled={!hasUnsavedChanges}>
                  Simpan
                </Button>
              )}
            </div>

            <div className="mt-3">
              <Table<OfficeLocationSalaryRateEmployee>
                isLoading={isLoading}
                data={employees}
                rowKey={(row) => row.id}
                emptyMessage="Belum ada karyawan aktif di cabang ini."
                columns={[
                  { key: 'employee', header: 'Karyawan', render: (row) => row.full_name },
                  { key: 'position', header: 'Jabatan', render: (row) => row.position_name ?? '—' },
                  {
                    key: 'basic_salary',
                    header: 'Gaji Pokok',
                    align: 'right',
                    render: (row) => (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        aria-label={`Gaji Pokok untuk ${row.full_name}`}
                        value={editedBasicSalaries[row.id] ?? row.basic_salary}
                        onChange={(e) =>
                          setEditedBasicSalaries((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        className="w-36 rounded-sm border border-neutral-200 px-2 py-1 text-right font-mono text-sm text-neutral-900 focus:outline-none focus:border-2 focus:border-primary-600"
                      />
                    ),
                  },
                  ...components.map((component) => ({
                    key: `component-${component.id}`,
                    header: component.name,
                    align: 'right' as const,
                    render: (row: OfficeLocationSalaryRateEmployee) => {
                      const cell = row.rates[component.id]
                      if (!cell || !cell.applicable) {
                        return <span className="text-neutral-400">—</span>
                      }
                      const key = rateKey(row.id, component.id)
                      const value = editedRates[key] ?? cell.amount ?? ''
                      return (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          aria-label={`${component.name} untuk ${row.full_name}`}
                          title={cell.is_override ? 'Override individual' : 'Default jabatan'}
                          value={value}
                          onChange={(e) => setEditedRates((prev) => ({ ...prev, [key]: e.target.value }))}
                          className={cn(
                            'w-28 rounded-sm border px-2 py-1 text-right font-mono text-sm text-neutral-900 focus:outline-none focus:border-2 focus:border-primary-600',
                            cell.is_override ? 'border-primary-300 bg-primary-50' : 'border-neutral-200'
                          )}
                        />
                      )
                    },
                  })),
                ]}
              />
            </div>
          </Card>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 w-80">
            <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
          </div>
        )}
      </PermissionGate>
    </AppShell>
  )
}
