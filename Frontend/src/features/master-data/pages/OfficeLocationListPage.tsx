import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { OfficeLocationFormModal } from '../components/OfficeLocationFormModal'
import { useOfficeLocations } from '../hooks/useOfficeLocations'
import { useCreateOfficeLocation, useUpdateOfficeLocation, useDeleteOfficeLocation } from '../hooks/useOfficeLocationMutations'
import { useEmployeesForSupervisorSelection } from '../hooks/useEmployeesForSupervisorSelection'
import type { OfficeLocation, OfficeLocationCreateRequest } from '../../../api/types/officeLocation'
import type { NormalizedApiError } from '../../../api/client'

/** Gak ada field alamat teks terpisah di schema - koordinat dibulatkan 5 desimal buat kolom "ringkas" (cukup presisi ~1m, cukup pendek buat tabel). */
function formatCoordinate(officeLocation: OfficeLocation): string {
  const lat = Number(officeLocation.latitude).toFixed(5)
  const lng = Number(officeLocation.longitude).toFixed(5)
  return `${lat}, ${lng}`
}

/**
 * Struktur & pola SAMA PERSIS DepartmentListPage.tsx/PositionListPage.tsx/
 * WorkShiftListPage.tsx - beda cuma field/permission-code/endpoint, plus
 * daftar karyawan (buat Tab Supervisor di Modal) di-fetch di level Page
 * (pola sama Position/departments), gak digate permission office-location
 * sendiri (independen, employee.view punya gate-nya sendiri di dalam
 * Modal lewat isEmployeesError).
 */
export function OfficeLocationListPage() {
  // Gate query BARENGAN permission - user tanpa office-location.view gak
  // perlu nge-fire GET /office-locations sama sekali.
  const canView = usePermission('office-location.view')
  const { data: officeLocations, isLoading, isError, error } = useOfficeLocations(canView)
  const createMutation = useCreateOfficeLocation()
  const updateMutation = useUpdateOfficeLocation()
  const deleteMutation = useDeleteOfficeLocation()

  // Kandidat supervisor - di-fetch begitu halaman ini bisa diakses
  // (canView), dipakai Tab Supervisor di Modal Edit. Independen dari
  // office-location.view - kalau gagal (403 employee.view), isError
  // ditangkep & ditampilin KHUSUS di dalam Tab Supervisor (bukan bikin
  // seluruh halaman List gagal).
  const {
    data: employees,
    isLoading: isEmployeesLoading,
    isError: isEmployeesError,
  } = useEmployeesForSupervisorSelection(canView)

  const [formOpen, setFormOpen] = useState(false)
  const [editingOfficeLocation, setEditingOfficeLocation] = useState<OfficeLocation | undefined>(undefined)
  const [deletingOfficeLocation, setDeletingOfficeLocation] = useState<OfficeLocation | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  function openCreateForm() {
    setEditingOfficeLocation(undefined)
    setFormOpen(true)
  }

  function openEditForm(officeLocation: OfficeLocation) {
    setEditingOfficeLocation(officeLocation)
    setFormOpen(true)
  }

  async function handleFormSubmit(payload: OfficeLocationCreateRequest) {
    try {
      if (editingOfficeLocation) {
        await updateMutation.mutateAsync({ id: editingOfficeLocation.id, payload })
        setToast({ variant: 'success', message: 'Lokasi kantor berhasil diperbarui.' })
        setFormOpen(false)
      } else {
        await createMutation.mutateAsync(payload)
        // Hint tambahan - Modal Tambah gak punya Tab Supervisor sama
        // sekali (butuh id valid dulu), jadi user perlu tau harus buka
        // Edit buat assign supervisor, bukan bingung kenapa gak ada
        // tab itu pas nambah baru.
        setToast({
          variant: 'success',
          message: 'Lokasi berhasil dibuat. Buka Edit untuk assign Supervisor.',
        })
        setFormOpen(false)
      }
    } catch (err) {
      const apiError = err as NormalizedApiError
      // fieldErrors (422) sudah ditangani di dalam OfficeLocationFormModal sendiri (setError per-field) -
      // di sini cuma tangkep error NON-validasi (403/500/network) buat ditampilin sebagai Toast.
      if (!apiError.fieldErrors) {
        setToast({ variant: 'error', message: apiError.message })
      }
      throw err // biar OfficeLocationFormModal tetap tau submit gagal (form gak ke-reset/close)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingOfficeLocation) return
    try {
      await deleteMutation.mutateAsync(deletingOfficeLocation.id)
      setToast({ variant: 'success', message: 'Lokasi kantor berhasil dihapus.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setDeletingOfficeLocation(null)
    }
  }

  return (
    <AppShell
      title="Lokasi Kantor"
      actions={
        <PermissionGate code="office-location.create">
          <Button onClick={openCreateForm}>
            <Plus size={16} strokeWidth={2} />
            Tambah Lokasi Kantor
          </Button>
        </PermissionGate>
      }
    >
      <PermissionGate
        code="office-location.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">
              Kamu tidak memiliki akses untuk melihat data lokasi kantor.
            </p>
          </div>
        }
      >
        {isError ? (
          // Error (403/network/500) TIDAK boleh nyamar jadi "Belum ada
          // lokasi kantor" - itu 2 kondisi yang beda total.
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {error?.status === 403
                ? 'Kamu tidak memiliki akses untuk melihat data lokasi kantor.'
                : 'Data lokasi kantor belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : (
          <Table<OfficeLocation>
            isLoading={isLoading}
            data={officeLocations ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada lokasi kantor."
            columns={[
              { key: 'code', header: 'Kode', mono: true, render: (row) => row.office_code },
              { key: 'name', header: 'Nama Lokasi', render: (row) => row.office_name },
              { key: 'coordinate', header: 'Koordinat', mono: true, render: (row) => formatCoordinate(row) },
              {
                key: 'status',
                header: 'Status',
                // is_active boolean sederhana, BUKAN status workflow - pola persis Departemen/Posisi/Role/WorkShift.
                render: (row) => (
                  <span className={row.is_active ? 'text-status-approved' : 'text-neutral-400'}>
                    {row.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <div className="flex justify-end gap-1">
                    <PermissionGate code="office-location.update">
                      <button
                        type="button"
                        onClick={() => openEditForm(row)}
                        aria-label={`Edit ${row.office_name}`}
                        className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    </PermissionGate>
                    <PermissionGate code="office-location.delete">
                      <button
                        type="button"
                        onClick={() => setDeletingOfficeLocation(row)}
                        aria-label={`Hapus ${row.office_name}`}
                        className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-status-rejected"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </PermissionGate>
                  </div>
                ),
              },
            ]}
          />
        )}
      </PermissionGate>

      <OfficeLocationFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        officeLocation={editingOfficeLocation}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        employees={employees}
        isEmployeesLoading={isEmployeesLoading}
        isEmployeesError={isEmployeesError}
      />

      <ConfirmDialog
        open={!!deletingOfficeLocation}
        onCancel={() => setDeletingOfficeLocation(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Lokasi Kantor"
        description={`Yakin mau hapus "${deletingOfficeLocation?.office_name}"? Tindakan ini tidak bisa dibatalkan.`}
        variant="danger"
        isConfirming={deleteMutation.isPending}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </AppShell>
  )
}
