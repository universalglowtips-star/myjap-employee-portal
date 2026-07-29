<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    /**
     * Lihat permission yang di-assign ke satu role.
     */
    public function show(string $roleId): JsonResponse
    {
        $role = Role::with('permissions')->findOrFail($roleId);

        return response()->json([
            'success' => true,
            'message' => 'Data permission role berhasil diambil.',
            'data' => [
                'role' => [
                    'id' => $role->id,
                    'role_code' => $role->role_code,
                    'role_name' => $role->role_name,
                ],
                'is_super_admin' => $role->role_code === 'SUPER_ADMIN',
                'permissions' => $role->permissions,
            ],
        ]);
    }

    /**
     * Sync permission untuk satu role (replace total dengan yang dikirim).
     * Body: { "permission_ids": [1, 2, 3, ...] }
     *
     * SUPER_ADMIN sengaja ditolak di-assign manual - dia selalu bypass
     * lewat middleware, gak butuh baris di role_permissions.
     */
    public function update(Request $request, string $roleId): JsonResponse
    {
        $role = Role::findOrFail($roleId);

        if ($role->role_code === 'SUPER_ADMIN') {
            return response()->json([
                'success' => false,
                'message' => 'SUPER_ADMIN selalu punya akses penuh secara otomatis, tidak perlu (dan tidak bisa) di-assign permission manual.'
            ], 422);
        }

        $validated = $request->validate([
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $role->permissions()->sync($validated['permission_ids']);

        return response()->json([
            'success' => true,
            'message' => 'Permission role berhasil diperbarui.',
            'data' => $role->fresh()->load('permissions'),
        ]);
    }
}
