import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRole, updateRole, deleteRole } from '../../../api/endpoints/roles'
import type { RoleCreateRequest, RoleUpdateRequest } from '../../../api/types/role'
import { rolesQueryKey } from './useRoles'

/** 3 mutation terpisah, tiap satu invalidate rolesQueryKey setelah sukses - pola sama persis useDepartmentMutations. */
export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RoleCreateRequest) => createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RoleUpdateRequest }) => updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey })
    },
  })
}
