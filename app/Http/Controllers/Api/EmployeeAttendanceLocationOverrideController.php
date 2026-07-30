<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeAttendanceLocationOverride;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeAttendanceLocationOverrideController extends Controller
{
    /**
     * Lihat override untuk satu employee (kalau ada). Kalau tidak ada,
     * berarti dia ikut Position Policy / default Home Office.
     */
    public function show(string $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $override = EmployeeAttendanceLocationOverride::with(['offices', 'creator'])
            ->where('employee_id', $employeeId)
            ->first();

        return response()->json([
            'success' => true,
            'message' => 'Data override berhasil diambil.',
            'data' => [
                'employee' => [
                    'id' => $employee->id,
                    'full_name' => $employee->full_name,
                    'employee_code' => $employee->employee_code,
                ],
                'has_override' => (bool) $override,
                'override' => $override,
            ],
        ]);
    }

    /**
     * Set/update override untuk satu employee (upsert).
     * Body: { "scope_type": "...", "office_location_ids": [...], "reason": "..." }
     */
    public function update(Request $request, string $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $validated = $request->validate([
            'scope_type' => 'required|in:HOME_ONLY,ALL_BRANCHES,SPECIFIC_BRANCHES,SUPERVISED_BRANCHES',
            'office_location_ids' => 'required_if:scope_type,SPECIFIC_BRANCHES|array',
            'office_location_ids.*' => 'exists:office_locations,id',
            'effective_start_date' => 'nullable|date',
            'effective_end_date' => 'nullable|date|after_or_equal:effective_start_date',
            'reason' => 'required|string|max:1000',
        ]);

        $existing = EmployeeAttendanceLocationOverride::where('employee_id', $employeeId)->first();

        $oldValues = $existing ? [
            'scope_type' => $existing->scope_type,
            'effective_start_date' => $existing->effective_start_date?->toDateString(),
            'effective_end_date' => $existing->effective_end_date?->toDateString(),
            'office_location_ids' => $existing->offices()->pluck('office_locations.id')->toArray(),
        ] : null;

        $override = EmployeeAttendanceLocationOverride::updateOrCreate(
            ['employee_id' => $employeeId],
            [
                'scope_type' => $validated['scope_type'],
                'effective_start_date' => $validated['effective_start_date'] ?? null,
                'effective_end_date' => $validated['effective_end_date'] ?? null,
                'reason' => $validated['reason'],
                'created_by' => $request->user()->id,
            ]
        );

        if ($validated['scope_type'] === 'SPECIFIC_BRANCHES') {
            $override->offices()->sync($validated['office_location_ids']);
        } else {
            $override->offices()->sync([]);
        }

        AuditLogService::log(
            $override,
            $existing ? 'override_updated' : 'override_created',
            $oldValues,
            [
                'scope_type' => $validated['scope_type'],
                'effective_start_date' => $validated['effective_start_date'] ?? null,
                'effective_end_date' => $validated['effective_end_date'] ?? null,
                'office_location_ids' => $validated['office_location_ids'] ?? [],
                'reason' => $validated['reason'],
            ],
            $request->user()->id,
            "Set attendance location override untuk karyawan: {$employee->full_name}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Override attendance location berhasil disimpan.',
            'data' => $override->fresh()->load(['employee', 'offices', 'creator']),
        ]);
    }

    /**
     * Hapus override - employee ini balik ikut Position Policy lagi.
     */
    public function destroy(Request $request, string $employeeId): JsonResponse
    {
        $override = EmployeeAttendanceLocationOverride::where('employee_id', $employeeId)->first();

        if ($override) {

            AuditLogService::log(
                $override,
                'override_deleted',
                [
                    'scope_type' => $override->scope_type,
                    'effective_start_date' => $override->effective_start_date?->toDateString(),
                    'effective_end_date' => $override->effective_end_date?->toDateString(),
                ],
                null,
                $request->user()->id,
                'Hapus override, karyawan kembali mengikuti kebijakan posisinya'
            );

            $override->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Override dihapus, karyawan ini kembali mengikuti kebijakan posisinya.',
        ]);
    }
}
