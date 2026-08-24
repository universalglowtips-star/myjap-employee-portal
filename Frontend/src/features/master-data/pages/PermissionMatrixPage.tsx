import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { useIsSuperAdmin } from '../../../stores/authStore'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Toast } from '../../../components/ui/Toast'
import { usePermissionsCatalog } from '../hooks/usePermissionsCatalog'
import { useRolePermissions, useUpdateRolePermissions } from '../hooks/useRolePermissions'
import type { Permission } from '../../../api/types/permission'
import type { NormalizedApiError } from '../../../api/client'

/**
 * KEPUTUSAN DESAIN (belum ada di spek tugas, diputuskan sendiri karena
 * user sudah bilang "boleh lanjut tanpa nunggu konfirmasi lagi"):
 * spek bilang "payroll modul PENGECUALIAN - cuma 2 kolom (generate-bulk/
 * publish-bulk)" seolah-olah payroll SATU-SATUNYA modul non-standar.
 * Dicek langsung ke database (tinker groupBy module/action): 10 dari
 * 21 modul TIDAK punya set aksi CRUD standar penuh (attendance-location-
 * policy, audit-log, company-setting, dashboard, leave, notification,
 * payroll, payroll-period, payslip, store-transaction, system-warning).
 *
 * Solusi generik (BUKAN hardcode per-modul): grid selalu 4 kolom
 * standar View/Create/Update/Delete + 1 kolom "Lainnya" buat aksi non-
 * standar apa pun (approve/reject/cancel/submit/publish/unpublish/
 * resolve/generate-bulk/publish-bulk). Modul yang gak punya salah satu
 * aksi standar (mis. dashboard cuma 'view') otomatis dapet sel '—' di
 * kolom standar yang gak dimilikinya - bukan checkbox disabled kosong,
 * karena permission itu MEMANG gak exist buat modul itu (beda makna
 * dari "exist tapi lagi di-nonaktifkan"). payroll pas terjadi jadi
 * kasus ekstrem dari pola yang sama: 4 kolom standar semua '—', 2 item
 * di kolom Lainnya - sesuai persis instruksi tugas, tanpa logic khusus.
 */
const STANDARD_ACTIONS = ['view', 'create', 'update', 'delete'] as const

interface ModuleRow {
  module: string
  byAction: Map<string, Permission>
  extra: Permission[]
}

function StandardCell({
  permission,
  forceChecked,
  checkedIds,
  disabled,
  onToggle,
}: {
  permission: Permission | undefined
  forceChecked: boolean
  checkedIds: Set<number>
  disabled: boolean
  onToggle: (id: number) => void
}) {
  if (!permission) {
    return <span className="text-neutral-300">—</span>
  }
  const checked = forceChecked || checkedIds.has(permission.id)
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={() => onToggle(permission.id)}
      aria-label={permission.permission_code}
      className="h-4 w-4 rounded-sm border-neutral-300 accent-primary-600 disabled:cursor-not-allowed"
    />
  )
}

function ExtraCell({
  permissions,
  forceChecked,
  checkedIds,
  disabled,
  onToggle,
}: {
  permissions: Permission[]
  forceChecked: boolean
  checkedIds: Set<number>
  disabled: boolean
  onToggle: (id: number) => void
}) {
  if (permissions.length === 0) {
    return <span className="text-neutral-300">—</span>
  }
  return (
    <div className="flex flex-col gap-1">
      {permissions.map((perm) => {
        const checked = forceChecked || checkedIds.has(perm.id)
        return (
          <label key={perm.id} className="flex items-center gap-1.5 font-body text-xs text-neutral-700">
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(perm.id)}
              aria-label={perm.permission_code}
              className="h-3.5 w-3.5 rounded-sm border-neutral-300 accent-primary-600 disabled:cursor-not-allowed"
            />
            {perm.action}
          </label>
        )
      })}
    </div>
  )
}

export function PermissionMatrixPage() {
  const { id } = useParams<{ id: string }>()
  const roleId = Number(id)
  const navigate = useNavigate()

  // Page-level gate cermin middleware GET /roles/{role}/permissions (permission:role.view).
  const canView = usePermission('role.view')

  // Gating dua lapis buat EDIT (checkbox+Simpan), sesuai Aturan Keamanan
  // Kritis di spek: PermissionGate role.update SAJA TIDAK CUKUP, karena
  // role.update bisa saja di-assign ke role NON-SUPER_ADMIN lewat Matrix
  // ini sendiri. useIsSuperAdmin() cek role_code eksplisit, bukan cuma
  // "punya kode permission role.update".
  const hasRoleUpdatePermission = usePermission('role.update')
  const isCurrentUserSuperAdmin = useIsSuperAdmin()
  const canEdit = hasRoleUpdatePermission && isCurrentUserSuperAdmin

  const {
    data: rolePermissions,
    isLoading: isRoleLoading,
    isError: isRoleError,
    error: roleError,
  } = useRolePermissions(roleId, canView && Number.isFinite(roleId))
  const {
    data: catalog,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
  } = usePermissionsCatalog(canView)
  const updateMutation = useUpdateRolePermissions(roleId)

  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  // Sinkron ulang state lokal tiap kali data role BARU datang (ganti
  // role/reload/setelah save sukses & query di-invalidate) - checkbox
  // selalu cerminan data server, bukan draft yang bisa nyimpang diam-diam.
  useEffect(() => {
    if (rolePermissions) {
      setCheckedIds(new Set(rolePermissions.permissions.map((p) => p.id)))
    }
  }, [rolePermissions])

  const moduleRows: ModuleRow[] = useMemo(() => {
    if (!catalog) return []
    return Object.entries(catalog).map(([module, perms]) => {
      const byAction = new Map(perms.map((p) => [p.action, p]))
      const extra = perms.filter((p) => !(STANDARD_ACTIONS as readonly string[]).includes(p.action))
      return { module, byAction, extra }
    })
  }, [catalog])

  function toggle(permissionId: number) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(permissionId)) {
        next.delete(permissionId)
      } else {
        next.add(permissionId)
      }
      return next
    })
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync(Array.from(checkedIds))
      setToast({ variant: 'success', message: 'Permission role berhasil diperbarui.' })
    } catch (err) {
      // Termasuk kasus 422 SUPER_ADMIN (seharusnya gak pernah ke-trigger
      // dari UI normal karena checkbox+Simpan udah disabled duluan pas
      // target role SUPER_ADMIN - tapi tetap ditangani eksplisit, bukan
      // silent fail/pesan generik, sesuai instruksi tugas).
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    }
  }

  const isTargetSuperAdmin = rolePermissions?.is_super_admin ?? false
  const isLoading = isRoleLoading || isCatalogLoading
  const isError = isRoleError || isCatalogError
  const checkboxesDisabled = isTargetSuperAdmin || !canEdit || updateMutation.isPending

  return (
    <AppShell
      title={rolePermissions ? `Permission Matrix — ${rolePermissions.role.role_name}` : 'Permission Matrix'}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/roles')}>
            <ArrowLeft size={16} strokeWidth={2} />
            Kembali
          </Button>
          {!isTargetSuperAdmin && canEdit && (
            <Button onClick={handleSave} loading={updateMutation.isPending}>
              Simpan Perubahan
            </Button>
          )}
        </div>
      }
    >
      <PermissionGate
        code="role.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">
              Kamu tidak memiliki akses untuk melihat permission role.
            </p>
          </div>
        }
      >
        {isError ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {roleError?.status === 403
                ? 'Kamu tidak memiliki akses untuk melihat permission role.'
                : 'Data permission belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {isTargetSuperAdmin && (
              <div className="flex items-center gap-2 rounded-md bg-primary-50 px-4 py-3">
                <ShieldCheck size={16} strokeWidth={2} className="text-primary-700" />
                <p className="font-body text-sm text-primary-700">
                  <span className="font-semibold">Akses Penuh Otomatis</span> — SUPER_ADMIN selalu punya akses ke
                  semua modul secara otomatis dan tidak bisa diedit manual.
                </p>
              </div>
            )}
            {!isTargetSuperAdmin && !canEdit && (
              <div className="rounded-md bg-neutral-100 px-4 py-3">
                <p className="font-body text-sm text-neutral-600">
                  Kamu bisa melihat permission role ini, tapi tidak bisa mengubahnya. Hanya SUPER_ADMIN yang bisa
                  mengedit Permission Matrix.
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-md bg-white shadow-sm">
              <Table<ModuleRow>
                isLoading={isLoading}
                data={moduleRows}
                rowKey={(row) => row.module}
                emptyMessage="Belum ada modul permission."
                columns={[
                  { key: 'module', header: 'Modul', render: (row) => row.module },
                  {
                    key: 'view',
                    header: 'View',
                    align: 'center',
                    render: (row) => (
                      <StandardCell
                        permission={row.byAction.get('view')}
                        forceChecked={isTargetSuperAdmin}
                        checkedIds={checkedIds}
                        disabled={checkboxesDisabled}
                        onToggle={toggle}
                      />
                    ),
                  },
                  {
                    key: 'create',
                    header: 'Create',
                    align: 'center',
                    render: (row) => (
                      <StandardCell
                        permission={row.byAction.get('create')}
                        forceChecked={isTargetSuperAdmin}
                        checkedIds={checkedIds}
                        disabled={checkboxesDisabled}
                        onToggle={toggle}
                      />
                    ),
                  },
                  {
                    key: 'update',
                    header: 'Update',
                    align: 'center',
                    render: (row) => (
                      <StandardCell
                        permission={row.byAction.get('update')}
                        forceChecked={isTargetSuperAdmin}
                        checkedIds={checkedIds}
                        disabled={checkboxesDisabled}
                        onToggle={toggle}
                      />
                    ),
                  },
                  {
                    key: 'delete',
                    header: 'Delete',
                    align: 'center',
                    render: (row) => (
                      <StandardCell
                        permission={row.byAction.get('delete')}
                        forceChecked={isTargetSuperAdmin}
                        checkedIds={checkedIds}
                        disabled={checkboxesDisabled}
                        onToggle={toggle}
                      />
                    ),
                  },
                  {
                    key: 'extra',
                    header: 'Lainnya',
                    render: (row) => (
                      <ExtraCell
                        permissions={row.extra}
                        forceChecked={isTargetSuperAdmin}
                        checkedIds={checkedIds}
                        disabled={checkboxesDisabled}
                        onToggle={toggle}
                      />
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}
      </PermissionGate>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </AppShell>
  )
}
