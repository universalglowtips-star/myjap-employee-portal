<?php

namespace App\Http\Controllers\Api;

use App\Models\WorkShift;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;

class WorkShiftController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $workShifts = WorkShift::orderBy('shift_name', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Data shift kerja berhasil diambil.',
            'total'   => $workShifts->count(),
            'data'    => $workShifts
        ], 200);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shift_code'      => 'required|string|max:20|unique:work_shifts,shift_code',
            'shift_name'      => 'required|string|max:100',
            'check_in_time'   => 'required',
            'check_out_time'  => 'required',
            'break_start'     => 'nullable',
            'break_end'       => 'nullable',
            'late_tolerance'  => 'required|integer|min:0',
            'is_active'       => 'boolean'
        ]);

        $workShift = WorkShift::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data shift kerja berhasil ditambahkan.',
            'data'    => $workShift
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $workShift = WorkShift::findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail shift kerja berhasil diambil.',
            'data'    => $workShift
        ], 200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $workShift = WorkShift::findOrFail($id);

        $validated = $request->validate([
            'shift_code'      => 'required|string|max:20|unique:work_shifts,shift_code,' . $id,
            'shift_name'      => 'required|string|max:100',
            'check_in_time'   => 'required',
            'check_out_time'  => 'required',
            'break_start'     => 'nullable',
            'break_end'       => 'nullable',
            'late_tolerance'  => 'required|integer|min:0',
            'is_active'       => 'boolean'
        ]);

        $workShift->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data shift kerja berhasil diperbarui.',
            'data'    => $workShift
        ], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $workShift = WorkShift::findOrFail($id);

        $workShift->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data shift kerja berhasil dihapus.'
        ], 200);
    }
}