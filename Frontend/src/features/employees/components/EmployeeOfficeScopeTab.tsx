import { useState } from 'react'
import { X, Lock, AlertTriangle } from 'lucide-react'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Select } from '../../../components/ui/Select'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { useOfficeLocations } from '../../master-data/hooks/useOfficeLocations'
import {
  useEmployeeOfficeScopes,
  useCreateEmployeeOfficeScope,
  useDeleteEmployeeOfficeScope,
} from '../hooks/useEmployeeOfficeScopes'
import type { NormalizedApiError } from '../../../api/client'

interface EmployeeOfficeScopeTabProps {
  employeeId: number
}

/**
 * Pola "Live List" (BUKAN form-simpan-sekali kayak Tab Pengecualian
 * Lokasi Absensi/Task 8d) - tiap aksi (tambah/hapus 1 cabang) langsung
 * POST/DELETE ke API seketika itu juga (dikonfirmasi dari desain
 * endpoint: index/store/destroy per-cabang, bukan show/update upsert),
 * bukan dikumpulin dulu ke form state lalu disimpan sekali. Gak ada
 * field tanggal/alasan sama sekali - kolom-nya emang cuma employee_id/
 * office_location_id/granted_by (lihat investigasi Task 8e).
 *
 * Cuma 1 permission (employee.update) buat index/store/destroy
 * SEKALIGUS (dikonfirmasi dari routes/api.php) - beda dari Task 8d yang
 * punya split .view/.update. Gak ada mode "read-only" di tab ini: kalau
 * PermissionGate lolos, user otomatis bisa tambah & hapus juga.
 */
export function EmployeeOfficeScopeTab({ employeeId }: EmployeeOfficeScopeTabProps) {
  const { data: scopes, isLoading, isError } = useEmployeeOfficeScopes(employeeId)
  const { data: officeLocations } = useOfficeLocations()
  const createMutation = useCreateEmployeeOfficeScope(employeeId)
  const deleteMutation = useDeleteEmployeeOfficeScope(employeeId)

  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)
  const [pendingAdd, setPendingAdd] = useState<{ id: number; name: string } | null>(null)
  const [pendingRemove, setPendingRemove] = useState<{ id: number; name: string } | null>(null)

  const grantedIds = new Set((scopes ?? []).map((s) => s.office_location_id))
  // Dropdown Tambah Cabang cuma nampilin cabang yang BELUM jadi wewenang -
  // mencegah secara struktural percobaan pilih cabang yang sudah ada
  // (409 dari backend jadi kasus race-condition murni, bukan alur normal).
  const availableOptions = (officeLocations ?? [])
    .filter((o) => !grantedIds.has(o.id))
    .map((o) => ({ value: String(o.id), label: o.office_name }))

  function handleSelectToAdd(officeLocationIdStr: string) {
    const office = (officeLocations ?? []).find((o) => String(o.id) === officeLocationIdStr)
    if (!office) return
    setPendingAdd({ id: office.id, name: office.office_name })
  }

  async function handleConfirmAdd() {
    if (!pendingAdd) return
    try {
      await createMutation.mutateAsync({ office_location_id: pendingAdd.id })
      setToast({ variant: 'success', message: `Wewenang cabang "${pendingAdd.name}" berhasil ditambahkan.` })
    } catch (err) {
      // 409 (cabang udah jadi wewenang, race condition) - message backend
      // SUDAH spesifik ("Karyawan ini sudah punya wewenang di cabang
      // tersebut."), ditampilkan apa adanya, BUKAN pesan generic.
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setPendingAdd(null)
    }
  }

  async function handleConfirmRemove() {
    if (!pendingRemove) return
    try {
      await deleteMutation.mutateAsync(pendingRemove.id)
      setToast({ variant: 'success', message: `Wewenang cabang "${pendingRemove.name}" berhasil dicabut.` })
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
          <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk melihat wewenang cabang.</p>
        </div>
      }
    >
      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
          <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
          <p className="font-body text-sm text-neutral-900">Data wewenang cabang gagal dimuat.</p>
        </div>
      ) : isLoading ? (
        <div className="rounded-md bg-white p-12 text-center shadow-sm">
          <p className="font-body text-sm text-neutral-600">Memuat data wewenang cabang...</p>
        </div>
      ) : (
        <div className="max-w-3xl rounded-md bg-white p-6 shadow-sm">
          <p className="mb-4 font-body text-sm text-neutral-600">
            Cabang tempat karyawan ini berwenang menyetujui proses payroll - bukan lokasi absensi.
          </p>

          {(scopes ?? []).length === 0 ? (
            <p className="mb-4 font-body text-sm text-neutral-600">
              Karyawan ini belum memiliki wewenang cabang apa pun.
            </p>
          ) : (
            <div className="mb-4 flex flex-wrap gap-2">
              {(scopes ?? []).map((scope) => (
                <span
                  key={scope.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 py-1.5 pl-3 pr-1.5 font-body text-sm text-neutral-900"
                >
                  {scope.office_location?.office_name ?? `Cabang #${scope.office_location_id}`}
                  <button
                    type="button"
                    onClick={() => setPendingRemove({ id: scope.office_location_id, name: scope.office_location?.office_name ?? `Cabang #${scope.office_location_id}` })}
                    aria-label={`Cabut wewenang ${scope.office_location?.office_name ?? `Cabang #${scope.office_location_id}`}`}
                    className="rounded-full p-0.5 text-neutral-600 hover:bg-neutral-200 hover:text-status-rejected"
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <label htmlFor="add_office_scope" className="font-body text-[13px] font-medium text-neutral-600">
              Tambah Cabang
            </label>
            <Select
              id="add_office_scope"
              className="py-2"
              value=""
              options={availableOptions}
              placeholder={availableOptions.length === 0 ? 'Semua cabang sudah diberi wewenang' : 'Pilih Cabang'}
              disabled={availableOptions.length === 0 || createMutation.isPending}
              onChange={(e) => handleSelectToAdd(e.target.value)}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingAdd}
        onCancel={() => setPendingAdd(null)}
        onConfirm={handleConfirmAdd}
        title="Tambah Wewenang Cabang"
        description={`Karyawan ini akan berwenang menyetujui payroll di cabang ${pendingAdd?.name}. Lanjutkan?`}
        confirmLabel="Ya, Tambahkan"
        isConfirming={createMutation.isPending}
      />

      <ConfirmDialog
        open={!!pendingRemove}
        onCancel={() => setPendingRemove(null)}
        onConfirm={handleConfirmRemove}
        title="Cabut Wewenang Cabang"
        description={`Wewenang karyawan ini di cabang ${pendingRemove?.name} akan dicabut. Lanjutkan?`}
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
