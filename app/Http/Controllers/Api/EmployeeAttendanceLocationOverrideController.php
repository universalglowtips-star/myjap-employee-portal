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

        $override = EmployeeAttendanceLocationOverride::with(['officesCheckIn', 'officesCheckOut', 'creator'])
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
     * Set/update override untuk satu employee (upsert). scope_type
     * dipecah per arah (Task per-arah) - Tanggal Berlaku + Alasan TETAP
     * 1 set dipakai bareng buat kedua arah (dikonfirmasi user, BUKAN
     * diduplikasi).
     * Body: {
     *   "scope_type_check_in": "...", "office_location_ids_check_in": [...],
     *   "scope_type_check_out": "...", "office_location_ids_check_out": [...],
     *   "effective_start_date": "...", "effective_end_date": "...", "reason": "..."
     * }
     */
    public function update(Request $request, string $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $scopeRule = 'in:HOME_ONLY,ALL_BRANCHES,SPECIFIC_BRANCHES,SUPERVISED_BRANCHES,ANYWHERE';

        $validated = $request->validate([
            'scope_type_check_in' => "required|$scopeRule",
            'office_location_ids_check_in' => 'required_if:scope_type_check_in,SPECIFIC_BRANCHES|array',
            'office_location_ids_check_in.*' => 'exists:office_locations,id',
            'scope_type_check_out' => "required|$scopeRule",
            'office_location_ids_check_out' => 'required_if:scope_type_check_out,SPECIFIC_BRANCHES|array',
            'office_location_ids_check_out.*' => 'exists:office_locations,id',
            'effective_start_date' => 'nullable|date',
            'effective_end_date' => 'nullable|date|after_or_equal:effective_start_date',
            'reason' => 'required|string|max:1000',
        ]);

        $existing = EmployeeAttendanceLocationOverride::where('employee_id', $employeeId)->first();

        $oldValues = $existing ? [
            'scope_type_check_in' => $existing->scope_type_check_in,
            'scope_type_check_out' => $existing->scope_type_check_out,
            'effective_start_date' => $existing->effective_start_date?->toDateString(),
            'effective_end_date' => $existing->effective_end_date?->toDateString(),
            'office_location_ids_check_in' => $existing->officesCheckIn()->pluck('office_locations.id')->toArray(),
            'office_location_ids_check_out' => $existing->officesCheckOut()->pluck('office_locations.id')->toArray(),
        ] : null;

        $override = EmployeeAttendanceLocationOverride::updateOrCreate(
            ['employee_id' => $employeeId],
            [
                'scope_type_check_in' => $validated['scope_type_check_in'],
                'scope_type_check_out' => $validated['scope_type_check_out'],
                'effective_start_date' => $validated['effective_start_date'] ?? null,
                'effective_end_date' => $validated['effective_end_date'] ?? null,
                'reason' => $validated['reason'],
                'created_by' => $request->user()->id,
            ]
        );

        // Sync PER ARAH - officesCheckIn()/officesCheckOut() sudah
        // di-scope withPivotValue('direction', ...) di model, jadi
        // sync() di sini otomatis ngisi kolom direction yang benar dan
        // detach cuma baris arah itu doang, gak ganggu arah lainnya.
        if ($validated['scope_type_check_in'] === 'SPECIFIC_BRANCHES') {
            $override->officesCheckIn()->sync($validated['office_location_ids_check_in']);
        } else {
            $override->officesCheckIn()->sync([]);
        }

        if ($validated['scope_type_check_out'] === 'SPECIFIC_BRANCHES') {
            $override->officesCheckOut()->sync($validated['office_location_ids_check_out']);
        } else {
            $override->officesCheckOut()->sync([]);
        }

        AuditLogService::log(
            $override,
            $existing ? 'override_updated' : 'override_created',
            $oldValues,
            [
                'scope_type_check_in' => $validated['scope_type_check_in'],
                'scope_type_check_out' => $validated['scope_type_check_out'],
                'effective_start_date' => $validated['effective_start_date'] ?? null,
                'effective_end_date' => $validated['effective_end_date'] ?? null,
                'office_location_ids_check_in' => $validated['office_location_ids_check_in'] ?? [],
                'office_location_ids_check_out' => $validated['office_location_ids_check_out'] ?? [],
                'reason' => $validated['reason'],
            ],
            $request->user()->id,
            "Set attendance location override untuk karyawan: {$employee->full_name}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Override attendance location berhasil disimpan.',
            'data' => $override->fresh()->load(['employee', 'officesCheckIn', 'officesCheckOut', 'creator']),
        ]);
    }

    /**
     * Hapus override - employee ini balik ikut Position Policy lagi.
     * 1 tombol, hapus KESELURUHAN baris (kedua arah sekaligus) - pivot
     * offices (kedua arah) ikut kehapus otomatis lewat cascadeOnDelete
     * di migration aslinya, gak perlu detach manual di sini.
     */
    public function destroy(Request $request, string $employeeId): JsonResponse
    {
        $override = EmployeeAttendanceLocationOverride::where('employee_id', $employeeId)->first();

        if ($override) {

            AuditLogService::log(
                $override,
                'override_deleted',
                [
                    'scope_type_check_in' => $override->scope_type_check_in,
                    'scope_type_check_out' => $override->scope_type_check_out,
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
