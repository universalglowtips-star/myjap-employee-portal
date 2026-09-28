<?php

namespace App\Http\Controllers\Api;

use App\Models\Position;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class PositionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
public function index(): JsonResponse
{
    $positions = Position::with('department')
        ->orderBy('position_name', 'asc')
        ->get();

    return response()->json([
        'success' => true,
        'message' => 'Data jabatan berhasil diambil.',
        'total'   => $positions->count(),
        'data'    => $positions
    ], 200);
}

    /**
     * Store a newly created resource in storage.
     */
public function store(Request $request): JsonResponse
{
    $validated = $request->validate([
        'department_id' => 'required|exists:departments,id',
        'position_code' => 'required|string|max:20|unique:positions,position_code',
        'position_name' => 'required|string|max:100',
        // allowance TIDAK LAGI dikirim dari UI (dihapus 2026-09-28,
        // Kelompok A - dead field sejak Task 15b, digantikan komponen
        // gaji per-Jabatan/Karyawan). nullable (bukan required lagi) -
        // kolom DB-nya tetap punya default 0.00 sendiri, cukup gak
        // disebut di $validated biar Eloquent create() pakai default itu.
        'allowance'     => 'nullable|numeric|min:0',
        'description'   => 'nullable|string',
        'is_active'     => 'required|boolean',
    ]);

    $position = Position::create($validated);

    AuditLogService::log(
        $position,
        'created',
        null,
        $position->only(['department_id', 'position_code', 'position_name', 'allowance', 'description', 'is_active']),
        $request->user()->id,
        'Posisi baru dibuat'
    );

    return response()->json([
        'success' => true,
        'message' => 'Data jabatan berhasil ditambahkan.',
        'data'    => $position->load('department')
    ], 201);
}

    /**
     * Display the specified resource.
     */
public function show(string $id): JsonResponse
{
    $position = Position::with('department')->find($id);

    if (!$position) {
        return response()->json([
            'success' => false,
            'message' => 'Data jabatan tidak ditemukan.'
        ], 404);
    }

    return response()->json([
        'success' => true,
        'message' => 'Detail jabatan berhasil diambil.',
        'data' => $position
    ], 200);
}

    /**
     * Update the specified resource in storage.
     */
public function update(Request $request, string $id): JsonResponse
{
    $position = Position::find($id);

    if (!$position) {
        return response()->json([
            'success' => false,
            'message' => 'Data jabatan tidak ditemukan.'
        ], 404);
    }

    $validated = $request->validate([
        'department_id' => 'required|exists:departments,id',
        'position_code' => 'required|string|max:20|unique:positions,position_code,' . $position->id,
        'position_name' => 'required|string|max:100',
        // allowance TIDAK LAGI dikirim dari UI - lihat catatan di store()
        // di atas. nullable, BUKAN required: kalau gak dikirim, $validated
        // gak punya key ini, $position->update($validated) di bawah gak
        // nyentuh kolomnya sama sekali - nilai lama TETAP UTUH, gak
        // ketiban default/reset ke 0 secara gak sengaja.
        'allowance'     => 'nullable|numeric|min:0',
        'description'   => 'nullable|string',
        'is_active'     => 'required|boolean',
    ]);

    $oldValues = $position->only(['department_id', 'position_code', 'position_name', 'allowance', 'description', 'is_active']);

    $position->update($validated);

    AuditLogService::log(
        $position,
        'updated',
        $oldValues,
        $position->only(['department_id', 'position_code', 'position_name', 'allowance', 'description', 'is_active']),
        $request->user()->id,
        'Update posisi'
    );

    return response()->json([
        'success' => true,
        'message' => 'Data jabatan berhasil diperbarui.',
        'data'    => $position->load('department')
    ], 200);
}

    /**
     * Remove the specified resource from storage.
     */
public function destroy(Request $request, string $id): JsonResponse
{
    $position = Position::find($id);

    if (!$position) {
        return response()->json([
            'success' => false,
            'message' => 'Data jabatan tidak ditemukan.'
        ], 404);
    }

    $oldValues = $position->only(['department_id', 'position_code', 'position_name', 'allowance', 'description', 'is_active']);

    $position->delete();

    AuditLogService::log(
        $position,
        'deleted',
        $oldValues,
        null,
        $request->user()->id,
        'Hapus posisi'
    );

    return response()->json([
        'success' => true,
        'message' => 'Data jabatan berhasil dihapus.'
    ], 200);
}

}