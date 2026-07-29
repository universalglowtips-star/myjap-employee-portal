<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Cek apakah employee yang login punya permission tertentu.
     * SUPER_ADMIN selalu lolos (bypass, system owner) - tidak pernah
     * di-assign permission satu-satu, tidak pernah kehilangan akses.
     *
     * Pemakaian di route: ->middleware('permission:leave.approve')
     */
    public function handle(Request $request, Closure $next, string $permissionCode): Response
    {
        $employee = $request->user();

        if (!$employee || !$employee->role) {
            return response()->json([
                'success' => false,
                'message' => 'Role karyawan ini belum di-set, akses ditolak.'
            ], 403);
        }

        if (!$employee->role->hasPermission($permissionCode)) {
            return response()->json([
                'success' => false,
                'message' => "Kamu tidak punya izin untuk aksi ini ({$permissionCode})."
            ], 403);
        }

        return $next($request);
    }
}
