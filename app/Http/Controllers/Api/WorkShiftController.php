<?php

namespace App\Http\Controllers\Api;

use App\Models\WorkShift;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Services\AuditLogService;

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
            'is_active'       => 'required|boolean',
        ]);

        $workShift = WorkShift::create($validated);

        AuditLogService::log(
            $workShift,
            'created',
            null,
            $workShift->only(['shift_code', 'shift_name', 'check_in_time', 'check_out_time', 'break_start', 'break_end', 'late_tolerance', 'is_active']),
            $request->user()->id,
            'Shift kerja baru dibuat'
        );

        return response()->json([
            'success' => true,
            'message' => 'Data shift kerja berhasil ditambahkan.',
            'data'    => $workShift
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(WorkShift $workShift): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Detail shift kerja berhasil diambil.',
            'data'    => $workShift
        ], 200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, WorkShift $workShift): JsonResponse
    {
        $validated = $request->validate([
            'shift_code'      => 'required|string|max:20|unique:work_shifts,shift_code,' . $workShift->id,
            'shift_name'      => 'required|string|max:100',
            'check_in_time'   => 'required',
            'check_out_time'  => 'required',
            'break_start'     => 'nullable',
            'break_end'       => 'nullable',
            'late_tolerance'  => 'required|integer|min:0',
            'is_active'       => 'required|boolean',
        ]);

        $oldValues = $workShift->only(['shift_code', 'shift_name', 'check_in_time', 'check_out_time', 'break_start', 'break_end', 'late_tolerance', 'is_active']);

        $workShift->update($validated);

        AuditLogService::log(
            $workShift,
            'updated',
            $oldValues,
            $workShift->only(['shift_code', 'shift_name', 'check_in_time', 'check_out_time', 'break_start', 'break_end', 'late_tolerance', 'is_active']),
            $request->user()->id,
            'Update shift kerja'
        );

        return response()->json([
            'success' => true,
            'message' => 'Data shift kerja berhasil diperbarui.',
            'data'    => $workShift
        ], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, WorkShift $workShift): JsonResponse
    {
        $oldValues = $workShift->only(['shift_code', 'shift_name', 'check_in_time', 'check_out_time', 'break_start', 'break_end', 'late_tolerance', 'is_active']);

        $workShift->delete();

        AuditLogService::log(
            $workShift,
            'deleted',
            $oldValues,
            null,
            $request->user()->id,
            'Hapus shift kerja'
        );

        return response()->json([
            'success' => true,
            'message' => 'Data shift kerja berhasil dihapus.'
        ], 200);
    }
}