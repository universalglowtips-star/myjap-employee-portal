import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Construction, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Button } from '../../../components/ui/Button'

/**
 * Placeholder Fase 8b - routing /employees/new & /employees/:id/edit
 * SUDAH SIAP (sesuai spek eksplisit "cukup routing-nya siap"), tapi
 * form lengkapnya (multipart file upload buat foto, dropdown Departemen/
 * Posisi/Shift/Kantor/Role, dst) SENGAJA belum dibangun di fase ini -
 * itu scope Fase 8c. Satu komponen dipakai buat KEDUA route (Tambah &
 * Edit) - bedanya cuma teks, form aslinya nanti juga bakal 1 komponen
 * shared (pola sama semua modul lain: 1 FormModal buat create+edit).
 */
export function EmployeeFormPlaceholderPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEditMode = !!id
  const permissionCode = isEditMode ? 'employee.update' : 'employee.create'

  return (
    <AppShell
      title={isEditMode ? 'Edit Karyawan' : 'Tambah Karyawan'}
      actions={
        <Button variant="ghost" onClick={() => navigate('/employees')}>
          <ArrowLeft size={16} strokeWidth={2} />
          Kembali
        </Button>
      }
    >
      <PermissionGate
        code={permissionCode}
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk halaman ini.</p>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
          <Construction size={24} strokeWidth={2} className="text-neutral-400" />
          <p className="font-body text-sm text-neutral-900">Form akan dibangun di Fase 8c.</p>
          {isEditMode && (
            <p className="font-body text-xs text-neutral-500">
              (Edit karyawan ID {id} - form belum tersedia)
            </p>
          )}
        </div>
      </PermissionGate>
    </AppShell>
  )
}
