import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import { Label } from '../../../components/ui/Label'
import type { WorkShift, WorkShiftCreateRequest } from '../../../api/types/workShift'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Backend TIDAK validasi format jam sama sekali (cuma 'required'/'nullable'
 * polos, dikonfirmasi dari WorkShiftController) - native <input type="time">
 * jadi SATU-SATUNYA garda format di seluruh sistem, bukan cuma pilihan
 * kenyamanan. z.string().min(1) di sini cuma mastiin field WAJIB keisi
 * (browser sendiri yang jaga formatnya, gak mungkin ngirim string bebas
 * lewat time picker native).
 */
const workShiftSchema = z.object({
  shift_code: z.string().min(1, 'Kode shift wajib diisi'),
  shift_name: z.string().min(1, 'Nama shift wajib diisi'),
  check_in_time: z.string().min(1, 'Jam masuk wajib diisi'),
  check_out_time: z.string().min(1, 'Jam pulang wajib diisi'),
  break_start: z.string().optional(),
  break_end: z.string().optional(),
  late_tolerance: z
    .string()
    .min(1, 'Toleransi telat wajib diisi')
    .refine((v) => !Number.isNaN(Number(v)), 'Toleransi telat harus berupa angka')
    .refine((v) => Number(v) >= 0, 'Toleransi telat tidak boleh negatif'),
  is_active: z.string().min(1, 'Status wajib dipilih'),
})

type WorkShiftFormValues = z.infer<typeof workShiftSchema>

interface WorkShiftFormModalProps {
  open: boolean
  onClose: () => void
  /** Kalau diisi = mode edit, kalau undefined = mode create. */
  workShift?: WorkShift
  onSubmit: (payload: WorkShiftCreateRequest) => Promise<void>
  isSubmitting: boolean
}

const statusOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

/** "HH:MM:SS" (bentuk asli dari backend) -> "HH:MM" (satu-satunya format yang diterima <input type="time"> value). Null/undefined -> string kosong. */
function toTimeInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : ''
}

export function WorkShiftFormModal({ open, onClose, workShift, onSubmit, isSubmitting }: WorkShiftFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<WorkShiftFormValues>({ resolver: zodResolver(workShiftSchema) })

  // is_active TRUTHY check (BUKAN String(workShift.is_active)) - pola
  // sama persis Position/Role: kolom boolean tanpa $casts eksplisit,
  // backend bisa balikin raw integer 1/0.
  useEffect(() => {
    if (open) {
      reset({
        shift_code: workShift?.shift_code ?? '',
        shift_name: workShift?.shift_name ?? '',
        check_in_time: toTimeInputValue(workShift?.check_in_time),
        check_out_time: toTimeInputValue(workShift?.check_out_time),
        break_start: toTimeInputValue(workShift?.break_start),
        break_end: toTimeInputValue(workShift?.break_end),
        late_tolerance: workShift ? String(workShift.late_tolerance) : '15',
        is_active: workShift ? (workShift.is_active ? 'true' : 'false') : 'true',
      })
    }
  }, [open, workShift, reset])

  async function handleFormSubmit(values: WorkShiftFormValues) {
    try {
      await onSubmit({
        shift_code: values.shift_code,
        shift_name: values.shift_name,
        check_in_time: values.check_in_time,
        check_out_time: values.check_out_time,
        break_start: values.break_start || null,
        break_end: values.break_end || null,
        late_tolerance: Number(values.late_tolerance),
        is_active: values.is_active === 'true',
      })
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.fieldErrors) {
        for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
          if (
            field === 'shift_code' ||
            field === 'shift_name' ||
            field === 'check_in_time' ||
            field === 'check_out_time' ||
            field === 'break_start' ||
            field === 'break_end' ||
            field === 'late_tolerance' ||
            field === 'is_active'
          ) {
            setError(field as keyof WorkShiftFormValues, { message: messages[0] })
          }
        }
      }
      // Error non-validasi (403/500 dsb) ditangani di Page (Toast) - Modal ini cuma urus form-level error.
      throw err
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={workShift ? 'Edit Shift Kerja' : 'Tambah Shift Kerja'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="work-shift-form" loading={isSubmitting}>
            Simpan
          </Button>
        </>
      }
    >
      {/* Grid 2 kolom dipadatkan - REPLIKASI MANUAL pola PositionFormModal
          (py-2 override + gap-y-3), BUKAN inherited default - pola ini
          sengaja di-scope per-komponen, bukan shared default (sesuai
          keputusan sesi sebelumnya, wajib direplikasi tiap form >4 field).
          Kode Shift+Toleransi Telat sejajar (field pendek), Nama Shift
          col-span-2 penuh, Jam Masuk+Jam Pulang sejajar, Jam Istirahat
          Mulai+Selesai sejajar, Status col-span-2 (gak ada field pendek
          lain buat dipasangkan). */}
      <form
        id="work-shift-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        noValidate
        className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="shift_code">
            Kode Shift
          </Label>
          <Input id="shift_code" className="py-2" error={errors.shift_code?.message} {...register('shift_code')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="late_tolerance">
            Toleransi Telat (menit)
          </Label>
          <Input
            id="late_tolerance"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            className="py-2"
            error={errors.late_tolerance?.message}
            {...register('late_tolerance')}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="shift_name">
            Nama Shift
          </Label>
          <Input id="shift_name" className="py-2" error={errors.shift_name?.message} {...register('shift_name')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="check_in_time">
            Jam Masuk
          </Label>
          <Input
            id="check_in_time"
            type="time"
            className="py-2"
            error={errors.check_in_time?.message}
            {...register('check_in_time')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="check_out_time">
            Jam Pulang
          </Label>
          <Input
            id="check_out_time"
            type="time"
            className="py-2"
            error={errors.check_out_time?.message}
            {...register('check_out_time')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="break_start">
            Jam Istirahat Mulai <span className="font-normal text-neutral-600">(opsional)</span>
          </Label>
          <Input
            id="break_start"
            type="time"
            className="py-2"
            error={errors.break_start?.message}
            {...register('break_start')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="break_end">
            Jam Istirahat Selesai <span className="font-normal text-neutral-600">(opsional)</span>
          </Label>
          <Input
            id="break_end"
            type="time"
            className="py-2"
            error={errors.break_end?.message}
            {...register('break_end')}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="is_active">
            Status
          </Label>
          <Select
            id="is_active"
            className="py-2"
            options={statusOptions}
            error={errors.is_active?.message}
            {...register('is_active')}
          />
        </div>
      </form>
    </Modal>
  )
}
