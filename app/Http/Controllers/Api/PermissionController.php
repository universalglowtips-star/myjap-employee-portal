<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    /**
     * Daftar semua permission yang tersedia di sistem, dikelompokkan
     * per modul - buat ditampilkan sebagai checklist di form
     * "Kelola Permission Role" nanti di Website Admin.
     */
    public function index(Request $request): JsonResponse
    {
        $permissions = Permission::orderBy('module')->orderBy('action')->get();

        return response()->json([
            'success' => true,
            'message' => 'Data permission berhasil diambil.',
            'data' => $permissions->groupBy('module'),
        ]);
    }
}
