import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { WorkShiftFormModal } from '../components/WorkShiftFormModal'
import { useWorkShifts } from '../hooks/useWorkShifts'
import { useCreateWorkShift, useUpdateWorkShift, useDeleteWorkShift } from '../hooks/useWorkShiftMutations'
import type { WorkShift, WorkShiftCreateRequest } from '../../../api/types/workShift'
import type { NormalizedApiError } from '../../../api/client'

/** "HH:MM:SS" dari backend -> "HH:MM" buat ditampilkan di tabel (detik selalu ":00", gak perlu ditampilkan). */
function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : '—'
}

/**
 * Struktur & pola SAMA PERSIS DepartmentListPage.tsx/PositionListPage.tsx
 * (Tugas 1-2 reference pattern) - beda cuma field/permission-code/endpoint.
 * Modul permission 'work-shift' dikonfirmasi dari PermissionSeeder.php +
 * routes/api.php sebelum coding (bukan asumsi).
 */
export function WorkShiftListPage() {
  // Gate query BARENGAN permission - user tanpa work-shift.view gak
  // perlu nge-fire GET /work-shifts sama sekali (bukan cuma nyembunyiin
  // hasilnya di UI doang).
  const canView = usePermission('work-shift.view')
  const { data: workShifts, isLoading, isError, error } = useWorkShifts(canView)
  const createMutation = useCreateWorkShift()
  const updateMutation = useUpdateWorkShift()
  const deleteMutation = useDeleteWorkShift()

  const [formOpen, setFormOpen] = useState(false)
  const [editingWorkShift, setEditingWorkShift] = useState<WorkShift | undefined>(undefined)
  const [deletingWorkShift, setDeletingWorkShift] = useState<WorkShift | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  function openCreateForm() {
    setEditingWorkShift(undefined)
    setFormOpen(true)
  }

  function openEditForm(workShift: WorkShift) {
    setEditingWorkShift(workShift)
    setFormOpen(true)
  }

  async function handleFormSubmit(payload: WorkShiftCreateRequest) {
    try {
      if (editingWorkShift) {
        await updateMutation.mutateAsync({ id: editingWorkShift.id, payload })
        setToast({ variant: 'success', message: 'Shift kerja berhasil diperbarui.' })
      } else {
        await createMutation.mutateAsync(payload)
        setToast({ variant: 'success', message: 'Shift kerja berhasil ditambahkan.' })
      }
      setFormOpen(false)
    } catch (err) {
      const apiError = err as NormalizedApiError
      // fieldErrors (422) sudah ditangani di dalam WorkShiftFormModal sendiri (setError per-field) -
      // di sini cuma tangkep error NON-validasi (403/500/network) buat ditampilin sebagai Toast.
      if (!apiError.fieldErrors) {
        setToast({ variant: 'error', message: apiError.message })
      }
      throw err // biar WorkShiftFormModal tetap tau submit gagal (form gak ke-reset/close)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingWorkShift) return
    try {
      await deleteMutation.mutateAsync(deletingWorkShift.id)
      setToast({ variant: 'success', message: 'Shift kerja berhasil dihapus.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setDeletingWorkShift(null)
    }
  }

  return (
    <AppShell
      title="Shift Kerja"
      actions={
        <PermissionGate code="work-shift.create">
          <Button onClick={openCreateForm}>
            <Plus size={16} strokeWidth={2} />
            Tambah Shift Kerja
          </Button>
        </PermissionGate>
      }
    >
      <PermissionGate
        code="work-shift.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">
              Kamu tidak memiliki akses untuk melihat data shift kerja.
            </p>
          </div>
        }
      >
        {isError ? (
          // Error (403/network/500) TIDAK boleh nyamar jadi "Belum ada
          // shift kerja" - itu 2 kondisi yang beda total.
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {error?.status === 403
                ? 'Kamu tidak memiliki akses untuk melihat data shift kerja.'
                : 'Data shift kerja belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : (
          <Table<WorkShift>
            isLoading={isLoading}
            data={workShifts ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada shift kerja."
            columns={[
              { key: 'code', header: 'Kode Shift', mono: true, render: (row) => row.shift_code },
              { key: 'name', header: 'Nama Shift', render: (row) => row.shift_name },
              { key: 'check_in', header: 'Jam Masuk', mono: true, render: (row) => formatTime(row.check_in_time) },
              { key: 'check_out', header: 'Jam Pulang', mono: true, render: (row) => formatTime(row.check_out_time) },
              {
                key: 'late_tolerance',
                header: 'Toleransi Telat',
                align: 'right',
                mono: true,
                render: (row) => `${row.late_tolerance} menit`,
              },
              {
                key: 'status',
                header: 'Status',
                // is_active boolean sederhana, BUKAN status workflow - pola persis Departemen/Posisi/Role.
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
                    <PermissionGate code="work-shift.update">
                      <button
                        type="button"
                        onClick={() => openEditForm(row)}
                        aria-label={`Edit ${row.shift_name}`}
                        className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    </PermissionGate>
                    <PermissionGate code="work-shift.delete">
                      <button
                        type="button"
                        onClick={() => setDeletingWorkShift(row)}
                        aria-label={`Hapus ${row.shift_name}`}
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

      <WorkShiftFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        workShift={editingWorkShift}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingWorkShift}
        onCancel={() => setDeletingWorkShift(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Shift Kerja"
        description={`Yakin mau hapus "${deletingWorkShift?.shift_name}"? Tindakan ini tidak bisa dibatalkan.`}
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
