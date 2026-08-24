import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import type { Role, RoleCreateRequest } from '../../../api/types/role'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Cuma 4 field (Kode Role, Nama Role, Deskripsi, Status) - TIDAK pakai
 * layout grid+spacing dipadatkan ala PositionFormModal (itu buat form
 * >4 field), single kolom sama seperti DepartmentFormModal. Status
 * TETAP ditampilkan eksplisit (beda dari Department yang nyembunyiin
 * field ini) sesuai instruksi tugas - role.is_active perlu terlihat
 * jelas karena berdampak ke akses seluruh modul lain.
 */
const roleSchema = z.object({
  role_code: z.string().min(1, 'Kode role wajib diisi'),
  role_name: z.string().min(1, 'Nama role wajib diisi'),
  description: z.string().optional(),
  is_active: z.string().min(1, 'Status wajib dipilih'),
})

type RoleFormValues = z.infer<typeof roleSchema>

interface RoleFormModalProps {
  open: boolean
  onClose: () => void
  /** Kalau diisi = mode edit, kalau undefined = mode create. */
  role?: Role
  onSubmit: (payload: RoleCreateRequest) => Promise<void>
  isSubmitting: boolean
}

const statusOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

export function RoleFormModal({ open, onClose, role, onSubmit, isSubmitting }: RoleFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RoleFormValues>({ resolver: zodResolver(roleSchema) })

  // Reset form tiap kali modal dibuka. `role.is_active ? 'true' : 'false'`
  // (TRUTHY check, BUKAN String(role.is_active)) - dikonfirmasi dari
  // investigasi: Role model gak punya $casts eksplisit buat is_active,
  // backend bisa balikin raw integer 1/0, String(1) = "1" gak match
  // value Select ('true'/'false'). Pola sama persis PositionFormModal.
  useEffect(() => {
    if (open) {
      reset({
        role_code: role?.role_code ?? '',
        role_name: role?.role_name ?? '',
        description: role?.description ?? '',
        is_active: role ? (role.is_active ? 'true' : 'false') : 'true',
      })
    }
  }, [open, role, reset])

  async function handleFormSubmit(values: RoleFormValues) {
    try {
      await onSubmit({
        role_code: values.role_code,
        role_name: values.role_name,
        description: values.description || null,
        is_active: values.is_active === 'true',
      })
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.fieldErrors) {
        for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
          if (field === 'role_code' || field === 'role_name' || field === 'description' || field === 'is_active') {
            setError(field as keyof RoleFormValues, { message: messages[0] })
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
      title={role ? 'Edit Role' : 'Tambah Role'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="role-form" loading={isSubmitting}>
            Simpan
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit(handleFormSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="role_code" className="font-body text-[13px] font-medium text-neutral-600">
            Kode Role
          </label>
          <Input id="role_code" error={errors.role_code?.message} {...register('role_code')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="role_name" className="font-body text-[13px] font-medium text-neutral-600">
            Nama Role
          </label>
          <Input id="role_name" error={errors.role_name?.message} {...register('role_name')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="font-body text-[13px] font-medium text-neutral-600">
            Deskripsi
          </label>
          <Input id="description" error={errors.description?.message} {...register('description')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="is_active" className="font-body text-[13px] font-medium text-neutral-600">
            Status
          </label>
          <Select
            id="is_active"
            options={statusOptions}
            error={errors.is_active?.message}
            {...register('is_active')}
          />
        </div>
      </form>
    </Modal>
  )
}
