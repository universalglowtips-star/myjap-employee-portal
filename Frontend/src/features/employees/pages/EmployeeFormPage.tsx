import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Lock, User } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import { Toast } from '../../../components/ui/Toast'
import { usePermission } from '../../../lib/permissions'
import { useIsSuperAdmin } from '../../../stores/authStore'
import { getStorageUrl } from '../../../lib/storageUrl'
import { useDepartments } from '../../master-data/hooks/useDepartments'
import { usePositions } from '../../master-data/hooks/usePositions'
import { useWorkShifts } from '../../master-data/hooks/useWorkShifts'
import { useOfficeLocations } from '../../master-data/hooks/useOfficeLocations'
import { useRoles } from '../../master-data/hooks/useRoles'
import { useEmployee } from '../hooks/useEmployee'
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployeeMutations'
import type { Position } from '../../../api/types/position'
import type { NormalizedApiError } from '../../../api/client'

const MAX_PHOTO_SIZE = 2 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png']

/**
 * Skema di-generate lewat FACTORY function (bukan konstanta module-level
 * biasa) karena aturan Password beda create vs edit (wajib vs opsional),
 * DAN butuh akses ke daftar `positions` buat validasi silang
 * department_id<->position_id (lihat superRefine di bawah).
 */
function buildEmployeeSchema(isEditMode: boolean, positions: Position[]) {
  return z
    .object({
      full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
      email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
      password: z.string().optional(),
      phone: z.string().optional(),
      department_id: z.string().min(1, 'Departemen wajib dipilih'),
      position_id: z.string().min(1, 'Posisi wajib dipilih'),
      work_shift_id: z.string().min(1, 'Shift kerja wajib dipilih'),
      office_location_id: z.string().min(1, 'Lokasi kantor wajib dipilih'),
      role_id: z.string().min(1, 'Role wajib dipilih'),
      gender: z.string().min(1, 'Jenis kelamin wajib dipilih'),
      birth_date: z.string().optional(),
      address: z.string().optional(),
      join_date: z.string().min(1, 'Tanggal join wajib diisi'),
      basic_salary: z
        .string()
        .min(1, 'Gaji pokok wajib diisi')
        .refine((v) => !Number.isNaN(Number(v)), 'Gaji pokok harus berupa angka')
        .refine((v) => Number(v) >= 0, 'Gaji pokok tidak boleh negatif'),
      is_active: z.string().min(1, 'Status wajib dipilih'),
    })
    .superRefine((data, ctx) => {
      // Password: WAJIB saat Tambah (min 8, dikonfirmasi dari
      // StoreEmployeeRequest). Saat Edit OPSIONAL - dikonfirmasi langsung
      // ke EmployeeController::update(): kalau field kosong, di-unset
      // total dari $validated sebelum $employee->update(), jadi password
      // lama TIDAK berubah sama sekali (bukan diasumsikan, dibaca dari kode).
      if (!isEditMode) {
        if (!data.password || data.password.length < 8) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'Password wajib diisi, minimal 8 karakter',
          })
        }
      } else if (data.password && data.password.length > 0 && data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Password minimal 8 karakter (kosongkan kalau gak mau ganti)',
        })
      }

      // Validasi silang: posisi yang dipilih harus beneran milik
      // departemen yang dipilih. Dropdown Posisi SUDAH difilter by
      // departemen (garda pertama), ini garda kedua buat kasus state
      // basi (mis. user ganti Departemen setelah Posisi sempat dipilih).
      if (data.department_id && data.position_id) {
        const pos = positions.find((p) => String(p.id) === data.position_id)
        if (pos && String(pos.department_id) !== data.department_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['position_id'],
            message: 'Posisi tidak sesuai dengan Departemen yang dipilih',
          })
        }
      }
    })
}

type EmployeeFormValues = z.infer<ReturnType<typeof buildEmployeeSchema>>

const genderOptions = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
]

const statusOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

export function EmployeeFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEditMode = !!id
  const employeeId = id ? Number(id) : undefined
  const permissionCode = isEditMode ? 'employee.update' : 'employee.create'
  const canAccess = usePermission(permissionCode)
  // Gate opsi SUPER_ADMIN di dropdown Role - pola sama persis Permission
  // Matrix (useIsSuperAdmin(), cek role_code eksplisit dari akun yang
  // LOGIN, bukan permission code employee.create/update). Tanpa ini,
  // siapa pun yang boleh bikin/edit karyawan bisa kasih role SUPER_ADMIN
  // ke orang lain lewat form ini, di luar jalur proteksi Permission
  // Matrix - celah keamanan nyata, bukan cuma UX. Opsi-nya DIHILANGKAN
  // TOTAL dari daftar (bukan didisable) buat non-SUPER_ADMIN.
  const isCurrentUserSuperAdmin = useIsSuperAdmin()

  const { data: employee, isLoading: isEmployeeLoading, isError: isEmployeeError } = useEmployee(
    employeeId ?? 0,
    canAccess && isEditMode
  )

  // Kasus lanjutan dari temuan dropdown SUPER_ADMIN: kalau yang lagi
  // diedit itu SENDIRI SUPER_ADMIN, dan yang login BUKAN SUPER_ADMIN,
  // field Role dikunci total jadi teks read-only - bukan cuma soal opsi
  // dropdown gak lengkap, tapi RISIKO NYATA: kalau dropdown nampilin
  // value yang gak match opsi manapun (SUPER_ADMIN gak ada di daftar),
  // browser bisa nge-reset ke opsi pertama yang KELIATAN, dan submit
  // form buat ubah field lain (mis. telepon) bisa gak sengaja
  // nurunin/ganti role SUPER_ADMIN. Dikunci di 2 lapis: UI (read-only,
  // bukan Select) DAN submit (role_id gak pernah di-append ke FormData
  // sama sekali kalau locked - backend 'sometimes' berarti field yang
  // gak dikirim TIDAK PERNAH disentuh, jaminan paling kuat, bukan
  // sekadar "kirim balik value yang sama").
  const isLockedSuperAdminRole = isEditMode && !isCurrentUserSuperAdmin && employee?.role?.role_code === 'SUPER_ADMIN'
  const { data: departments } = useDepartments(canAccess)
  const { data: positions } = usePositions(canAccess)
  const { data: workShifts } = useWorkShifts(canAccess)
  const { data: officeLocations } = useOfficeLocations(canAccess)
  const { data: roles } = useRoles(canAccess)

  const createMutation = useCreateEmployee()
  const updateMutation = useUpdateEmployee()
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)

  const schema = buildEmployeeSchema(isEditMode, positions ?? [])
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({ resolver: zodResolver(schema) })

  // Reset form begitu data employee (mode Edit) siap. Mode Tambah reset
  // sekali di mount dengan default kosong/wajar.
  useEffect(() => {
    if (isEditMode) {
      if (employee) {
        reset({
          full_name: employee.full_name,
          email: employee.email,
          password: '',
          phone: employee.phone ?? '',
          department_id: String(employee.department_id),
          position_id: String(employee.position_id),
          work_shift_id: String(employee.work_shift_id),
          office_location_id: String(employee.office_location_id),
          role_id: employee.role_id ? String(employee.role_id) : '',
          gender: employee.gender,
          birth_date: employee.birth_date ?? '',
          address: employee.address ?? '',
          join_date: employee.join_date,
          basic_salary: employee.basic_salary,
          is_active: employee.is_active ? 'true' : 'false',
        })
      }
    } else {
      reset({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        department_id: '',
        position_id: '',
        work_shift_id: '',
        office_location_id: '',
        role_id: '',
        gender: '',
        birth_date: '',
        address: '',
        join_date: '',
        basic_salary: '',
        is_active: 'true',
      })
    }
  }, [isEditMode, employee, reset])

  // Preview foto - file yang BARU dipilih menang atas foto lama (kalau
  // ada) di mode Edit. Object URL di-revoke tiap kali file ganti/unmount,
  // biar gak numpuk memory leak.
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setPhotoFile(null)
      setPhotoError(null)
      return
    }
    // Validasi frontend SEBAGAI GARDA PERTAMA (backend: nullable|image|
    // mimes:jpg,jpeg,png|max:2048) - ditolak di sini SEBELUM sempat
    // submit ke server, pesan jelas per kondisi (bukan generic).
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Format foto harus JPG atau PNG.')
      e.target.value = ''
      setPhotoFile(null)
      return
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError('Ukuran foto maksimal 2MB.')
      e.target.value = ''
      setPhotoFile(null)
      return
    }
    setPhotoError(null)
    setPhotoFile(file)
  }

  const selectedDepartmentId = watch('department_id')
  const filteredPositions = selectedDepartmentId
    ? (positions ?? []).filter((p) => String(p.department_id) === selectedDepartmentId)
    : (positions ?? [])

  const departmentOptions = (departments ?? []).map((d) => ({ value: String(d.id), label: d.department_name }))
  const positionOptions = filteredPositions.map((p) => ({ value: String(p.id), label: p.position_name }))
  const workShiftOptions = (workShifts ?? []).map((w) => ({ value: String(w.id), label: w.shift_name }))
  const officeLocationOptions = (officeLocations ?? []).map((o) => ({ value: String(o.id), label: o.office_name }))
  const roleOptions = (roles ?? [])
    .filter((r) => isCurrentUserSuperAdmin || r.role_code !== 'SUPER_ADMIN')
    .map((r) => ({ value: String(r.id), label: r.role_name }))

  async function handleFormSubmit(values: EmployeeFormValues) {
    try {
      const fd = new FormData()
      fd.append('full_name', values.full_name)
      fd.append('email', values.email)
      if (values.password) fd.append('password', values.password)
      if (values.phone) fd.append('phone', values.phone)
      fd.append('department_id', values.department_id)
      fd.append('position_id', values.position_id)
      fd.append('work_shift_id', values.work_shift_id)
      fd.append('office_location_id', values.office_location_id)
      // role_id SENGAJA gak pernah di-append kalau isLockedSuperAdminRole -
      // backend UpdateEmployeeRequest pakai 'sometimes', field yang gak
      // ada di body TIDAK PERNAH disentuh sama sekali (bukan cuma
      // "dikirim balik sama"), jaminan paling kuat biar role SUPER_ADMIN
      // gak mungkin ke-ubah lewat form ini oleh non-SUPER_ADMIN.
      if (!isLockedSuperAdminRole) {
        fd.append('role_id', values.role_id)
      }
      fd.append('gender', values.gender)
      if (values.birth_date) fd.append('birth_date', values.birth_date)
      if (values.address) fd.append('address', values.address)
      fd.append('join_date', values.join_date)
      fd.append('basic_salary', values.basic_salary)
      // '1'/'0' (BUKAN 'true'/'false') - dikonfirmasi via curl: validasi
      // 'boolean' Laravel nolak string literal "true"/"false" yang
      // dikirim lewat multipart form field (semua value FormData jadi
      // string, beda dari body JSON di mana axios kirim boolean asli).
      fd.append('is_active', values.is_active === 'true' ? '1' : '0')
      if (photoFile) fd.append('photo', photoFile)

      if (isEditMode && employeeId) {
        await updateMutation.mutateAsync({ id: employeeId, formData: fd })
        setToast({ variant: 'success', message: 'Karyawan berhasil diperbarui.' })
      } else {
        await createMutation.mutateAsync(fd)
        setToast({ variant: 'success', message: 'Karyawan berhasil ditambahkan.' })
      }
      navigate('/employees')
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.fieldErrors) {
        for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
          if (field === 'photo') {
            setPhotoError(messages[0])
            continue
          }
          const knownFields: (keyof EmployeeFormValues)[] = [
            'full_name', 'email', 'password', 'phone', 'department_id', 'position_id',
            'work_shift_id', 'office_location_id', 'role_id', 'gender', 'birth_date',
            'address', 'join_date', 'basic_salary', 'is_active',
          ]
          if ((knownFields as string[]).includes(field)) {
            setError(field as keyof EmployeeFormValues, { message: messages[0] })
          }
        }
      } else {
        setToast({ variant: 'error', message: apiError.message })
      }
    }
  }

  const currentPhotoUrl = photoPreviewUrl ?? getStorageUrl(employee?.photo)
  const isLoadingReferenceData = isEditMode && (isEmployeeLoading || !employee)

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
        {isEditMode && isEmployeeError ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">Data karyawan tidak ditemukan atau gagal dimuat.</p>
          </div>
        ) : isLoadingReferenceData ? (
          <div className="rounded-md bg-white p-12 text-center shadow-sm">
            <p className="font-body text-sm text-neutral-500">Memuat data karyawan...</p>
          </div>
        ) : (
          <div className="max-w-3xl rounded-md bg-white p-6 shadow-sm">
            {isEditMode && employee && (
              <p className="mb-4 font-body text-xs text-neutral-500">
                Kode Karyawan: <span className="font-mono text-neutral-700">{employee.employee_code}</span>
              </p>
            )}

            <form
              id="employee-form"
              onSubmit={handleSubmit(handleFormSubmit)}
              noValidate
              className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
            >
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="full_name" className="font-body text-[13px] font-medium text-neutral-600">
                  Nama Lengkap
                </label>
                <Input id="full_name" className="py-2" error={errors.full_name?.message} {...register('full_name')} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="font-body text-[13px] font-medium text-neutral-600">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="py-2"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="font-body text-[13px] font-medium text-neutral-600">
                  Telepon <span className="font-normal text-neutral-400">(opsional)</span>
                </label>
                <Input
                  id="phone"
                  autoComplete="tel"
                  className="py-2"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="password" className="font-body text-[13px] font-medium text-neutral-600">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="py-2"
                  placeholder={isEditMode ? 'Kosongkan jika tidak ingin mengubah password' : undefined}
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="department_id" className="font-body text-[13px] font-medium text-neutral-600">
                  Departemen
                </label>
                <Select
                  id="department_id"
                  className="py-2"
                  options={departmentOptions}
                  placeholder="Pilih Departemen"
                  error={errors.department_id?.message}
                  {...register('department_id')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="position_id" className="font-body text-[13px] font-medium text-neutral-600">
                  Posisi
                </label>
                <Select
                  id="position_id"
                  className="py-2"
                  options={positionOptions}
                  placeholder="Pilih Posisi"
                  error={errors.position_id?.message}
                  {...register('position_id')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="work_shift_id" className="font-body text-[13px] font-medium text-neutral-600">
                  Shift Kerja
                </label>
                <Select
                  id="work_shift_id"
                  className="py-2"
                  options={workShiftOptions}
                  placeholder="Pilih Shift Kerja"
                  error={errors.work_shift_id?.message}
                  {...register('work_shift_id')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="office_location_id" className="font-body text-[13px] font-medium text-neutral-600">
                  Lokasi Kantor
                </label>
                <Select
                  id="office_location_id"
                  className="py-2"
                  options={officeLocationOptions}
                  placeholder="Pilih Lokasi Kantor"
                  error={errors.office_location_id?.message}
                  {...register('office_location_id')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="role_id" className="font-body text-[13px] font-medium text-neutral-600">
                  Role
                </label>
                {isLockedSuperAdminRole ? (
                  <>
                    <p className="rounded-sm border border-neutral-200 bg-neutral-50 px-4 py-2 font-body text-sm text-neutral-900">
                      Super Administrator
                    </p>
                    <p className="flex items-center gap-1 font-body text-xs text-neutral-500">
                      <Lock size={11} strokeWidth={2} />
                      Role ini hanya bisa diubah oleh SUPER_ADMIN.
                    </p>
                  </>
                ) : (
                  <Select
                    id="role_id"
                    className="py-2"
                    options={roleOptions}
                    placeholder="Pilih Role"
                    error={errors.role_id?.message}
                    {...register('role_id')}
                  />
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gender" className="font-body text-[13px] font-medium text-neutral-600">
                  Jenis Kelamin
                </label>
                <Select
                  id="gender"
                  className="py-2"
                  options={genderOptions}
                  placeholder="Pilih Jenis Kelamin"
                  error={errors.gender?.message}
                  {...register('gender')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="birth_date" className="font-body text-[13px] font-medium text-neutral-600">
                  Tanggal Lahir <span className="font-normal text-neutral-400">(opsional)</span>
                </label>
                <Input
                  id="birth_date"
                  type="date"
                  className="py-2"
                  error={errors.birth_date?.message}
                  {...register('birth_date')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="join_date" className="font-body text-[13px] font-medium text-neutral-600">
                  Tanggal Join
                </label>
                <Input
                  id="join_date"
                  type="date"
                  className="py-2"
                  error={errors.join_date?.message}
                  {...register('join_date')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="basic_salary" className="font-body text-[13px] font-medium text-neutral-600">
                  Gaji Pokok
                </label>
                <Input
                  id="basic_salary"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  className="py-2"
                  error={errors.basic_salary?.message}
                  {...register('basic_salary')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="is_active" className="font-body text-[13px] font-medium text-neutral-600">
                  Status
                </label>
                <Select
                  id="is_active"
                  className="py-2"
                  options={statusOptions}
                  error={errors.is_active?.message}
                  {...register('is_active')}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="address" className="font-body text-[13px] font-medium text-neutral-600">
                  Alamat <span className="font-normal text-neutral-400">(opsional)</span>
                </label>
                <Input id="address" className="py-2" error={errors.address?.message} {...register('address')} />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="photo" className="font-body text-[13px] font-medium text-neutral-600">
                  Foto <span className="font-normal text-neutral-400">(opsional, JPG/PNG, maks 2MB)</span>
                </label>
                <div className="flex items-center gap-3">
                  {currentPhotoUrl ? (
                    <img
                      src={currentPhotoUrl}
                      alt="Preview foto karyawan"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                      <User size={24} strokeWidth={2} className="text-neutral-400" />
                    </div>
                  )}
                  <input
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoChange}
                    className="font-body text-sm text-neutral-600 file:mr-3 file:rounded-sm file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:font-body file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
                  />
                </div>
                {photoError && <p className="font-body text-xs text-status-rejected">{photoError}</p>}
              </div>
            </form>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => navigate('/employees')} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" form="employee-form" loading={isSubmitting}>
                Simpan
              </Button>
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
