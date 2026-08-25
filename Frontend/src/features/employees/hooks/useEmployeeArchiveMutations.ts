import { useMutation, useQueryClient } from '@tanstack/react-query'
import { archiveEmployee, restoreEmployee } from '../../../api/endpoints/employees'

/**
 * Archive (soft-delete) dan Restore SAMA-SAMA mempengaruhi 2 list
 * (utama + arsip) - invalidate KEDUA query key ('employees' DAN
 * 'employees-archived'), bukan cuma satu, biar dua-duanya auto-refetch
 * data terbaru tanpa manual state management.
 */
export function useArchiveEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => archiveEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employees-archived'] })
    },
  })
}

export function useRestoreEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => restoreEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employees-archived'] })
    },
  })
}
