import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEmployee, updateEmployee } from '../../../api/endpoints/employees'

/** Mutation create/update karyawan (Fase 8c) - body-nya FormData (bukan objek biasa), lihat api/endpoints/employees.ts buat alasannya. */
export function useCreateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => createEmployee(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) => updateEmployee(id, formData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee', variables.id] })
    },
  })
}
