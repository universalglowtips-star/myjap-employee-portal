import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { DepartmentFormModal } from '../components/DepartmentFormModal'
import { useDepartments } from '../hooks/useDepartments'
import { useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '../hooks/useDepartmentMutations'
import type { Department, DepartmentCreateRequest } from '../../../api/types/department'
import type { NormalizedApiError } from '../../../api/client'

export function DepartmentListPage() {
  // Gate query BARENGAN permission - user tanpa department.view gak
  // perlu nge-fire GET /departments sama sekali (bukan cuma nyembunyiin
  // hasilnya di UI doang).
  const canView = usePermission('department.view')
  const { data: departments, isLoading, isError, error } = useDepartments(canView)
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()

  const [formOpen, setFormOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | undefined>(undefined)
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  function openCreateForm() {
    setEditingDepartment(undefined)
    setFormOpen(true)
  }

  function openEditForm(department: Department) {
    setEditingDepartment(department)
    setFormOpen(true)
  }

  async function handleFormSubmit(payload: DepartmentCreateRequest) {
    try {
      if (editingDepartment) {
        await updateMutation.mutateAsync({ id: editingDepartment.id, payload })
        setToast({ variant: 'success', message: 'Departemen berhasil diperbarui.' })
      } else {
        await createMutation.mutateAsync(payload)
        setToast({ variant: 'success', message: 'Departemen berhasil ditambahkan.' })
      }
      setFormOpen(false)
    } catch (err) {
      const apiError = err as NormalizedApiError
      // fieldErrors (422) sudah ditangani di dalam DepartmentFormModal sendiri (setError per-field) -
      // di sini cuma tangkep error NON-validasi (403/500/network) buat ditampilin sebagai Toast.
      if (!apiError.fieldErrors) {
        setToast({ variant: 'error', message: apiError.message })
      }
      throw err // biar DepartmentFormModal tetap tau submit gagal (form gak ke-reset/close)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingDepartment) return
    try {
      await deleteMutation.mutateAsync(deletingDepartment.id)
      setToast({ variant: 'success', message: 'Departemen berhasil dihapus.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setDeletingDepartment(null)
    }
  }

  return (
    <AppShell
      title="Departemen"
      actions={
        <PermissionGate code="department.create">
          <Button onClick={openCreateForm}>
            <Plus size={16} strokeWidth={2} />
            Tambah Departemen
          </Button>
        </PermissionGate>
      }
    >
      <PermissionGate
        code="department.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">
              Kamu tidak memiliki akses untuk melihat data departemen.
            </p>
          </div>
        }
      >
        {isError ? (
          // Error (403/network/500) TIDAK boleh nyamar jadi "Belum ada
          // departemen" - itu 2 kondisi yang beda total. 403 dibedain
          // pesannya dari error lain, tapi keduanya sama-sama BUKAN
          // Table's empty state.
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {error?.status === 403
                ? 'Kamu tidak memiliki akses untuk melihat data departemen.'
                : 'Data departemen belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : (
          <Table<Department>
            isLoading={isLoading}
            data={departments ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada departemen."
            columns={[
              { key: 'code', header: 'Kode', mono: true, render: (row) => row.department_code },
              { key: 'name', header: 'Nama Departemen', render: (row) => row.department_name },
              { key: 'description', header: 'Deskripsi', render: (row) => row.description ?? '—' },
              {
                key: 'status',
                header: 'Status',
                // is_active itu boolean sederhana, BUKAN status workflow (Draft/Submitted/dst) -
                // StatusBadge sengaja TIDAK dipaksa dipakai di sini, itu didesain khusus 6 status backend tertentu.
                render: (row) => (
                  <span className={row.is_active ? 'text-status-approved' : 'text-neutral-600'}>
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
                    <PermissionGate code="department.update">
                      <button
                        type="button"
                        onClick={() => openEditForm(row)}
                        aria-label={`Edit ${row.department_name}`}
                        className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    </PermissionGate>
                    <PermissionGate code="department.delete">
                      <button
                        type="button"
                        onClick={() => setDeletingDepartment(row)}
                        aria-label={`Hapus ${row.department_name}`}
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

      <DepartmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        department={editingDepartment}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingDepartment}
        onCancel={() => setDeletingDepartment(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Departemen"
        description={`Yakin mau hapus "${deletingDepartment?.department_name}"? Tindakan ini tidak bisa dibatalkan.`}
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
