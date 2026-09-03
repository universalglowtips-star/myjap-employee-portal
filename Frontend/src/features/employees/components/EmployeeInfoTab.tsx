import { User } from 'lucide-react'
import { Label } from '../../../components/ui/Label'
import { getStorageUrl } from '../../../lib/storageUrl'
import type { Employee } from '../../../api/types/employee'

interface EmployeeInfoTabProps {
  employee: Employee | undefined
  isLoading: boolean
  isError: boolean
}

interface ReadOnlyFieldProps {
  label: string
  value: string
  span2?: boolean
}

/** Label + value, BUKAN <input>/<Select> - Tab Info murni tampilan, gak ada field yang bisa diedit sama sekali (edit tetap lewat /employees/:id/edit yang sudah ada). */
function ReadOnlyField({ label, value, span2 }: ReadOnlyFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${span2 ? 'sm:col-span-2' : ''}`}>
      <Label as="p">{label}</Label>
      <p className="font-body text-sm text-neutral-900">{value}</p>
    </div>
  )
}

const genderLabel: Record<'L' | 'P', string> = { L: 'Laki-laki', P: 'Perempuan' }

/** Semua field yang sama seperti EmployeeFormPage (Task 8c) - password SENGAJA gak ditampilkan (gak pernah ada di response API, $hidden di model, lihat api/types/employee.ts). */
export function EmployeeInfoTab({ employee, isLoading, isError }: EmployeeInfoTabProps) {
  if (isLoading || !employee) {
    return (
      <div className="rounded-md bg-white p-12 text-center shadow-sm">
        <p className="font-body text-sm text-neutral-600">
          {isError ? 'Data karyawan tidak ditemukan atau gagal dimuat.' : 'Memuat data karyawan...'}
        </p>
      </div>
    )
  }

  const photoUrl = getStorageUrl(employee.photo)

  return (
    <div className="max-w-3xl rounded-md bg-white p-6 shadow-sm">
      <p className="mb-4 font-body text-xs text-neutral-600">
        Kode Karyawan: <span className="font-mono text-neutral-700">{employee.employee_code}</span>
      </p>

      {/* Grid 2 kolom - replikasi eksplisit pola PositionFormModal.tsx (gap-x-4 gap-y-3 sm:grid-cols-2), sesuai instruksi tugas. */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <ReadOnlyField label="Nama Lengkap" value={employee.full_name} span2 />
        <ReadOnlyField label="Email" value={employee.email} />
        <ReadOnlyField label="Telepon" value={employee.phone ?? '—'} />
        <ReadOnlyField label="Departemen" value={employee.department?.department_name ?? '—'} />
        <ReadOnlyField label="Posisi" value={employee.position?.position_name ?? '—'} />
        <ReadOnlyField label="Shift Kerja" value={employee.work_shift?.shift_name ?? '—'} />
        <ReadOnlyField label="Lokasi Kantor" value={employee.office_location?.office_name ?? '—'} />
        <ReadOnlyField label="Role" value={employee.role?.role_name ?? '—'} />
        <ReadOnlyField label="Jenis Kelamin" value={genderLabel[employee.gender]} />
        <ReadOnlyField label="Tanggal Lahir" value={employee.birth_date ?? '—'} />
        <ReadOnlyField label="Tanggal Join" value={employee.join_date} />
        <ReadOnlyField label="Gaji Pokok" value={employee.basic_salary} />
        <ReadOnlyField label="Status" value={employee.is_active ? 'Aktif' : 'Nonaktif'} />
        <ReadOnlyField label="Alamat" value={employee.address ?? '—'} span2 />

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label as="p">Foto</Label>
          {photoUrl ? (
            <img src={photoUrl} alt={`Foto ${employee.full_name}`} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <User size={24} strokeWidth={2} className="text-neutral-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
