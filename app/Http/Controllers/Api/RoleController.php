<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends Controller
{

public function index(): JsonResponse
{
    $roles = Role::orderBy('role_name', 'asc')->get();

    return response()->json([
        'success' => true,
        'message' => 'Data role berhasil diambil.',
        'total'   => $roles->count(),
        'data'    => $roles
    ], 200);
}

public function store(Request $request): JsonResponse
{
    $validated = $request->validate([
        'role_code' => 'required|string|max:50|unique:roles,role_code',
        'role_name' => 'required|string|max:100',
        'description' => 'nullable|string',
        'is_active' => 'boolean'
    ]);

    $role = Role::create($validated);

    return response()->json([
        'success' => true,
        'message' => 'Data role berhasil ditambahkan.',
        'data' => $role
    ], 201);
}

public function show(string $id): JsonResponse
{
    $role = Role::findOrFail($id);

    return response()->json([
        'success' => true,
        'message' => 'Detail role berhasil diambil.',
        'data' => $role
    ], 200);
}

public function update(Request $request, string $id): JsonResponse
{
    $role = Role::findOrFail($id);

    $validated = $request->validate([
        'role_code' => 'required|string|max:50|unique:roles,role_code,' . $role->id,
        'role_name' => 'required|string|max:100',
        'description' => 'nullable|string',
        'is_active' => 'boolean'
    ]);

    $role->update($validated);

    return response()->json([
        'success' => true,
        'message' => 'Data role berhasil diperbarui.',
        'data' => $role
    ], 200);
}

public function destroy(string $id): JsonResponse
{
    $role = Role::findOrFail($id);

    $role->delete();

    return response()->json([
        'success' => true,
        'message' => 'Data role berhasil dihapus.'
    ], 200);
}
}
