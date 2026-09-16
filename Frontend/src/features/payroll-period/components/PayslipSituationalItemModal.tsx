import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import { Label } from '../../../components/ui/Label'
import { useSalaryComponents } from '../../master-data/hooks/useSalaryComponents'
import { useAddSituationalPayslipItem } from '../hooks/useAddSituationalPayslipItem'
import type { Payslip } from '../../../api/types/payslip'
import type { NormalizedApiError } from '../../../api/client'

const situationalItemSchema = z.object({
  salary_component_id: z.string().min(1, 'Komponen wajib dipilih'),
  amount: z
    .string()
    .min(1, 'Jumlah wajib diisi')
    .refine((v) => !Number.isNaN(Number(v)), 'Jumlah harus berupa angka')
    .refine((v) => Number(v) >= 0, 'Jumlah tidak boleh negatif'),
  notes: z.string().optional(),
})

type SituationalItemFormValues = z.infer<typeof situationalItemSchema>

interface PayslipSituationalItemModalProps {
  open: boolean
  onClose: () => void
  payslip: Payslip | null
  payrollPeriodId: number
  onSuccess: (message: string) => void
}

/**
 * Task 15b (instruksi E.2, penutup) - "sediakan cara tambah item
 * Situasional manual per karyawan" setelah generate. Reuse
 * PayslipController::update() lewat useAddSituationalPayslipItem -
 * hook itu sendiri yang fetch payslip TERBARU sebelum submit (lihat
 * komentar di sana), Modal ini murni kumpulin input (komponen+jumlah+
 * catatan), TIDAK pegang state item existing sama sekali - menghindari
 * kelas bug "submit pakai daftar item basi" secara struktural.
 */
export function PayslipSituationalItemModal({ open, onClose, payslip, payrollPeriodId, onSuccess }: PayslipSituationalItemModalProps) {
  const { data: allComponents } = useSalaryComponents()
  const situationalOptions = (allComponents ?? [])
    .filter((c) => c.category === 'situational' && c.is_active)
    .map((c) => ({ value: String(c.id), label: c.name }))

  const addMutation = useAddSituationalPayslipItem(payrollPeriodId)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SituationalItemFormValues>({ resolver: zodResolver(situationalItemSchema) })

  useEffect(() => {
    if (open) {
      reset({ salary_component_id: '', amount: '', notes: '' })
    }
  }, [open, reset])

  async function handleFormSubmit(values: SituationalItemFormValues) {
    if (!payslip) return
    try {
      await addMutation.mutateAsync({
        payslipId: payslip.id,
        salaryComponentId: Number(values.salary_component_id),
        amount: Number(values.amount),
        notes: values.notes || null,
      })
      onSuccess('Item Situasional berhasil ditambahkan.')
      onClose()
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.fieldErrors) {
        for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
          if (field === 'salary_component_id' || field === 'amount' || field === 'notes') {
            setError(field as keyof SituationalItemFormValues, { message: messages[0] })
          }
        }
      } else {
        // 422 non-field (payslip/periode terkunci dst) - satu-satunya
        // tempat wajar buat nampilin ini di modal kecil ini, gak ada
        // Toast tersendiri di level Modal (beda dari pola Page biasa).
        setError('salary_component_id', { message: apiError.message })
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={payslip ? `Tambah Item Situasional - ${payslip.employee?.full_name ?? 'Karyawan'}` : 'Tambah Item Situasional'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={addMutation.isPending}>
            Batal
          </Button>
          <Button type="submit" form="situational-item-form" loading={addMutation.isPending}>
            Simpan
          </Button>
        </>
      }
    >
      <form id="situational-item-form" onSubmit={handleSubmit(handleFormSubmit)} noValidate className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary_component_id">Komponen Situasional</Label>
          <Select
            id="salary_component_id"
            className="py-2"
            options={situationalOptions}
            placeholder={situationalOptions.length === 0 ? 'Belum ada komponen Situasional aktif' : 'Pilih Komponen'}
            disabled={situationalOptions.length === 0}
            error={errors.salary_component_id?.message}
            {...register('salary_component_id')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Jumlah (Rp)</Label>
          <Input
            id="amount"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            className="py-2"
            error={errors.amount?.message}
            {...register('amount')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">
            Catatan <span className="font-normal text-neutral-600">(opsional)</span>
          </Label>
          <Input id="notes" className="py-2" error={errors.notes?.message} {...register('notes')} />
        </div>
      </form>
    </Modal>
  )
}
