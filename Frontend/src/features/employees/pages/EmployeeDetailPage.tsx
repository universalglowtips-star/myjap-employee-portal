import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Button } from '../../../components/ui/Button'
import { usePermission } from '../../../lib/permissions'
import { cn } from '../../../lib/cn'
import { useEmployee } from '../hooks/useEmployee'
import { EmployeeInfoTab } from '../components/EmployeeInfoTab'
import { EmployeeAttendanceOverrideTab } from '../components/EmployeeAttendanceOverrideTab'

/**
 * Route BARU /employees/:id (Task 8d) - view-only, BEDA dari
 * /employees/:id/edit yang sudah ada (Fase 8c, form bisa diedit).
 *
 * Struktur tab DRIVEN BY ARRAY (bukan JSX if/else berjejer) - biar
 * gampang nambah tab baru nanti (Task 8e "Wewenang Cabang"). SENGAJA
 * belum ditambahkan tab ke-3 di sini sama sekali (bukan cuma
 * di-disable/placeholder) - sesuai instruksi eksplisit tugas ini:
 * cukup pastikan strukturnya reusable, gak perlu bikin UI apapun buat
 * tab itu sekarang. Nambah tab baru nanti tinggal 1 entry baru di
 * array TABS + 1 branch render kondisi, gak perlu ubah tab switcher.
 */
const TABS = [
  { key: 'info', label: 'Info' },
  { key: 'override', label: 'Pengecualian Lokasi Absensi' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const employeeId = Number(id)
  const canView = usePermission('employee.view')

  const [activeTab, setActiveTab] = useState<TabKey>('info')

  const { data: employee, isLoading, isError } = useEmployee(employeeId, canView)

  return (
    <AppShell
      title="Detail Karyawan"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/employees')}>
            <ArrowLeft size={16} strokeWidth={2} />
            Kembali
          </Button>
          <PermissionGate code="employee.update">
            <Button onClick={() => navigate(`/employees/${employeeId}/edit`)}>
              <Pencil size={16} strokeWidth={2} />
              Edit Karyawan
            </Button>
          </PermissionGate>
        </div>
      }
    >
      <PermissionGate
        code="employee.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk halaman ini.</p>
          </div>
        }
      >
        {/* Tab switcher - replikasi pola OfficeLocationFormModal.tsx (border-b-2
            aktif/nonaktif), text-neutral-600 buat tab nonaktif (BUKAN
            text-neutral-400 - sesuai aturan aksesibilitas tugas ini).
            text-primary-700 (BUKAN primary-600) buat tab aktif - beda dari
            OfficeLocationFormModal yang tab switcher-nya duduk di atas
            Modal putih (primary-600 lolos 4.83:1 di sana), switcher di
            SINI duduk langsung di atas bg-neutral-50 AppShell - primary-600
            cuma 4.47:1 di situ, GAGAL AA (dikonfirmasi axe). border-primary-600
            TETAP (bukan teks, cuma garis bawah dekoratif, gak kena rule
            color-contrast axe). */}
        <div className="mb-4 flex gap-4 border-b border-neutral-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'font-body text-sm font-medium pb-1.5 -mb-px border-b-2',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-neutral-600 hover:text-neutral-800'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'info' && <EmployeeInfoTab employee={employee} isLoading={isLoading} isError={isError} />}
        {activeTab === 'override' && <EmployeeAttendanceOverrideTab employeeId={employeeId} />}
      </PermissionGate>
    </AppShell>
  )
}
