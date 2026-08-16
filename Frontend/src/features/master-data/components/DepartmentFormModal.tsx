import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import type { Department, DepartmentCreateRequest } from '../../../api/types/department'
import type { NormalizedApiError } from '../../../api/client'

/** Validasi ringan - field wajib terisi, sama prinsipnya kayak LoginPage (backend tetap otoritas format/uniqueness). */
const departmentSchema = z.object({
  department_code: z.string().min(1, 'Kode departemen wajib diisi'),
  department_name: z.string().min(1, 'Nama departemen wajib diisi'),
  description: z.string().optional(),
})

type DepartmentFormValues = z.infer<typeof departmentSchema>

interface DepartmentFormModalProps {
  open: boolean
  onClose: () => void
  /** Kalau diisi = mode edit, kalau undefined = mode create. */
  department?: Department
  onSubmit: (payload: DepartmentCreateRequest) => Promise<void>
  isSubmitting: boolean
}

export function DepartmentFormModal({
  open,
  onClose,
  department,
  onSubmit,
  isSubmitting,
}: DepartmentFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DepartmentFormValues>({ resolver: zodResolver(departmentSchema) })

  // Reset form tiap kali modal dibuka - department berubah (edit item lain) atau ditutup-buka lagi buat create.
  useEffect(() => {
    if (open) {
      reset({
        department_code: department?.department_code ?? '',
        department_name: department?.department_name ?? '',
        description: department?.description ?? '',
      })
    }
  }, [open, department, reset])

  async function handleFormSubmit(values: DepartmentFormValues) {
    try {
      await onSubmit({ ...values, is_active: department?.is_active ?? true })
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.fieldErrors) {
        for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
          if (field === 'department_code' || field === 'department_name' || field === 'description') {
            setError(field as keyof DepartmentFormValues, { message: messages[0] })
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
      title={department ? 'Edit Departemen' : 'Tambah Departemen'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="department-form" loading={isSubmitting}>
            Simpan
          </Button>
        </>
      }
    >
      <form id="department-form" onSubmit={handleSubmit(handleFormSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="department_code" className="font-body text-[13px] font-medium text-neutral-600">
            Kode Departemen
          </label>
          <Input id="department_code" error={errors.department_code?.message} {...register('department_code')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="department_name" className="font-body text-[13px] font-medium text-neutral-600">
            Nama Departemen
          </label>
          <Input id="department_name" error={errors.department_name?.message} {...register('department_name')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="font-body text-[13px] font-medium text-neutral-600">
            Deskripsi
          </label>
          <Input id="description" error={errors.description?.message} {...register('description')} />
        </div>
      </form>
    </Modal>
  )
}
