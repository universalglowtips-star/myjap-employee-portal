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
import { Label } from '../../../components/ui/Label'
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
  { value: 'ANYWHERE', label: 'Bebas (Tanpa Batasan Lokasi)' },
]

const REASON_MAX_LENGTH = 1000

/**
 * scope_type dipecah 2 SISI (check-in/check-out, Task per-arah) -
 * masing-masing punya field scope_type + office_location_ids SENDIRI,
 * makanya superRefine juga dobel (1 per arah). Tanggal berlaku + alasan
 * TETAP 1 set dipakai bareng buat KEDUA arah (dikonfirmasi eksplisit,
 * BUKAN diduplikasi) - required_if (backend) & superRefine (di sini)
 * direplikasi client-side buat UX instan, backend TETAP otoritas final.
 */
function buildOverrideSchema() {
  return z
    .object({
      scope_type_check_in: z.string().min(1, 'Cakupan saat Absen Masuk wajib dipilih'),
      office_location_ids_check_in: z.array(z.string()).optional(),
      scope_type_check_out: z.string().min(1, 'Cakupan saat Absen Pulang wajib dipilih'),
      office_location_ids_check_out: z.array(z.string()).optional(),
      effective_start_date: z.string().optional(),
      effective_end_date: z.string().optional(),
      reason: z
        .string()
        .min(1, 'Alasan wajib diisi')
        .max(REASON_MAX_LENGTH, `Alasan maksimal ${REASON_MAX_LENGTH} karakter`),
    })
    .superRefine((data, ctx) => {
      if (data.scope_type_check_in === 'SPECIFIC_BRANCHES' && (!data.office_location_ids_check_in || data.office_location_ids_check_in.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['office_location_ids_check_in'],
          message: 'Pilih minimal 1 cabang',
        })
      }
      if (data.scope_type_check_out === 'SPECIFIC_BRANCHES' && (!data.office_location_ids_check_out || data.office_location_ids_check_out.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['office_location_ids_check_out'],
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
 * vs tanggal hari ini, cermin logic yang sama persis. Status ini
 * SHARED buat kedua arah (tanggal berlaku gak dipecah per arah).
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

/** 1 blok Cakupan+Cabang - dipakai 2x (check-in/check-out), parameterized biar gak duplikasi JSX identik 2x penuh. */
interface DirectionRuleFieldsProps {
  legend: string
  scopeFieldName: 'scope_type_check_in' | 'scope_type_check_out'
  officesFieldName: 'office_location_ids_check_in' | 'office_location_ids_check_out'
  scopeValue: string
  officeIds: string[]
  scopeError?: string
  officesError?: string
  officeLocationOptions: { value: string; label: string }[]
  canEdit: boolean
  register: ReturnType<typeof useForm<OverrideFormValues>>['register']
  setValue: ReturnType<typeof useForm<OverrideFormValues>>['setValue']
}

function DirectionRuleFields({
  legend,
  scopeFieldName,
  officesFieldName,
  scopeValue,
  officeIds,
  scopeError,
  officesError,
  officeLocationOptions,
  canEdit,
  register,
  setValue,
}: DirectionRuleFieldsProps) {
  return (
    <div className="rounded-md border border-neutral-200 p-4">
      <p className="mb-3 font-body text-sm font-semibold text-neutral-900">{legend}</p>
      <div className={cn('grid grid-cols-1 gap-x-4 gap-y-3', scopeValue !== 'SPECIFIC_BRANCHES' ? '' : 'sm:grid-cols-2')}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={scopeFieldName}>Cakupan</Label>
          <Select
            id={scopeFieldName}
            className="py-2"
            options={scopeOptions}
            placeholder="Pilih Cakupan"
            disabled={!canEdit}
            error={scopeError}
            {...register(scopeFieldName)}
          />
        </div>

        {scopeValue === 'SPECIFIC_BRANCHES' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={officesFieldName}>Cabang</Label>
            <MultiSelect
              id={officesFieldName}
              options={officeLocationOptions}
              value={officeIds}
              onChange={(next) => setValue(officesFieldName, next, { shouldValidate: true })}
              placeholder="Pilih Cabang"
              disabled={!canEdit}
              error={officesError}
            />
          </div>
        )}
      </div>
    </div>
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
      scope_type_check_in: override?.scope_type_check_in ?? '',
      office_location_ids_check_in: override?.offices_check_in?.map((o) => String(o.id)) ?? [],
      scope_type_check_out: override?.scope_type_check_out ?? '',
      office_location_ids_check_out: override?.offices_check_out?.map((o) => String(o.id)) ?? [],
      effective_start_date: override?.effective_start_date ?? '',
      effective_end_date: override?.effective_end_date ?? '',
      reason: override?.reason ?? '',
    })
  }, [data, override, reset])

  const scopeTypeCheckIn = watch('scope_type_check_in')
  const scopeTypeCheckOut = watch('scope_type_check_out')
  const reasonValue = watch('reason') ?? ''
  const officeLocationIdsCheckIn = watch('office_location_ids_check_in') ?? []
  const officeLocationIdsCheckOut = watch('office_location_ids_check_out') ?? []

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
        scope_type_check_in: pendingSubmitValues.scope_type_check_in as OverrideScopeType,
        office_location_ids_check_in:
          pendingSubmitValues.scope_type_check_in === 'SPECIFIC_BRANCHES'
            ? (pendingSubmitValues.office_location_ids_check_in ?? []).map(Number)
            : undefined,
        scope_type_check_out: pendingSubmitValues.scope_type_check_out as OverrideScopeType,
        office_location_ids_check_out:
          pendingSubmitValues.scope_type_check_out === 'SPECIFIC_BRANCHES'
            ? (pendingSubmitValues.office_location_ids_check_out ?? []).map(Number)
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
          if (
            field === 'scope_type_check_in' ||
            field === 'office_location_ids_check_in' ||
            field === 'scope_type_check_out' ||
            field === 'office_location_ids_check_out' ||
            field === 'effective_start_date' ||
            field === 'effective_end_date' ||
            field === 'reason'
          ) {
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

          <form id="override-form" onSubmit={handleSubmit(onFormSubmit)} noValidate className="flex flex-col gap-4">
            <DirectionRuleFields
              legend="Aturan Saat Absen Masuk"
              scopeFieldName="scope_type_check_in"
              officesFieldName="office_location_ids_check_in"
              scopeValue={scopeTypeCheckIn}
              officeIds={officeLocationIdsCheckIn}
              scopeError={errors.scope_type_check_in?.message}
              officesError={errors.office_location_ids_check_in?.message}
              officeLocationOptions={officeLocationOptions}
              canEdit={canEdit}
              register={register}
              setValue={setValue}
            />

            <DirectionRuleFields
              legend="Aturan Saat Absen Pulang"
              scopeFieldName="scope_type_check_out"
              officesFieldName="office_location_ids_check_out"
              scopeValue={scopeTypeCheckOut}
              officeIds={officeLocationIdsCheckOut}
              scopeError={errors.scope_type_check_out?.message}
              officesError={errors.office_location_ids_check_out?.message}
              officeLocationOptions={officeLocationOptions}
              canEdit={canEdit}
              register={register}
              setValue={setValue}
            />

            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="effective_start_date">
                  Berlaku Mulai <span className="font-normal text-neutral-600">(opsional)</span>
                </Label>
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
                <Label htmlFor="effective_end_date">
                  Berlaku Sampai <span className="font-normal text-neutral-600">(opsional)</span>
                </Label>
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
                Kosongkan untuk berlaku permanen. Berlaku buat KEDUA arah (Absen Masuk & Pulang) sekaligus.
              </p>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="reason">Alasan</Label>
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
        description="Karyawan ini akan langsung kembali mengikuti kebijakan posisinya untuk absensi (KEDUA arah - Absen Masuk & Pulang). Lanjutkan?"
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
