import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, AlertTriangle } from 'lucide-react'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Select } from '../../../components/ui/Select'
import { MultiSelect } from '../../../components/ui/MultiSelect'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { usePermission } from '../../../lib/permissions'
import { cn } from '../../../lib/cn'
import { useOfficeLocations } from '../../master-data/hooks/useOfficeLocations'
import {
  useEmployeeAttendanceOverride,
  useUpdateEmployeeAttendanceOverride,
  useDeleteEmployeeAttendanceOverride,
} from '../hooks/useEmployeeAttendanceOverride'
import type { OverrideScopeType, EmployeeAttendanceLocationOverrideUpdateRequest } from '../../../api/types/employeeAttendanceOverride'
import type { NormalizedApiError } from '../../../api/client'

interface EmployeeAttendanceOverrideTabProps {
  employeeId: number
}

const scopeOptions: { value: OverrideScopeType; label: string }[] = [
  { value: 'HOME_ONLY', label: 'Hanya Lokasi Kantor Utama' },
  { value: 'ALL_BRANCHES', label: 'Semua Cabang' },
  { value: 'SPECIFIC_BRANCHES', label: 'Cabang Tertentu' },
  { value: 'SUPERVISED_BRANCHES', label: 'Cabang yang Diawasi' },
]

const REASON_MAX_LENGTH = 1000

/**
 * Skema di-generate lewat factory - `required_if:scope_type,SPECIFIC_BRANCHES`
 * (backend) dan `after_or_equal:effective_start_date` (backend) direplikasi
 * di sini via superRefine, client-side, buat UX (pesan instan tanpa round-trip),
 * backend TETAP jadi otoritas validasi final.
 */
function buildOverrideSchema() {
  return z
    .object({
      scope_type: z.string().min(1, 'Cakupan wajib dipilih'),
      office_location_ids: z.array(z.string()).optional(),
      effective_start_date: z.string().optional(),
      effective_end_date: z.string().optional(),
      reason: z
        .string()
        .min(1, 'Alasan wajib diisi')
        .max(REASON_MAX_LENGTH, `Alasan maksimal ${REASON_MAX_LENGTH} karakter`),
    })
    .superRefine((data, ctx) => {
      if (data.scope_type === 'SPECIFIC_BRANCHES' && (!data.office_location_ids || data.office_location_ids.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['office_location_ids'],
          message: 'Pilih minimal 1 cabang',
        })
      }
      if (data.effective_start_date && data.effective_end_date && data.effective_end_date < data.effective_start_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['effective_end_date'],
          message: 'Tanggal berakhir harus setelah atau sama dengan tanggal mulai',
        })
      }
    })
}

type OverrideFormValues = z.infer<ReturnType<typeof buildOverrideSchema>>

type OverrideStatus = 'active' | 'not_yet' | 'ended'

/**
 * isCurrentlyActive() ADA di model backend (EmployeeAttendanceLocationOverride.php)
 * TAPI TIDAK diekspos sebagai field JSON di response show() (dikonfirmasi
 * dari controller - cuma method PHP biasa, bukan accessor/appended
 * attribute) - dihitung ulang di sini dari effective_start_date/end_date
 * vs tanggal hari ini, cermin logic yang sama persis.
 */
function computeOverrideStatus(startDate: string | null, endDate: string | null): OverrideStatus {
  const today = new Date().toISOString().slice(0, 10)
  if (startDate && today < startDate) return 'not_yet'
  if (endDate && today > endDate) return 'ended'
  return 'active'
}

/**
 * PENTING soal warna badge (pelajaran bug badge Audit Log): status-approved/
 * submitted/rejected dipasang sebagai teks BERWARNA di atas background
 * tint berwarna yang SAMA (mis. text-status-approved di atas bg-status-
 * approved/10) gagal WCAG AA di beberapa kombinasi (4.17-4.36:1, di
 * bawah 4.5). Badge di sini SENGAJA desain beda total: teks SELALU
 * text-neutral-800 (aman di atas background apa pun yang cukup terang -
 * neutral-800 di atas neutral-100 = kontras tinggi, jauh di atas 4.5:1),
 * warna status cuma dipakai buat titik dekoratif kecil (aria-hidden,
 * gak ikut dicek rule color-contrast axe karena bukan teks) - bukan
 * warna teks. Menghindari kategori bug yang sama sama sekali, bukan
 * cuma pilih pasangan warna baru yang (mungkin) kebetulan lolos.
 */
const statusMeta: Record<OverrideStatus, { label: string; dotClassName: string }> = {
  active: { label: 'Aktif Sekarang', dotClassName: 'bg-status-approved' },
  not_yet: { label: 'Belum Berlaku', dotClassName: 'bg-status-pending' },
  ended: { label: 'Sudah Berakhir', dotClassName: 'bg-neutral-500' },
}

function OverrideStatusIndicator({ startDate, endDate }: { startDate: string | null; endDate: string | null }) {
  const status = computeOverrideStatus(startDate, endDate)
  const meta = statusMeta[status]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-neutral-100 px-2 py-1 font-body text-xs font-medium text-neutral-800">
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClassName)} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

export function EmployeeAttendanceOverrideTab({ employeeId }: EmployeeAttendanceOverrideTabProps) {
  const canView = usePermission('attendance-location-policy.view')
  const canEdit = usePermission('attendance-location-policy.update')

  const { data, isLoading, isError } = useEmployeeAttendanceOverride(employeeId, canView)
  const { data: officeLocations } = useOfficeLocations(canView)
  const updateMutation = useUpdateEmployeeAttendanceOverride(employeeId)
  const deleteMutation = useDeleteEmployeeAttendanceOverride(employeeId)

  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)
  const [pendingSubmitValues, setPendingSubmitValues] = useState<OverrideFormValues | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const schema = buildOverrideSchema()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OverrideFormValues>({ resolver: zodResolver(schema) })

  const override = data?.override ?? null

  useEffect(() => {
    if (!data) return
    reset({
      scope_type: override?.scope_type ?? '',
      office_location_ids: override?.offices?.map((o) => String(o.id)) ?? [],
      effective_start_date: override?.effective_start_date ?? '',
      effective_end_date: override?.effective_end_date ?? '',
      reason: override?.reason ?? '',
    })
  }, [data, override, reset])

  const scopeType = watch('scope_type')
  const reasonValue = watch('reason') ?? ''
  const officeLocationIds = watch('office_location_ids') ?? []

  const officeLocationOptions = (officeLocations ?? []).map((o) => ({ value: String(o.id), label: o.office_name }))

  function onFormSubmit(values: OverrideFormValues) {
    // Efeknya langsung ke sistem absensi (gak ada approval flow) - form
    // TIDAK langsung submit ke API di sini, cuma nyimpen values &
    // buka ConfirmDialog. Submit beneran cuma kejadian pas user klik
    // "Ya, Lanjutkan" di handleConfirmSubmit di bawah.
    setPendingSubmitValues(values)
  }

  async function handleConfirmSubmit() {
    if (!pendingSubmitValues) return
    try {
      const payload: EmployeeAttendanceLocationOverrideUpdateRequest = {
        scope_type: pendingSubmitValues.scope_type as OverrideScopeType,
        office_location_ids:
          pendingSubmitValues.scope_type === 'SPECIFIC_BRANCHES'
            ? (pendingSubmitValues.office_location_ids ?? []).map(Number)
            : undefined,
        effective_start_date: pendingSubmitValues.effective_start_date || null,
        effective_end_date: pendingSubmitValues.effective_end_date || null,
        reason: pendingSubmitValues.reason,
      }
      await updateMutation.mutateAsync(payload)
      setToast({ variant: 'success', message: 'Pengecualian lokasi absensi berhasil disimpan.' })
      setPendingSubmitValues(null)
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.fieldErrors) {
        for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
          if (field === 'scope_type' || field === 'office_location_ids' || field === 'effective_start_date' || field === 'effective_end_date' || field === 'reason') {
            setError(field as keyof OverrideFormValues, { message: messages[0] })
          }
        }
      } else {
        setToast({ variant: 'error', message: apiError.message })
      }
      setPendingSubmitValues(null)
    }
  }

  async function handleConfirmDelete() {
    try {
      await deleteMutation.mutateAsync()
      setToast({ variant: 'success', message: 'Pengecualian lokasi absensi berhasil dihapus.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setDeleteConfirmOpen(false)
    }
  }

  return (
    <PermissionGate
      code="attendance-location-policy.view"
      fallback={
        <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
          <Lock size={24} strokeWidth={2} className="text-neutral-400" />
          <p className="font-body text-sm text-neutral-600">
            Kamu tidak memiliki akses untuk melihat pengecualian lokasi absensi.
          </p>
        </div>
      }
    >
      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
          <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
          <p className="font-body text-sm text-neutral-900">Data pengecualian lokasi absensi gagal dimuat.</p>
        </div>
      ) : isLoading || !data ? (
        <div className="rounded-md bg-white p-12 text-center shadow-sm">
          <p className="font-body text-sm text-neutral-600">Memuat data pengecualian lokasi absensi...</p>
        </div>
      ) : (
        <div className="max-w-3xl rounded-md bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="font-body text-sm text-neutral-600">
              {data.has_override
                ? 'Karyawan ini punya pengecualian lokasi absensi - mengalahkan kebijakan posisinya.'
                : 'Karyawan ini belum memiliki pengecualian lokasi absensi.'}
            </p>
            {data.has_override && override && (
              <OverrideStatusIndicator startDate={override.effective_start_date} endDate={override.effective_end_date} />
            )}
          </div>

          {!canEdit && (
            <p className="mb-4 flex items-center gap-1 font-body text-xs text-neutral-600">
              <Lock size={11} strokeWidth={2} />
              Kamu cuma bisa melihat, gak bisa mengubah pengecualian ini.
            </p>
          )}

          <form
            id="override-form"
            onSubmit={handleSubmit(onFormSubmit)}
            noValidate
            className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
          >
            <div className={cn('flex flex-col gap-1.5', scopeType !== 'SPECIFIC_BRANCHES' && 'sm:col-span-2')}>
              <label htmlFor="scope_type" className="font-body text-[13px] font-medium text-neutral-600">
                Cakupan
              </label>
              <Select
                id="scope_type"
                className="py-2"
                options={scopeOptions}
                placeholder="Pilih Cakupan"
                disabled={!canEdit}
                error={errors.scope_type?.message}
                {...register('scope_type')}
              />
            </div>

            {scopeType === 'SPECIFIC_BRANCHES' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="office_location_ids" className="font-body text-[13px] font-medium text-neutral-600">
                  Cabang
                </label>
                <MultiSelect
                  id="office_location_ids"
                  options={officeLocationOptions}
                  value={officeLocationIds}
                  onChange={(next) => setValue('office_location_ids', next, { shouldValidate: true })}
                  placeholder="Pilih Cabang"
                  disabled={!canEdit}
                  error={errors.office_location_ids?.message}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="effective_start_date" className="font-body text-[13px] font-medium text-neutral-600">
                Berlaku Mulai <span className="font-normal text-neutral-600">(opsional)</span>
              </label>
              <Input
                id="effective_start_date"
                type="date"
                className="py-2"
                disabled={!canEdit}
                error={errors.effective_start_date?.message}
                {...register('effective_start_date')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="effective_end_date" className="font-body text-[13px] font-medium text-neutral-600">
                Berlaku Sampai <span className="font-normal text-neutral-600">(opsional)</span>
              </label>
              <Input
                id="effective_end_date"
                type="date"
                className="py-2"
                disabled={!canEdit}
                error={errors.effective_end_date?.message}
                {...register('effective_end_date')}
              />
            </div>

            <p className="font-body text-xs text-neutral-600 sm:col-span-2 sm:-mt-2">
              Kosongkan untuk berlaku permanen.
            </p>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="reason" className="font-body text-[13px] font-medium text-neutral-600">
                Alasan
              </label>
              <Textarea
                id="reason"
                rows={3}
                maxLength={REASON_MAX_LENGTH}
                disabled={!canEdit}
                error={errors.reason?.message}
                {...register('reason')}
              />
              <p className="font-body text-xs text-neutral-600">
                {reasonValue.length} / {REASON_MAX_LENGTH} karakter
              </p>
            </div>
          </form>

          {canEdit && (
            <div className="mt-6 flex items-center justify-between gap-2">
              <div>
                {data.has_override && (
                  <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)} disabled={deleteMutation.isPending}>
                    Hapus Override
                  </Button>
                )}
              </div>
              <Button type="submit" form="override-form" loading={updateMutation.isPending}>
                Simpan
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Gak ada approval flow (dikonfirmasi investigasi backend) - PUT
          langsung apply real-time ke sistem absensi karyawan, jadi WAJIB
          ada konfirmasi eksplisit sebelum submit beneran (dan sebelum hapus). */}
      <ConfirmDialog
        open={!!pendingSubmitValues}
        onCancel={() => setPendingSubmitValues(null)}
        onConfirm={handleConfirmSubmit}
        title="Simpan Pengecualian Lokasi Absensi"
        description="Perubahan ini akan langsung berlaku untuk absensi karyawan ini. Lanjutkan?"
        confirmLabel="Ya, Simpan"
        isConfirming={updateMutation.isPending}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Pengecualian Lokasi Absensi"
        description="Karyawan ini akan langsung kembali mengikuti kebijakan posisinya untuk absensi. Lanjutkan?"
        variant="danger"
        confirmLabel="Ya, Hapus"
        isConfirming={deleteMutation.isPending}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </PermissionGate>
  )
}
