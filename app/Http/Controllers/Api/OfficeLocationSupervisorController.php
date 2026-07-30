<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OfficeLocation;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfficeLocationSupervisorController extends Controller
{
    /**
     * Lihat siapa saja supervisor untuk 1 kantor/cabang.
     */
    public function index(string $officeLocationId): JsonResponse
    {
        $office = OfficeLocation::with('supervisors')->findOrFail($officeLocationId);

        return response()->json([
            'success' => true,
            'message' => 'Data supervisor kantor berhasil diambil.',
            'data' => [
                'office' => [
                    'id' => $office->id,
                    'office_code' => $office->office_code,
                    'office_name' => $office->office_name,
                ],
                'supervisors' => $office->supervisors,
            ],
        ]);
    }

    /**
     * Sync daftar supervisor untuk 1 kantor (replace total).
     * Body: { "employee_ids": [1, 2, 3] }
     */
    public function update(Request $request, string $officeLocationId): JsonResponse
    {
        $office = OfficeLocation::findOrFail($officeLocationId);

        $validated = $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
        ]);

        $oldSupervisorIds = $office->supervisors()->pluck('employees.id')->toArray();

        $office->supervisors()->sync($validated['employee_ids']);

        AuditLogService::log(
            $office,
            'supervisor_updated',
            ['supervisor_ids' => $oldSupervisorIds],
            ['supervisor_ids' => $validated['employee_ids']],
            $request->user()->id,
            "Update supervisor untuk kantor: {$office->office_name}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Supervisor kantor berhasil diperbarui.',
            'data' => $office->fresh()->load('supervisors'),
        ]);
    }
}
