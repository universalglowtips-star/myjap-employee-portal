import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, AlertTriangle, Lock, ShieldCheck } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { RoleFormModal } from '../components/RoleFormModal'
import { useRoles } from '../hooks/useRoles'
import { useCreateRole, useUpdateRole, useDeleteRole } from '../hooks/useRoleMutations'
import type { Role, RoleCreateRequest } from '../../../api/types/role'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Struktur & pola SAMA PERSIS DepartmentListPage.tsx/PositionListPage.tsx
 * - beda cuma field/permission-code/endpoint, plus 1 tombol tambahan
 * per baris ("Matrix Permission") yang navigasi ke halaman terpisah
 * /roles/:id/permissions (Halaman 2, dibuka DARI SALAH SATU role
 * sesuai spek tugas - bukan route berdiri sendiri tanpa konteks role).
 */
export function RoleListPage() {
  const navigate = useNavigate()

  // Gate query BARENGAN permission - user tanpa role.view gak perlu
  // nge-fire GET /roles sama sekali (bukan cuma nyembunyiin hasilnya di UI doang).
  const canView = usePermission('role.view')
  const { data: roles, isLoading, isError, error } = useRoles(canView)
  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()
  const deleteMutation = useDeleteRole()

  const [formOpen, setFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | undefined>(undefined)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  function openCreateForm() {
    setEditingRole(undefined)
    setFormOpen(true)
  }

  function openEditForm(role: Role) {
    setEditingRole(role)
    setFormOpen(true)
  }

  async function handleFormSubmit(payload: RoleCreateRequest) {
    try {
      if (editingRole) {
        await updateMutation.mutateAsync({ id: editingRole.id, payload })
        setToast({ variant: 'success', message: 'Role berhasil diperbarui.' })
      } else {
        await createMutation.mutateAsync(payload)
        setToast({ variant: 'success', message: 'Role berhasil ditambahkan.' })
      }
      setFormOpen(false)
    } catch (err) {
      const apiError = err as NormalizedApiError
      // fieldErrors (422) sudah ditangani di dalam RoleFormModal sendiri (setError per-field) -
      // di sini cuma tangkep error NON-validasi (403/500/network) buat ditampilin sebagai Toast.
      if (!apiError.fieldErrors) {
        setToast({ variant: 'error', message: apiError.message })
      }
      throw err // biar RoleFormModal tetap tau submit gagal (form gak ke-reset/close)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingRole) return
    try {
      await deleteMutation.mutateAsync(deletingRole.id)
      setToast({ variant: 'success', message: 'Role berhasil dihapus.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setDeletingRole(null)
    }
  }

  return (
    <AppShell
      title="Role"
      actions={
        <PermissionGate code="role.create">
          <Button onClick={openCreateForm}>
            <Plus size={16} strokeWidth={2} />
            Tambah Role
          </Button>
        </PermissionGate>
      }
    >
      <PermissionGate
        code="role.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk melihat data role.</p>
          </div>
        }
      >
        {isError ? (
          // Error (403/network/500) TIDAK boleh nyamar jadi "Belum ada
          // role" - itu 2 kondisi yang beda total.
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {error?.status === 403
                ? 'Kamu tidak memiliki akses untuk melihat data role.'
                : 'Data role belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : (
          <Table<Role>
            isLoading={isLoading}
            data={roles ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada role."
            columns={[
              { key: 'code', header: 'Kode Role', mono: true, render: (row) => row.role_code },
              { key: 'name', header: 'Nama Role', render: (row) => row.role_name },
              {
                key: 'status',
                header: 'Status',
                // is_active boolean sederhana, BUKAN status workflow - pola persis Departemen/Posisi.
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
                    <button
                      type="button"
                      onClick={() => navigate(`/roles/${row.id}/permissions`)}
                      aria-label={`Lihat matrix permission ${row.role_name}`}
                      className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-primary-600"
                    >
                      <ShieldCheck size={14} strokeWidth={2} />
                    </button>
                    <PermissionGate code="role.update">
                      <button
                        type="button"
                        onClick={() => openEditForm(row)}
                        aria-label={`Edit ${row.role_name}`}
                        className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    </PermissionGate>
                    <PermissionGate code="role.delete">
                      <button
                        type="button"
                        onClick={() => setDeletingRole(row)}
                        aria-label={`Hapus ${row.role_name}`}
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

      <RoleFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        role={editingRole}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingRole}
        onCancel={() => setDeletingRole(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Role"
        description={`Yakin mau hapus "${deletingRole?.role_name}"? Tindakan ini tidak bisa dibatalkan.`}
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
