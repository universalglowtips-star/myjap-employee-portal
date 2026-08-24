import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { formatCurrency } from '../../../lib/formatCurrency'
import { PositionFormModal } from '../components/PositionFormModal'
import { usePositions } from '../hooks/usePositions'
import { useCreatePosition, useUpdatePosition, useDeletePosition } from '../hooks/usePositionMutations'
import { useDepartments } from '../hooks/useDepartments'
import type { Position, PositionCreateRequest } from '../../../api/types/position'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Struktur & pola SAMA PERSIS DepartmentListPage.tsx (Tugas 1 reference
 * pattern) - beda cuma field/permission-code/endpoint. Dikonfirmasi
 * sebelum coding (bukan asumsi): field asli dari migration+model+
 * controller (position_code, position_name, department_id, allowance,
 * description, is_active), permission module 'position' di
 * PermissionSeeder.php -> position.view/create/update/delete persis.
 */
export function PositionListPage() {
  // Gate query BARENGAN permission - user tanpa position.view gak
  // perlu nge-fire GET /positions sama sekali (bukan cuma nyembunyiin
  // hasilnya di UI doang).
  const canView = usePermission('position.view')
  const { data: positions, isLoading, isError, error } = usePositions(canView)
  const createMutation = useCreatePosition()
  const updateMutation = useUpdatePosition()
  const deleteMutation = useDeletePosition()

  // Departemen buat dropdown Modal - di-fetch di sini (BUKAN di dalam
  // Modal) karena Modal selalu ke-mount walau `open=false` (Modal.tsx
  // return null internal, bukan unmount lewat parent), jadi fetch di
  // level Page lebih predictable. TIDAK di-gate department.view - user
  // yang punya position.create/update belum tentu juga punya
  // department.view (2 permission independen), dropdown tetap harus
  // jalan buat mereka. Kalau beneran 403, isDepartmentsError nangkep +
  // ditampilin ke Modal (bukan dibiarkan kosong tanpa keterangan).
  const { data: departments, isLoading: isDepartmentsLoading, isError: isDepartmentsError } = useDepartments()

  const [formOpen, setFormOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<Position | undefined>(undefined)
  const [deletingPosition, setDeletingPosition] = useState<Position | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  function openCreateForm() {
    setEditingPosition(undefined)
    setFormOpen(true)
  }

  function openEditForm(position: Position) {
    setEditingPosition(position)
    setFormOpen(true)
  }

  async function handleFormSubmit(payload: PositionCreateRequest) {
    try {
      if (editingPosition) {
        await updateMutation.mutateAsync({ id: editingPosition.id, payload })
        setToast({ variant: 'success', message: 'Posisi berhasil diperbarui.' })
      } else {
        await createMutation.mutateAsync(payload)
        setToast({ variant: 'success', message: 'Posisi berhasil ditambahkan.' })
      }
      setFormOpen(false)
    } catch (err) {
      const apiError = err as NormalizedApiError
      // fieldErrors (422) sudah ditangani di dalam PositionFormModal sendiri (setError per-field) -
      // di sini cuma tangkep error NON-validasi (403/500/network) buat ditampilin sebagai Toast.
      if (!apiError.fieldErrors) {
        setToast({ variant: 'error', message: apiError.message })
      }
      throw err // biar PositionFormModal tetap tau submit gagal (form gak ke-reset/close)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingPosition) return
    try {
      await deleteMutation.mutateAsync(deletingPosition.id)
      setToast({ variant: 'success', message: 'Posisi berhasil dihapus.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setDeletingPosition(null)
    }
  }

  return (
    <AppShell
      title="Posisi"
      actions={
        <PermissionGate code="position.create">
          <Button onClick={openCreateForm}>
            <Plus size={16} strokeWidth={2} />
            Tambah Posisi
          </Button>
        </PermissionGate>
      }
    >
      <PermissionGate
        code="position.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">
              Kamu tidak memiliki akses untuk melihat data posisi.
            </p>
          </div>
        }
      >
        {isError ? (
          // Error (403/network/500) TIDAK boleh nyamar jadi "Belum ada
          // posisi" - itu 2 kondisi yang beda total. 403 dibedain
          // pesannya dari error lain, tapi keduanya sama-sama BUKAN
          // Table's empty state.
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {error?.status === 403
                ? 'Kamu tidak memiliki akses untuk melihat data posisi.'
                : 'Data posisi belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : (
          <Table<Position>
            isLoading={isLoading}
            data={positions ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada posisi."
            columns={[
              { key: 'code', header: 'Kode Posisi', mono: true, render: (row) => row.position_code },
              { key: 'name', header: 'Nama Posisi', render: (row) => row.position_name },
              // Nama departemen dari relasi yang udah di-eager-load
              // backend (PositionController ->with('department')) -
              // BUKAN lookup manual dari list /departments terpisah.
              { key: 'department', header: 'Departemen', render: (row) => row.department?.department_name ?? '—' },
              {
                key: 'allowance',
                header: 'Tunjangan',
                align: 'right',
                mono: true,
                render: (row) => formatCurrency(row.allowance),
              },
              {
                key: 'status',
                header: 'Status',
                // Pola PERSIS Departemen (Tugas 1) - is_active boolean
                // sederhana, BUKAN status workflow, StatusBadge sengaja
                // TIDAK dipakai di sini.
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
                    <PermissionGate code="position.update">
                      <button
                        type="button"
                        onClick={() => openEditForm(row)}
                        aria-label={`Edit ${row.position_name}`}
                        className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    </PermissionGate>
                    <PermissionGate code="position.delete">
                      <button
                        type="button"
                        onClick={() => setDeletingPosition(row)}
                        aria-label={`Hapus ${row.position_name}`}
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

      <PositionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        position={editingPosition}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        departments={departments}
        isDepartmentsLoading={isDepartmentsLoading}
        isDepartmentsError={isDepartmentsError}
      />

      <ConfirmDialog
        open={!!deletingPosition}
        onCancel={() => setDeletingPosition(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Posisi"
        description={`Yakin mau hapus "${deletingPosition?.position_name}"? Tindakan ini tidak bisa dibatalkan.`}
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
