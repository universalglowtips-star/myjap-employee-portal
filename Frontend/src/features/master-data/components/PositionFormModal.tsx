import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import type { Position, PositionCreateRequest } from '../../../api/types/position'
import type { Department } from '../../../api/types/department'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Field native <select>/<input> lewat react-hook-form register() semua
 * balik STRING (department_id, allowance, is_active) - dikonversi ke
 * tipe asli (number/boolean) pas construct payload di handleFormSubmit,
 * BUKAN di schema. `allowance` divalidasi >=0 di sini (non-negative,
 * boleh 0) - cermin persis `numeric|min:0` di PositionController.
 */
const positionSchema = z.object({
  position_code: z.string().min(1, 'Kode posisi wajib diisi'),
  position_name: z.string().min(1, 'Nama posisi wajib diisi'),
  department_id: z.string().min(1, 'Departemen wajib dipilih'),
  allowance: z
    .string()
    .min(1, 'Tunjangan wajib diisi')
    .refine((v) => !Number.isNaN(Number(v)), 'Tunjangan harus berupa angka')
    .refine((v) => Number(v) >= 0, 'Tunjangan tidak boleh negatif'),
  description: z.string().optional(),
  is_active: z.string().min(1, 'Status wajib dipilih'),
})

type PositionFormValues = z.infer<typeof positionSchema>

interface PositionFormModalProps {
  open: boolean
  onClose: () => void
  /** Kalau diisi = mode edit, kalau undefined = mode create. */
  position?: Position
  onSubmit: (payload: PositionCreateRequest) => Promise<void>
  isSubmitting: boolean
  /** Data buat dropdown Departemen - di-fetch di PositionListPage (dipakai juga buat kolom tabel), diteruskan ke sini biar gak fetch dobel. */
  departments: Department[] | undefined
  isDepartmentsLoading: boolean
  isDepartmentsError: boolean
}

const statusOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

export function PositionFormModal({
  open,
  onClose,
  position,
  onSubmit,
  isSubmitting,
  departments,
  isDepartmentsLoading,
  isDepartmentsError,
}: PositionFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PositionFormValues>({ resolver: zodResolver(positionSchema) })

  // Reset form tiap kali modal dibuka - position berubah (edit item lain)
  // atau ditutup-buka lagi buat create. is_active default 'true' (Aktif)
  // di mode create - field WAJIB diisi backend (required|boolean, beda
  // dari Department yang optional), defaultnya masuk akal tanpa maksa
  // user klik eksplisit kalau memang mau Aktif.
  //
  // `position.is_active ? 'true' : 'false'` (TRUTHY check) - BUKAN
  // `String(position.is_active)`. Dikonfirmasi langsung ke response API
  // asli: Position model gak punya $casts eksplisit buat is_active,
  // jadi backend balikin RAW integer 1/0 (bukan JSON true/false kayak
  // yang diasumsikan dari nama field-nya) - String(1) = "1", MISMATCH
  // total sama value Select ('true'/'false'), bakal bikin dropdown
  // Status gak ke-select dengan benar pas mode edit. Truthy check aman
  // buat integer maupun boolean asli, gak peduli bentuk mentahnya.
  useEffect(() => {
    if (open) {
      reset({
        position_code: position?.position_code ?? '',
        position_name: position?.position_name ?? '',
        department_id: position ? String(position.department_id) : '',
        allowance: position?.allowance ?? '',
        description: position?.description ?? '',
        is_active: position ? (position.is_active ? 'true' : 'false') : 'true',
      })
    }
  }, [open, position, reset])

  async function handleFormSubmit(values: PositionFormValues) {
    try {
      await onSubmit({
        department_id: Number(values.department_id),
        position_code: values.position_code,
        position_name: values.position_name,
        allowance: Number(values.allowance),
        description: values.description || null,
        is_active: values.is_active === 'true',
      })
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.fieldErrors) {
        for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
          if (
            field === 'department_id' ||
            field === 'position_code' ||
            field === 'position_name' ||
            field === 'allowance' ||
            field === 'description' ||
            field === 'is_active'
          ) {
            setError(field as keyof PositionFormValues, { message: messages[0] })
          }
        }
      }
      // Error non-validasi (403/500 dsb) ditangani di Page (Toast) - Modal ini cuma urus form-level error.
      throw err
    }
  }

  const departmentOptions = (departments ?? []).map((d) => ({
    value: String(d.id),
    label: d.department_name,
  }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={position ? 'Edit Posisi' : 'Tambah Posisi'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="position-form" loading={isSubmitting}>
            Simpan
          </Button>
        </>
      }
    >
      {/* Grid 2 kolom (1 kolom di bawah sm - collapse otomatis, gap-y
          TETAP ketat di kedua breakpoint, bukan balik lega di mobile)
          - field pendek berpasangan (Kode Posisi+Tunjangan, Departemen+
          Status), field yang isinya bisa panjang (Nama Posisi, Deskripsi)
          tetap col-span-2 penuh. Padding vertikal Input/Select di-override
          py-2 (dari default py-2.5 di komponennya) VIA className di
          tiap pemakaian di sini - BUKAN ubah Input.tsx/Select.tsx
          langsung, biar Login & Modal Departemen (form sederhana, gak
          butuh dipadatkan) gak ikut kesenggol. py-2 + text-sm (line-height
          20px) + border 2px = tinggi total ~38px, masih dalam batas
          wajar buat tap target (di bawah 44px WCAG AAA ideal, tapi
          umum dipakai admin panel padat data - bukan tombol icon-only
          kecil kayak hamburger yang emang wajib 44px).
          gap-y-3 (12px, turun dari gap-4/16px sebelumnya) - satu step
          di spacing scale, "dipadatkan" tanpa jadi mepet. */}
      <form
        id="position-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        noValidate
        className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="position_code" className="font-body text-[13px] font-medium text-neutral-600">
            Kode Posisi
          </label>
          <Input id="position_code" className="py-2" error={errors.position_code?.message} {...register('position_code')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="allowance" className="font-body text-[13px] font-medium text-neutral-600">
            Tunjangan
          </label>
          <Input
            id="allowance"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            className="py-2"
            error={errors.allowance?.message}
            {...register('allowance')}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="position_name" className="font-body text-[13px] font-medium text-neutral-600">
            Nama Posisi
          </label>
          <Input id="position_name" className="py-2" error={errors.position_name?.message} {...register('position_name')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="department_id" className="font-body text-[13px] font-medium text-neutral-600">
            Departemen
          </label>
          {/* WAJIB dropdown, bukan teks bebas - data dari GET /departments
              yang udah terbukti jalan (Tugas 1). Loading/error state
              ditangani eksplisit (disabled + placeholder/pesan berubah),
              BUKAN dibiarkan kosong tanpa keterangan kalau fetch gagal. */}
          <Select
            id="department_id"
            className="py-2"
            options={departmentOptions}
            placeholder={isDepartmentsLoading ? 'Memuat departemen...' : 'Pilih Departemen'}
            disabled={isDepartmentsLoading || isDepartmentsError}
            error={errors.department_id?.message}
            {...register('department_id')}
          />
          {isDepartmentsError && (
            <p className="font-body text-xs text-status-rejected">
              Gagal memuat daftar departemen. Coba muat ulang halaman.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="is_active" className="font-body text-[13px] font-medium text-neutral-600">
            Status
          </label>
          {/* BEDA dari Department - is_active WAJIB dikirim backend
              (required|boolean), jadi field ini HARUS ada di form
              (bukan disembunyikan/dipertahankan diam-diam kayak Department). */}
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
            Deskripsi
          </label>
          <Input id="description" className="py-2" error={errors.description?.message} {...register('description')} />
        </div>
      </form>
    </Modal>
  )
}
