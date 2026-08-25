import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import type { SalaryComponent, SalaryComponentCreateRequest } from '../../../api/types/salaryComponent'
import type { NormalizedApiError } from '../../../api/client'

/**
 * 8 field (Kode, Nama, Tipe, Jumlah Default, Wajib Pajak?, Komponen
 * Wajib?, Status, Deskripsi) - lebih banyak dari dugaan awal spek (yang
 * ngira modul ini "mirip Departemen", 4-5 field). Pakai grid 2-kolom
 * dipadatkan ala PositionFormModal (py-2 override + gap-y-3), BUKAN
 * pola sederhana 1-kolom Department - field pendek (Kode+Jumlah Default,
 * Tipe+Status, Wajib Pajak?+Komponen Wajib?) sejajar, Nama Komponen &
 * Deskripsi lebar penuh. 5 baris total, cukup pakai density standar
 * (BUKAN density extra-padat khusus OfficeLocation yang punya 7 baris).
 */
const salaryComponentSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi'),
  name: z.string().min(1, 'Nama komponen wajib diisi'),
  type: z.string().min(1, 'Tipe wajib dipilih'),
  default_amount: z
    .string()
    .min(1, 'Jumlah default wajib diisi')
    .refine((v) => !Number.isNaN(Number(v)), 'Jumlah default harus berupa angka')
    .refine((v) => Number(v) >= 0, 'Jumlah default tidak boleh negatif'),
  is_taxable: z.string().min(1, 'Wajib dipilih'),
  is_required: z.string().min(1, 'Wajib dipilih'),
  is_active: z.string().min(1, 'Status wajib dipilih'),
  description: z.string().optional(),
})

type SalaryComponentFormValues = z.infer<typeof salaryComponentSchema>

interface SalaryComponentFormModalProps {
  open: boolean
  onClose: () => void
  /** Kalau diisi = mode edit, kalau undefined = mode create. */
  salaryComponent?: SalaryComponent
  onSubmit: (payload: SalaryComponentCreateRequest) => Promise<void>
  isSubmitting: boolean
}

const typeOptions = [
  { value: 'earning', label: 'Pemasukan' },
  { value: 'deduction', label: 'Potongan' },
]

const yesNoOptions = [
  { value: 'true', label: 'Ya' },
  { value: 'false', label: 'Tidak' },
]

const statusOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

export function SalaryComponentFormModal({
  open,
  onClose,
  salaryComponent,
  onSubmit,
  isSubmitting,
}: SalaryComponentFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SalaryComponentFormValues>({ resolver: zodResolver(salaryComponentSchema) })

  // is_taxable/is_required/is_active model-nya PUNYA $casts eksplisit
  // 'boolean' (beda dari Position/WorkShift/OfficeLocation yang gak
  // punya cast) - balik JSON true/false asli, bukan integer 1/0. Truthy
  // check TETAP dipakai (bukan String()) buat konsisten sama pola form
  // lain di codebase ini, meski di sini secara teknis String() juga aman.
  useEffect(() => {
    if (open) {
      reset({
        code: salaryComponent?.code ?? '',
        name: salaryComponent?.name ?? '',
        type: salaryComponent?.type ?? '',
        default_amount: salaryComponent ? salaryComponent.default_amount : '0',
        is_taxable: salaryComponent ? (salaryComponent.is_taxable ? 'true' : 'false') : 'false',
        is_required: salaryComponent ? (salaryComponent.is_required ? 'true' : 'false') : 'false',
        is_active: salaryComponent ? (salaryComponent.is_active ? 'true' : 'false') : 'true',
        description: salaryComponent?.description ?? '',
      })
    }
  }, [open, salaryComponent, reset])

  async function handleFormSubmit(values: SalaryComponentFormValues) {
    try {
      await onSubmit({
        code: values.code,
        name: values.name,
        type: values.type as 'earning' | 'deduction',
        default_amount: Number(values.default_amount),
        is_taxable: values.is_taxable === 'true',
        is_required: values.is_required === 'true',
        is_active: values.is_active === 'true',
        description: values.description || null,
      })
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.fieldErrors) {
        for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
          if (
            field === 'code' ||
            field === 'name' ||
            field === 'type' ||
            field === 'default_amount' ||
            field === 'is_taxable' ||
            field === 'is_required' ||
            field === 'is_active' ||
            field === 'description'
          ) {
            setError(field as keyof SalaryComponentFormValues, { message: messages[0] })
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
      title={salaryComponent ? 'Edit Komponen Gaji' : 'Tambah Komponen Gaji'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="salary-component-form" loading={isSubmitting}>
            Simpan
          </Button>
        </>
      }
    >
      <form
        id="salary-component-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        noValidate
        className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className="font-body text-[13px] font-medium text-neutral-600">
            Kode
          </label>
          <Input id="code" className="py-2" error={errors.code?.message} {...register('code')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="default_amount" className="font-body text-[13px] font-medium text-neutral-600">
            Jumlah Default
          </label>
          <Input
            id="default_amount"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            className="py-2"
            error={errors.default_amount?.message}
            {...register('default_amount')}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="name" className="font-body text-[13px] font-medium text-neutral-600">
            Nama Komponen
          </label>
          <Input id="name" className="py-2" error={errors.name?.message} {...register('name')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className="font-body text-[13px] font-medium text-neutral-600">
            Tipe
          </label>
          <Select
            id="type"
            className="py-2"
            options={typeOptions}
            placeholder="Pilih Tipe"
            error={errors.type?.message}
            {...register('type')}
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="is_taxable" className="font-body text-[13px] font-medium text-neutral-600">
            Wajib Pajak?
          </label>
          <Select
            id="is_taxable"
            className="py-2"
            options={yesNoOptions}
            error={errors.is_taxable?.message}
            {...register('is_taxable')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="is_required" className="font-body text-[13px] font-medium text-neutral-600">
            Komponen Wajib?
          </label>
          <Select
            id="is_required"
            className="py-2"
            options={yesNoOptions}
            error={errors.is_required?.message}
            {...register('is_required')}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="description" className="font-body text-[13px] font-medium text-neutral-600">
            Deskripsi <span className="font-normal text-neutral-400">(opsional)</span>
          </label>
          <Input id="description" className="py-2" error={errors.description?.message} {...register('description')} />
        </div>
      </form>
    </Modal>
  )
}
