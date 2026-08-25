import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Lock } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import { Toast } from '../../../components/ui/Toast'
import { usePermission } from '../../../lib/permissions'
import { useOfficeLocationSupervisors, useUpdateOfficeLocationSupervisors } from '../hooks/useOfficeLocationSupervisors'
import type { OfficeLocation, OfficeLocationCreateRequest } from '../../../api/types/officeLocation'
import type { Employee } from '../../../api/types/employee'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Backend cuma validasi 'numeric' polos buat latitude/longitude (gak ada
 * batas rentang) - sama seperti kasus format jam di Shift Kerja, frontend
 * jadi garda utama. Rentang wajar koordinat GPS: latitude -90..90,
 * longitude -180..180 (fakta geografis, bukan aturan bisnis internal).
 */
const officeLocationSchema = z.object({
  office_code: z.string().min(1, 'Kode lokasi wajib diisi'),
  office_name: z.string().min(1, 'Nama lokasi wajib diisi'),
  latitude: z
    .string()
    .min(1, 'Latitude wajib diisi')
    .refine((v) => !Number.isNaN(Number(v)), 'Latitude harus berupa angka')
    .refine((v) => Number(v) >= -90 && Number(v) <= 90, 'Latitude harus di antara -90 dan 90'),
  longitude: z
    .string()
    .min(1, 'Longitude wajib diisi')
    .refine((v) => !Number.isNaN(Number(v)), 'Longitude harus berupa angka')
    .refine((v) => Number(v) >= -180 && Number(v) <= 180, 'Longitude harus di antara -180 dan 180'),
  radius_meter: z
    .string()
    .min(1, 'Radius wajib diisi')
    .refine((v) => !Number.isNaN(Number(v)), 'Radius harus berupa angka')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Radius harus bilangan bulat minimal 1 meter'),
  check_in_start: z.string().min(1, 'Jam mulai masuk wajib diisi'),
  check_in_end: z.string().min(1, 'Jam selesai masuk wajib diisi'),
  check_out_start: z.string().min(1, 'Jam mulai pulang wajib diisi'),
  check_out_end: z.string().min(1, 'Jam selesai pulang wajib diisi'),
  description: z.string().optional(),
  is_active: z.string().min(1, 'Status wajib dipilih'),
})

type OfficeLocationFormValues = z.infer<typeof officeLocationSchema>

interface OfficeLocationFormModalProps {
  open: boolean
  onClose: () => void
  /** Kalau diisi = mode edit, kalau undefined = mode create. */
  officeLocation?: OfficeLocation
  onSubmit: (payload: OfficeLocationCreateRequest) => Promise<void>
  isSubmitting: boolean
  /** Kandidat supervisor buat Tab Supervisor - di-fetch di Page (bukan di sini), pola sama Position/departments. */
  employees: Employee[] | undefined
  isEmployeesLoading: boolean
  isEmployeesError: boolean
}

const statusOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

/** "HH:MM:SS" dari backend -> "HH:MM" buat value <input type="time">. */
function toTimeInputValue(value: string | undefined): string {
  return value ? value.slice(0, 5) : ''
}

export function OfficeLocationFormModal({
  open,
  onClose,
  officeLocation,
  onSubmit,
  isSubmitting,
  employees,
  isEmployeesLoading,
  isEmployeesError,
}: OfficeLocationFormModalProps) {
  const isEditMode = !!officeLocation

  // Tab switcher CUMA ada di mode Edit (spek: lokasi baru harus disimpan
  // dulu sebelum bisa assign supervisor, karena butuh office_location_id
  // valid - PUT /office-locations/{id}/supervisors gak bisa dipanggil
  // tanpa id). Direset ke 'info' tiap kali modal dibuka/ganti row, biar
  // gak nyangkut di tab Supervisor pas buka row lain.
  const [activeTab, setActiveTab] = useState<'info' | 'supervisor'>('info')
  useEffect(() => {
    if (open) setActiveTab('info')
  }, [open, officeLocation])

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<OfficeLocationFormValues>({ resolver: zodResolver(officeLocationSchema) })

  // is_active TRUTHY check (bukan String()) - pola sama Position/Role/WorkShift.
  useEffect(() => {
    if (open) {
      reset({
        office_code: officeLocation?.office_code ?? '',
        office_name: officeLocation?.office_name ?? '',
        latitude: officeLocation?.latitude ?? '',
        longitude: officeLocation?.longitude ?? '',
        radius_meter: officeLocation ? String(officeLocation.radius_meter) : '100',
        check_in_start: toTimeInputValue(officeLocation?.check_in_start),
        check_in_end: toTimeInputValue(officeLocation?.check_in_end),
        check_out_start: toTimeInputValue(officeLocation?.check_out_start),
        check_out_end: toTimeInputValue(officeLocation?.check_out_end),
        description: officeLocation?.description ?? '',
        is_active: officeLocation ? (officeLocation.is_active ? 'true' : 'false') : 'true',
      })
    }
  }, [open, officeLocation, reset])

  async function handleFormSubmit(values: OfficeLocationFormValues) {
    try {
      await onSubmit({
        office_code: values.office_code,
        office_name: values.office_name,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        radius_meter: Number(values.radius_meter),
        check_in_start: values.check_in_start,
        check_in_end: values.check_in_end,
        check_out_start: values.check_out_start,
        check_out_end: values.check_out_end,
        description: values.description || null,
        is_active: values.is_active === 'true',
      })
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.fieldErrors) {
        for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
          if (
            field === 'office_code' ||
            field === 'office_name' ||
            field === 'latitude' ||
            field === 'longitude' ||
            field === 'radius_meter' ||
            field === 'check_in_start' ||
            field === 'check_in_end' ||
            field === 'check_out_start' ||
            field === 'check_out_end' ||
            field === 'description' ||
            field === 'is_active'
          ) {
            setError(field as keyof OfficeLocationFormValues, { message: messages[0] })
          }
        }
      }
      // Error non-validasi (403/500 dsb) ditangani di Page (Toast) - Modal ini cuma urus form-level error.
      throw err
    }
  }

  // --- Tab Supervisor ---
  // Gating 3-skenario independen (dikonfirmasi dari investigasi, JANGAN
  // disederhanakan): attendance-location-policy.view buat lihat,
  // attendance-location-policy.update buat edit, employee.view (via
  // prop isEmployeesError) buat muat daftar kandidat - 3 permission
  // code yang gak saling terkait sama sekali.
  const canViewSupervisors = usePermission('attendance-location-policy.view')
  const canEditSupervisors = usePermission('attendance-location-policy.update')

  const officeLocationId = officeLocation?.id ?? 0
  const supervisorsEnabled = open && isEditMode && activeTab === 'supervisor' && canViewSupervisors
  const {
    data: supervisorsData,
    isLoading: isSupervisorsLoading,
    isError: isSupervisorsError,
    error: supervisorsErrorObj,
  } = useOfficeLocationSupervisors(officeLocationId, supervisorsEnabled)
  const updateSupervisorsMutation = useUpdateOfficeLocationSupervisors(officeLocationId)

  const [checkedEmployeeIds, setCheckedEmployeeIds] = useState<Set<number>>(new Set())
  useEffect(() => {
    if (supervisorsData) {
      setCheckedEmployeeIds(new Set(supervisorsData.supervisors.map((e) => e.id)))
    }
  }, [supervisorsData])

  const [supervisorToast, setSupervisorToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(
    null
  )

  function toggleSupervisor(employeeId: number) {
    setCheckedEmployeeIds((prev) => {
      const next = new Set(prev)
      if (next.has(employeeId)) {
        next.delete(employeeId)
      } else {
        next.add(employeeId)
      }
      return next
    })
  }

  async function handleSaveSupervisors() {
    try {
      await updateSupervisorsMutation.mutateAsync(Array.from(checkedEmployeeIds))
      setSupervisorToast({ variant: 'success', message: 'Supervisor lokasi berhasil diperbarui.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setSupervisorToast({ variant: 'error', message: apiError.message })
    }
  }

  const footer =
    !isEditMode || activeTab === 'info' ? (
      <>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" form="office-location-form" loading={isSubmitting}>
          Simpan
        </Button>
      </>
    ) : (
      <>
        <Button variant="ghost" onClick={onClose} disabled={updateSupervisorsMutation.isPending}>
          Batal
        </Button>
        {canViewSupervisors && canEditSupervisors && !isEmployeesError && (
          <Button onClick={handleSaveSupervisors} loading={updateSupervisorsMutation.isPending}>
            Simpan Supervisor
          </Button>
        )}
      </>
    )

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={officeLocation ? 'Edit Lokasi Kantor' : 'Tambah Lokasi Kantor'}
      footer={footer}
    >
      {isEditMode && (
        <div className="mb-4 flex gap-4 border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`font-body text-sm font-medium pb-2 -mb-px border-b-2 ${
              activeTab === 'info'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Info Lokasi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('supervisor')}
            className={`font-body text-sm font-medium pb-2 -mb-px border-b-2 ${
              activeTab === 'supervisor'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Supervisor
          </button>
        </div>
      )}

      {/* Kedua tab TETAP ter-mount, disembunyikan via CSS (bukan
          conditional unmount) - biar pindah tab gak bikin hilang input
          yang belum disimpan di form manapun (keputusan dikonfirmasi user). */}
      <div className={!isEditMode || activeTab === 'info' ? '' : 'hidden'}>
        {/* Grid 2 kolom dipadatkan - replikasi manual pola PositionFormModal
            (py-2 override + gap-y-3). Kode+Radius sejajar, Nama Lokasi
            col-span-2, Latitude+Longitude sejajar, Jam Masuk Mulai+Selesai
            sejajar, Jam Pulang Mulai+Selesai sejajar, Status col-span-2,
            Catatan col-span-2. */}
        <form
          id="office-location-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          noValidate
          className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="office_code" className="font-body text-[13px] font-medium text-neutral-600">
              Kode Lokasi
            </label>
            <Input id="office_code" className="py-2" error={errors.office_code?.message} {...register('office_code')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="radius_meter" className="font-body text-[13px] font-medium text-neutral-600">
              Radius (meter)
            </label>
            <Input
              id="radius_meter"
              type="number"
              min={1}
              step="1"
              inputMode="numeric"
              className="py-2"
              error={errors.radius_meter?.message}
              {...register('radius_meter')}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="office_name" className="font-body text-[13px] font-medium text-neutral-600">
              Nama Lokasi
            </label>
            <Input id="office_name" className="py-2" error={errors.office_name?.message} {...register('office_name')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="latitude" className="font-body text-[13px] font-medium text-neutral-600">
              Latitude
            </label>
            <Input
              id="latitude"
              type="number"
              step="any"
              className="py-2"
              error={errors.latitude?.message}
              {...register('latitude')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="longitude" className="font-body text-[13px] font-medium text-neutral-600">
              Longitude
            </label>
            <Input
              id="longitude"
              type="number"
              step="any"
              className="py-2"
              error={errors.longitude?.message}
              {...register('longitude')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="check_in_start" className="font-body text-[13px] font-medium text-neutral-600">
              Jam Masuk Mulai
            </label>
            <Input
              id="check_in_start"
              type="time"
              className="py-2"
              error={errors.check_in_start?.message}
              {...register('check_in_start')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="check_in_end" className="font-body text-[13px] font-medium text-neutral-600">
              Jam Masuk Selesai
            </label>
            <Input
              id="check_in_end"
              type="time"
              className="py-2"
              error={errors.check_in_end?.message}
              {...register('check_in_end')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="check_out_start" className="font-body text-[13px] font-medium text-neutral-600">
              Jam Pulang Mulai
            </label>
            <Input
              id="check_out_start"
              type="time"
              className="py-2"
              error={errors.check_out_start?.message}
              {...register('check_out_start')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="check_out_end" className="font-body text-[13px] font-medium text-neutral-600">
              Jam Pulang Selesai
            </label>
            <Input
              id="check_out_end"
              type="time"
              className="py-2"
              error={errors.check_out_end?.message}
              {...register('check_out_end')}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
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
            <label htmlFor="description" className="font-body text-[13px] font-medium text-neutral-600">
              Catatan <span className="font-normal text-neutral-400">(opsional)</span>
            </label>
            <Input id="description" className="py-2" error={errors.description?.message} {...register('description')} />
          </div>
        </form>
      </div>

      {isEditMode && (
        <div className={activeTab === 'supervisor' ? '' : 'hidden'}>
          {!canViewSupervisors ? (
            <div className="flex flex-col items-center gap-2 rounded-md bg-neutral-50 p-8 text-center">
              <Lock size={20} strokeWidth={2} className="text-neutral-400" />
              <p className="font-body text-sm text-neutral-600">
                Kamu tidak memiliki akses untuk melihat supervisor lokasi ini.
              </p>
            </div>
          ) : isSupervisorsLoading || isEmployeesLoading ? (
            <p className="font-body text-sm text-neutral-500">Memuat data supervisor...</p>
          ) : isSupervisorsError ? (
            <div className="flex flex-col items-center gap-2 rounded-md bg-neutral-50 p-8 text-center">
              <AlertTriangle size={20} strokeWidth={2} className="text-status-rejected" />
              <p className="font-body text-sm text-neutral-900">
                {supervisorsErrorObj?.status === 403
                  ? 'Kamu tidak memiliki akses untuk melihat supervisor lokasi ini.'
                  : 'Data supervisor belum dapat dimuat. Coba lagi.'}
              </p>
            </div>
          ) : isEmployeesError ? (
            <div className="flex flex-col items-center gap-2 rounded-md bg-neutral-50 p-8 text-center">
              <AlertTriangle size={20} strokeWidth={2} className="text-status-rejected" />
              <p className="font-body text-sm text-neutral-900">Gagal memuat daftar karyawan.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {!canEditSupervisors && (
                <p className="font-body text-xs text-neutral-500">
                  Kamu cuma bisa melihat, gak bisa mengubah supervisor lokasi ini.
                </p>
              )}
              <div className="max-h-64 overflow-y-auto rounded-sm border border-neutral-200">
                {(employees ?? []).map((emp) => {
                  const checked = checkedEmployeeIds.has(emp.id)
                  return (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canEditSupervisors || updateSupervisorsMutation.isPending}
                        onChange={() => toggleSupervisor(emp.id)}
                        className="h-4 w-4 shrink-0 rounded-sm border-neutral-300 accent-primary-600 disabled:cursor-not-allowed"
                      />
                      <span className="min-w-0 flex-1 truncate font-body text-sm text-neutral-900">
                        {emp.full_name}
                      </span>
                      <span className="shrink-0 font-body text-xs text-neutral-400">{emp.email}</span>
                    </label>
                  )
                })}
                {(employees ?? []).length === 0 && (
                  <p className="p-3 text-center font-body text-sm text-neutral-400">Belum ada karyawan.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>

    {/* z-[60] (BUKAN z-50 kayak Toast Page biasa) - Modal di-portal ke
        akhir <body>, jadi kalau z-index-nya SAMA (50), urutan DOM yang
        menang (Modal portal selalu lebih akhir dari Toast non-portal
        ini), Toast bisa ketutup Modal. Dinaikkan eksplisit biar toast
        supervisor SELALU di atas Modal-nya sendiri, terlepas dari
        urutan DOM. */}
    {supervisorToast && (
      <div className="fixed bottom-6 right-6 z-[60] w-80">
        <Toast
          variant={supervisorToast.variant}
          message={supervisorToast.message}
          onDismiss={() => setSupervisorToast(null)}
          duration={4000}
        />
      </div>
    )}
    </>
  )
}
