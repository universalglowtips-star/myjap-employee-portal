import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'
import { Label } from '../../../components/ui/Label'
import { useRoles } from '../../master-data/hooks/useRoles'
import { PERIOD_TYPE_OPTIONS } from '../../../api/types/payrollPeriod'
import type { ApprovalWorkflow, ApprovalWorkflowCreateRequest, PeriodType } from '../../../api/types/approvalWorkflow'
import type { NormalizedApiError } from '../../../api/client'

/** Role yang boleh jadi approver - PERSIS ALLOWED_APPROVER_ROLES di ApprovalWorkflowController.php (SUPER_ADMIN sengaja ditolak backend jadi approver operasional, jadi gak ditawarkan sama sekali di sini). */
const ALLOWED_APPROVER_ROLE_CODES = ['MANAGER', 'FINANCE', 'HRD']

const stepSchema = z.object({
  approver_role_id: z.string().min(1, 'Role approver wajib dipilih'),
  restrict_to_office_location: z.boolean(),
})

const workflowSchema = z.object({
  name: z.string().min(1, 'Nama alur wajib diisi'),
  applies_to_period_type: z.string().min(1, 'Jenis periode wajib dipilih'),
  is_active: z.string().min(1),
  // min 1 - backend store()/update() validate 'steps' => 'required|array|min:1' /
  // 'sometimes|array|min:1' (dikonfirmasi baca controller, Task 14 Fase 1).
  steps: z.array(stepSchema).min(1, 'Minimal 1 step approval wajib ada'),
})

type WorkflowFormValues = z.infer<typeof workflowSchema>

interface ApprovalWorkflowFormModalProps {
  open: boolean
  onClose: () => void
  /** Kalau diisi = mode edit, kalau undefined = mode create. */
  workflow?: ApprovalWorkflow
  onSubmit: (payload: ApprovalWorkflowCreateRequest) => Promise<void>
  isSubmitting: boolean
}

const statusOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

/**
 * Step builder pakai useFieldArray (react-hook-form) - belum pernah
 * dipakai di project ini sebelumnya (dikonfirmasi grep, fitur standar
 * react-hook-form yang sudah jadi dependency, bukan library baru).
 *
 * Level TIDAK PERNAH diinput manual - selalu diturunkan dari posisi
 * (index+1) pas submit, sesuai instruksi eksplisit (mustahil salah input
 * urutan). Naik/turun pakai `move()`, bukan drag-and-drop.
 *
 * applies_to_period_type di-disable total pas mode edit - dikonfirmasi
 * baca ApprovalWorkflowController::update() langsung, field ini TIDAK
 * ada di validate() sama sekali, backend menolak/mengabaikan perubahan
 * field ini setelah create.
 */
export function ApprovalWorkflowFormModal({ open, onClose, workflow, onSubmit, isSubmitting }: ApprovalWorkflowFormModalProps) {
  const { data: roles } = useRoles()
  const approverRoleOptions = (roles ?? [])
    .filter((r) => ALLOWED_APPROVER_ROLE_CODES.includes(r.role_code))
    .map((r) => ({ value: String(r.id), label: r.role_name }))

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<WorkflowFormValues>({ resolver: zodResolver(workflowSchema) })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'steps' })

  useEffect(() => {
    if (open) {
      reset({
        name: workflow?.name ?? '',
        applies_to_period_type: workflow?.applies_to_period_type ?? '',
        is_active: workflow ? (workflow.is_active ? 'true' : 'false') : 'true',
        steps: workflow?.steps?.length
          ? [...workflow.steps]
              .sort((a, b) => a.level - b.level)
              .map((s) => ({
                approver_role_id: String(s.approver_role_id),
                // Number(...) dulu (bukan Boolean(value) langsung) - value
                // balik sebagai 0/1 number dari backend, bukan boolean asli
                // (lihat catatan di api/types/approvalWorkflow.ts).
                restrict_to_office_location: Boolean(Number(s.restrict_to_office_location)),
              }))
          : [{ approver_role_id: '', restrict_to_office_location: false }],
      })
    }
  }, [open, workflow, reset])

  async function handleFormSubmit(values: WorkflowFormValues) {
    try {
      await onSubmit({
        name: values.name,
        applies_to_period_type: values.applies_to_period_type as PeriodType,
        is_active: values.is_active === 'true',
        steps: values.steps.map((s, idx) => ({
          level: idx + 1,
          approver_role_id: Number(s.approver_role_id),
          restrict_to_office_location: s.restrict_to_office_location,
        })),
      })
    } catch (err) {
      const apiError = err as NormalizedApiError
      if (apiError.fieldErrors) {
        for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
          if (field === 'name' || field === 'applies_to_period_type' || field === 'is_active') {
            setError(field, { message: messages[0] })
          } else {
            // steps.0.approver_role_id dst - dot-notation Laravel, map ke path nested react-hook-form yang sama persis.
            const stepMatch = field.match(/^steps\.(\d+)\.(approver_role_id|restrict_to_office_location)$/)
            if (stepMatch) {
              setError(`steps.${stepMatch[1]}.${stepMatch[2]}` as `steps.${number}.approver_role_id`, { message: messages[0] })
            }
          }
        }
      }
      // Pesan dari validateSteps() (urutan level / role invalid) BUKAN
      // field error Laravel biasa (dikirim manual sebagai {success:false,
      // message} tanpa 'errors' bag - dikonfirmasi baca controller) -
      // apiError.fieldErrors bakal undefined buat kasus ini, jadi rethrow
      // biar ditangkap Toast di Page (pola sama persis WorkShiftFormModal).
      throw err
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={workflow ? 'Edit Alur Approval' : 'Tambah Alur Approval'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" form="approval-workflow-form" loading={isSubmitting}>
            Simpan
          </Button>
        </>
      }
    >
      <form
        id="approval-workflow-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        noValidate
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nama Alur</Label>
          <Input id="name" className="py-2" error={errors.name?.message} {...register('name')} />
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="applies_to_period_type">Jenis Periode</Label>
            <Select
              id="applies_to_period_type"
              className="py-2"
              placeholder="Pilih jenis periode"
              options={[...PERIOD_TYPE_OPTIONS]}
              error={errors.applies_to_period_type?.message}
              disabled={!!workflow}
              {...register('applies_to_period_type')}
            />
            {workflow && (
              <p className="font-body text-xs text-neutral-500">Jenis periode tidak bisa diubah setelah alur dibuat.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="is_active">Status</Label>
            <Select id="is_active" className="py-2" options={statusOptions} error={errors.is_active?.message} {...register('is_active')} />
            <p className="font-body text-xs text-neutral-500">
              Mengaktifkan alur ini akan otomatis menonaktifkan alur lain untuk jenis periode yang sama - cuma 1 alur aktif per jenis periode.
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label as="p">Urutan Approval</Label>
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={() => append({ approver_role_id: '', restrict_to_office_location: false })}
            >
              <Plus size={14} strokeWidth={2} />
              Tambah Step
            </Button>
          </div>
          {errors.steps?.message && <p className="font-body text-xs text-status-rejected">{errors.steps.message}</p>}

          <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-md border border-neutral-200 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <span className="font-body text-xs font-medium text-neutral-500">Level {index + 1}</span>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(index, index - 1)}
                        disabled={index === 0}
                        aria-label={`Pindahkan step ${index + 1} ke atas`}
                        className="rounded-sm p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <ChevronUp size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, index + 1)}
                        disabled={index === fields.length - 1}
                        aria-label={`Pindahkan step ${index + 1} ke bawah`}
                        className="rounded-sm p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <ChevronDown size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`steps.${index}.approver_role_id`}>Role Approver</Label>
                      <Select
                        id={`steps.${index}.approver_role_id`}
                        className="py-2"
                        placeholder="Pilih role"
                        options={approverRoleOptions}
                        error={errors.steps?.[index]?.approver_role_id?.message}
                        {...register(`steps.${index}.approver_role_id`)}
                      />
                    </div>

                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-neutral-300 accent-primary-600"
                        {...register(`steps.${index}.restrict_to_office_location`)}
                      />
                      <span className="flex flex-col">
                        <span className="font-body text-sm text-neutral-900">Dibatasi per cabang</span>
                        <span className="font-body text-xs text-neutral-500">
                          Approver level ini juga harus punya Wewenang Cabang ke cabang periode yang diproses.
                        </span>
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label={`Hapus step ${index + 1}`}
                    className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-status-rejected disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}
