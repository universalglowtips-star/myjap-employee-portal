<?php

namespace App\Http\Controllers\Api;

use App\Models\Position;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
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
        'allowance'     => 'required|numeric|min:0',
        'description'   => 'nullable|string',
        'is_active'     => 'required|boolean',
    ]);

    $position = Position::create($validated);

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
        'allowance'     => 'required|numeric|min:0',
        'description'   => 'nullable|string',
        'is_active'     => 'required|boolean',
    ]);

    $position->update($validated);

    return response()->json([
        'success' => true,
        'message' => 'Data jabatan berhasil diperbarui.',
        'data'    => $position->load('department')
    ], 200);
}

    /**
     * Remove the specified resource from storage.
     */
public function destroy(string $id): JsonResponse
{
    $position = Position::find($id);

    if (!$position) {
        return response()->json([
            'success' => false,
            'message' => 'Data jabatan tidak ditemukan.'
        ], 404);
    }

    $position->delete();

    return response()->json([
        'success' => true,
        'message' => 'Data jabatan berhasil dihapus.'
    ], 200);
}

}