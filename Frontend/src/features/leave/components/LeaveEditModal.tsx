import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Label } from '../../../components/ui/Label'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { useUpdateLeave } from '../hooks/useLeaveMutations'
import type { NormalizedApiError } from '../../../api/client'
import type { Leave, LeaveType } from '../../../api/types/leave'

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

type EditFormValues = z.infer<typeof schema>

interface LeaveEditModalProps {
  leave: Leave | null
  onClose: () => void
  onSuccess: () => void
  onError: (message: string) => void
}

/**
 * Modal edit khusus HRD (leave.update), cuma bisa dibuka untuk baris
 * status Pending (dicek di pemanggil - LeaveAdminPage tidak nampilin
 * tombol Edit sama sekali kalau bukan Pending, backend juga nolak
 * 422 kalau dipaksa lewat request manual, lihat LeaveController::update()).
 *
 * TIDAK support ganti attachment di sini (di luar scope Task 11) -
 * JSON PUT biasa, bukan FormData - lihat komentar updateLeave() di
 * api/endpoints/leave.ts soal gotcha PUT+multipart kalau nanti dibutuhkan.
 */
export function LeaveEditModal({ leave, onClose, onSuccess, onError }: LeaveEditModalProps) {
  const updateMutation = useUpdateLeave()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(schema),
    values: leave
      ? { leave_type: leave.leave_type, start_date: leave.start_date, end_date: leave.end_date, reason: leave.reason }
      : undefined,
  })

  async function onSubmit(values: EditFormValues) {
    if (!leave) return
    try {
      await updateMutation.mutateAsync({ id: leave.id, payload: values })
      reset()
      onSuccess()
    } catch (err) {
      const apiError = err as NormalizedApiError
      onError(apiError.message)
    }
  }

  return (
    <Modal open={!!leave} onClose={onClose} title="Edit Pengajuan Cuti">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-leave-type">Jenis Cuti</Label>
          <Select id="edit-leave-type" options={LEAVE_TYPE_OPTIONS} error={errors.leave_type?.message} {...register('leave_type')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-start-date">Tanggal Mulai</Label>
            <Input id="edit-start-date" type="date" error={errors.start_date?.message} {...register('start_date')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-end-date">Tanggal Selesai</Label>
            <Input id="edit-end-date" type="date" error={errors.end_date?.message} {...register('end_date')} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-reason">Alasan</Label>
          <Textarea id="edit-reason" rows={3} error={errors.reason?.message} {...register('reason')} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={updateMutation.isPending}>
            Batal
          </Button>
          <Button type="submit" loading={updateMutation.isPending}>
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  )
}
