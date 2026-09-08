import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Paperclip } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Label } from '../../../components/ui/Label'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { Button } from '../../../components/ui/Button'
import { LeaveQuotaWidget } from './LeaveQuotaWidget'
import { useCreateLeave } from '../hooks/useLeaveMutations'
import type { NormalizedApiError } from '../../../api/client'
import type { LeaveType } from '../../../api/types/leave'

const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

/** 6 nilai PERSIS dari `SHOW COLUMNS FROM leaves` (dikonfirmasi sesi investigasi Task 11) - urutan sama seperti enum migration 2026_07_26_100000. Label kanan cuma terjemahan tampilan, value yang dikirim ke backend TETAP string bahasa Inggris persis. */
const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: 'Annual Leave', label: 'Annual Leave (Cuti Tahunan)' },
  { value: 'Sick Leave', label: 'Sick Leave (Sakit)' },
  { value: 'Permission', label: 'Permission (Izin)' },
  { value: 'Maternity Leave', label: 'Maternity Leave (Cuti Melahirkan)' },
  { value: 'Unpaid Leave', label: 'Unpaid Leave (Cuti Tanpa Gaji)' },
  { value: 'Business Trip', label: 'Business Trip (Perjalanan Dinas)' },
]

const schema = z
  .object({
    leave_type: z.string().min(1, 'Jenis cuti wajib dipilih'),
    start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
    end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
    reason: z.string().min(1, 'Alasan wajib diisi').max(1000, 'Alasan maksimal 1000 karakter'),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
    path: ['end_date'],
  })

type LeaveFormValues = z.infer<typeof schema>

interface LeaveRequestFormProps {
  employeeId: number
  onSuccess: () => void
}

/**
 * Form pengajuan cuti (Task 11 Bagian C.3) - KHUSUS role EMPLOYEE
 * (employee_id WAJIB diisi eksplisit dari user yang login, sesuai
 * StoreLeaveRequest yang mewajibkan field ini di body - resolveEmployeeIdForStore
 * di backend BARU jalan SETELAH validasi FormRequest lolos, jadi
 * frontend TETAP wajib kirim employee_id sendiri walau backend nanti
 * override-nya kalau beda, dikonfirmasi lewat curl langsung).
 *
 * total_days TIDAK diinput manual - preview dihitung persis sama
 * formula backend (Carbon::parse(start)->diffInDays(end) + 1, inklusif
 * kedua ujung) supaya user tau berapa hari yang bakal kepotong kuota
 * SEBELUM submit, bukan kaget pas ditolak backend.
 */
export function LeaveRequestForm({ employeeId, onSuccess }: LeaveRequestFormProps) {
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const createMutation = useCreateLeave()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeaveFormValues>({ resolver: zodResolver(schema) })

  const leaveType = watch('leave_type')
  const startDate = watch('start_date')
  const endDate = watch('end_date')

  const totalDaysPreview = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null
    const diffMs = new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()
    return Math.round(diffMs / 86_400_000) + 1
  }, [startDate, endDate])

  // Attachment lepas dari react-hook-form (input file gak bisa
  // "controlled" biasa) - pola sama persis handlePhotoChange di
  // EmployeeFormPage.tsx. Validasi frontend SEBAGAI GARDA PERTAMA
  // (backend: nullable|file|mimes:pdf,jpg,jpeg,png|max:2048).
  function handleAttachmentChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setAttachment(null)
      setAttachmentError(null)
      return
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachmentError('Format lampiran harus PDF, JPG, atau PNG.')
      e.target.value = ''
      setAttachment(null)
      return
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setAttachmentError('Ukuran lampiran maksimal 2MB.')
      e.target.value = ''
      setAttachment(null)
      return
    }
    setAttachmentError(null)
    setAttachment(file)
  }

  async function onSubmit(values: LeaveFormValues) {
    setSubmitError(null)
    try {
      await createMutation.mutateAsync({
        employee_id: employeeId,
        leave_type: values.leave_type,
        start_date: values.start_date,
        end_date: values.end_date,
        reason: values.reason,
        attachment,
      })
      reset()
      setAttachment(null)
      onSuccess()
    } catch (err) {
      const apiError = err as NormalizedApiError
      setSubmitError(apiError.message)
    }
  }

  // Error submit (mis. kuota gak cukup) hilang otomatis begitu user
  // mulai ganti input lagi - gak nyangkut permanen sampai submit ulang.
  useEffect(() => {
    setSubmitError(null)
  }, [leaveType, startDate, endDate])

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <LeaveQuotaWidget employeeId={employeeId} />
      </div>

      <Card className="lg:col-span-2">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-type">Jenis Cuti</Label>
              <Select
                id="leave-type"
                options={LEAVE_TYPE_OPTIONS}
                placeholder="Pilih jenis cuti"
                error={errors.leave_type?.message}
                {...register('leave_type')}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-start-2 sm:row-span-2 sm:row-start-1">
              <Label htmlFor="leave-reason">Alasan</Label>
              <Textarea id="leave-reason" rows={4} error={errors.reason?.message} {...register('reason')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-start-date">Tanggal Mulai</Label>
              <Input id="leave-start-date" type="date" error={errors.start_date?.message} {...register('start_date')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-end-date">Tanggal Selesai</Label>
              <Input id="leave-end-date" type="date" error={errors.end_date?.message} {...register('end_date')} />
            </div>
          </div>

          {totalDaysPreview !== null && (
            <p className="font-body text-sm text-neutral-600">
              Total: <span className="font-semibold text-neutral-900">{totalDaysPreview} hari</span>
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leave-attachment">Lampiran (opsional)</Label>
            <div className="flex items-center gap-2">
              <Paperclip size={16} strokeWidth={2} className="shrink-0 text-neutral-600" aria-hidden="true" />
              <input
                id="leave-attachment"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={handleAttachmentChange}
                className="font-body text-sm text-neutral-900 file:mr-3 file:rounded-sm file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:font-body file:text-sm file:font-medium file:text-neutral-900"
              />
            </div>
            <p className="font-body text-xs text-neutral-600">Format PDF, JPG, atau PNG, maksimal 2MB.</p>
            {attachmentError && <p className="font-body text-xs text-status-rejected">{attachmentError}</p>}
          </div>

          {submitError && (
            <p role="alert" className="font-body text-sm text-status-rejected">
              {submitError}
            </p>
          )}

          <div>
            <Button type="submit" loading={createMutation.isPending}>
              Ajukan Cuti
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
