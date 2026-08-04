<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeOfficeScope;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeOfficeScopeController extends Controller
{
    /**
     * List cabang mana aja yang jadi wewenang employee ini.
     */
    public function index(string $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $scopes = $employee->officeScopes()->with(['officeLocation', 'grantedBy'])->get();

        return response()->json([
            'success' => true,
            'message' => 'Data wewenang cabang karyawan berhasil diambil.',
            'data' => $scopes,
        ]);
    }

    /**
     * Kasih wewenang baru ke 1 cabang. Bisa dipanggil berkali-kali
     * buat kasih beberapa cabang sekaligus (1 request = 1 cabang).
     */
    public function store(Request $request, string $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $validated = $request->validate([
            'office_location_id' => 'required|exists:office_locations,id',
        ]);

        $exists = $employee->officeScopes()
            ->where('office_location_id', $validated['office_location_id'])
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan ini sudah punya wewenang di cabang tersebut.'
            ], 409);
        }

        $scope = EmployeeOfficeScope::create([
            'employee_id' => $employee->id,
            'office_location_id' => $validated['office_location_id'],
            'granted_by' => $request->user()->id,
        ]);

        AuditLogService::log(
            $scope,
            'created',
            null,
            $scope->only(['employee_id', 'office_location_id']),
            $request->user()->id,
            "Kasih wewenang cabang baru untuk karyawan: {$employee->full_name}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Wewenang cabang berhasil ditambahkan.',
            'data' => $scope->load(['officeLocation', 'grantedBy']),
        ], 201);
    }

    /**
     * Cabut wewenang dari 1 cabang tertentu.
     */
    public function destroy(Request $request, string $employeeId, string $officeLocationId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $scope = $employee->officeScopes()
            ->where('office_location_id', $officeLocationId)
            ->first();

        if (!$scope) {
            return response()->json([
                'success' => false,
                'message' => 'Wewenang cabang ini tidak ditemukan untuk karyawan tersebut.'
            ], 404);
        }

        $oldValues = $scope->only(['employee_id', 'office_location_id']);

        $scope->delete();

        AuditLogService::log(
            $scope,
            'deleted',
            $oldValues,
            null,
            $request->user()->id,
            "Cabut wewenang cabang dari karyawan: {$employee->full_name}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Wewenang cabang berhasil dicabut.',
        ]);
    }
}
