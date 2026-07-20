<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Department;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $departments = Department::orderBy('department_nama', 'asc')->get();

        return response()->json([
            'status' => true,
            'message' => 'Data departemen berhasil di ambil.',
            'data' => $departments
        ], 200);
    }

    /**
 * Store a newly created resource in storage.
 */
public function store(Request $request): JsonResponse
{
    // Validasi input
    $validated = $request->validate([
        'department_code' => 'required|string|max:20|unique:departments,department_code',
        'department_name' => 'required|string|max:100',
        'description'     => 'nullable|string',
        'is_active'       => 'nullable|boolean',
    ]);

    // Simpan data
    $department = Department::create([
        'department_code' => $validated['department_code'],
        'department_name' => $validated['department_name'],
        'description'     => $validated['description'] ?? null,
        'is_active'       => $validated['is_active'] ?? true,
    ]);

    // Response
    return response()->json([
        'success' => true,
        'message' => 'Department berhasil ditambahkan.',
        'data'    => $department
    ], 201);
}

    /**
 * Display the specified resource.
 */
public function show(string $id): JsonResponse
{
    $department = Department::find($id);

    if (!$department) {
        return response()->json([
            'success' => false,
            'message' => 'Department tidak ditemukan.'
        ], 404);
    }

    return response()->json([
        'success' => true,
        'message' => 'Detail department berhasil diambil.',
        'data' => $department
    ], 200);
}

    /**
 * Update the specified resource in storage.
 */
public function update(Request $request, string $id): JsonResponse

{
    // Cari data department
    $department = Department::find($id);

    if (!$department) {
        return response()->json([
            'success' => false,
            'message' => 'Department tidak ditemukan.'
        ], 404);
    }

    // Validasi input
    $validated = $request->validate([
        'department_code' => 'required|string|max:20|unique:departments,department_code,' . $department->id,
        'department_name' => 'required|string|max:100',
        'description'     => 'nullable|string',
        'is_active'       => 'nullable|boolean',
    ]);

    // Update data
    $department->update([
        'department_code' => $validated['department_code'],
        'department_name' => $validated['department_name'],
        'description'     => $validated['description'] ?? null,
        'is_active'       => $validated['is_active'] ?? true,
    ]);

    // Response
    return response()->json([
        'success' => true,
        'message' => 'Department berhasil diperbarui.',
        'data'    => $department
    ], 200);
}

    /**
 * Remove the specified resource from storage.
 */
public function destroy(string $id): JsonResponse
{
    // Cari data department
    $department = Department::find($id);

    if (!$department) {
        return response()->json([
            'success' => false,
            'message' => 'Department tidak ditemukan.'
        ], 404);
    }

    // Hapus data
    $department->delete();

    // Response
    return response()->json([
        'success' => true,
        'message' => 'Department berhasil dihapus.'
    ], 200);
}

}