<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLocationPolicy;
use App\Models\Position;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceLocationPolicyController extends Controller
{
    /**
     * List semua policy yang sudah di-set (posisi yang belum di-set
     * otomatis default HOME_ONLY, tidak muncul di sini).
     */
    public function index(): JsonResponse
    {
        $policies = AttendanceLocationPolicy::with(['position', 'offices'])->get();

        return response()->json([
            'success' => true,
            'message' => 'Data attendance location policy berhasil diambil.',
            'data' => $policies,
        ]);
    }

    /**
     * Lihat policy untuk satu posisi. Kalau belum pernah di-set,
     * balikin default HOME_ONLY (bukan error).
     */
    public function show(string $positionId): JsonResponse
    {
        $position = Position::findOrFail($positionId);

        $policy = AttendanceLocationPolicy::with('offices')
            ->where('position_id', $positionId)
            ->first();

        return response()->json([
            'success' => true,
            'message' => 'Data attendance location policy berhasil diambil.',
            'data' => [
                'position' => $position,
                'policy' => $policy ?? [
                    'scope_type' => 'HOME_ONLY',
                    'offices' => [],
                    'is_default' => true,
                ],
            ],
        ]);
    }

    /**
     * Set/update policy untuk satu posisi (upsert - 1 posisi cuma 1 policy).
     * Body: { "scope_type": "...", "office_location_ids": [...] }
     * office_location_ids cuma wajib kalau scope_type = SPECIFIC_BRANCHES.
     */
    public function update(Request $request, string $positionId): JsonResponse
    {
        $position = Position::findOrFail($positionId);

        $validated = $request->validate([
            'scope_type' => 'required|in:HOME_ONLY,ALL_BRANCHES,SPECIFIC_BRANCHES,SUPERVISED_BRANCHES',
            'office_location_ids' => 'required_if:scope_type,SPECIFIC_BRANCHES|array',
            'office_location_ids.*' => 'exists:office_locations,id',
        ]);

        $existingPolicy = AttendanceLocationPolicy::where('position_id', $positionId)->first();
        $oldValues = $existingPolicy ? [
            'scope_type' => $existingPolicy->scope_type,
            'office_location_ids' => $existingPolicy->offices()->pluck('office_locations.id')->toArray(),
        ] : ['scope_type' => 'HOME_ONLY (default)', 'office_location_ids' => []];

        $policy = AttendanceLocationPolicy::updateOrCreate(
            ['position_id' => $positionId],
            ['scope_type' => $validated['scope_type']]
        );

        if ($validated['scope_type'] === 'SPECIFIC_BRANCHES') {
            $policy->offices()->sync($validated['office_location_ids']);
        } else {
            // Scope lain gak butuh daftar kantor spesifik, kosongin biar bersih
            $policy->offices()->sync([]);
        }

        AuditLogService::log(
            $policy,
            'policy_updated',
            $oldValues,
            [
                'scope_type' => $validated['scope_type'],
                'office_location_ids' => $validated['office_location_ids'] ?? [],
            ],
            $request->user()->id,
            "Update attendance location policy untuk posisi: {$position->position_name}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Attendance location policy berhasil disimpan.',
            'data' => $policy->fresh()->load(['position', 'offices']),
        ]);
    }

    /**
     * Hapus policy custom - posisi ini balik ke default HOME_ONLY.
     */
    public function destroy(Request $request, string $positionId): JsonResponse
    {
        $policy = AttendanceLocationPolicy::where('position_id', $positionId)->first();

        if ($policy) {

            $oldValues = [
                'scope_type' => $policy->scope_type,
                'office_location_ids' => $policy->offices()->pluck('office_locations.id')->toArray(),
            ];

            AuditLogService::log(
                $policy,
                'policy_deleted',
                $oldValues,
                null,
                $request->user()->id,
                'Hapus attendance location policy, posisi kembali ke default HOME_ONLY'
            );

            $policy->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Policy dihapus, posisi ini kembali ke default HOME_ONLY.',
        ]);
    }
}
