<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeSalaryComponent;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Task 15b - override nominal/tarif komponen gaji per karyawan (misal
 * senioritas). Pola CRUD per-baris sama persis EmployeeOfficeScopeController
 * (Task 8e), sesuai instruksi. TIDAK ADA kolom alasan - override murni
 * angka, sistem gak perlu tau kenapa (keputusan eksplisit Bagus).
 */
class EmployeeSalaryComponentController extends Controller
{
    public function index(string $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $overrides = $employee->salaryComponentOverrides()->with('salaryComponent')->get();

        return response()->json([
            'success' => true,
            'message' => 'Data override komponen gaji karyawan berhasil diambil.',
            'data' => $overrides,
        ]);
    }

    /**
     * Upsert - override nominal WAJAR direvisi dari waktu ke waktu
     * (misal kenaikan), submit ulang buat komponen yang sudah pernah
     * di-override di-treat sebagai UPDATE, bukan error duplikat.
     */
    public function store(Request $request, string $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $validated = $request->validate([
            'salary_component_id' => 'required|exists:salary_components,id',
            'amount' => 'required|numeric|min:0',
        ]);

        $override = EmployeeSalaryComponent::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'salary_component_id' => $validated['salary_component_id'],
            ],
            [
                'amount' => $validated['amount'],
            ]
        );

        AuditLogService::log(
            $override,
            'created',
            null,
            $override->only(['employee_id', 'salary_component_id', 'amount']),
            $request->user()->id,
            "Set override komponen gaji untuk karyawan: {$employee->full_name}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Override komponen gaji berhasil disimpan.',
            'data' => $override->load('salaryComponent'),
        ], 201);
    }

    /**
     * Cabut override - karyawan balik ikut default jabatannya lagi
     * (PositionSalaryComponent), bukan jadi 0.
     */
    public function destroy(Request $request, string $employeeId, string $salaryComponentId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $override = $employee->salaryComponentOverrides()->where('salary_component_id', $salaryComponentId)->first();

        if (! $override) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan ini belum punya override untuk komponen gaji tersebut.',
            ], 404);
        }

        $oldValues = $override->only(['employee_id', 'salary_component_id', 'amount']);

        $override->delete();

        AuditLogService::log(
            $override,
            'deleted',
            $oldValues,
            null,
            $request->user()->id,
            "Cabut override komponen gaji dari karyawan: {$employee->full_name}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Override berhasil dicabut, karyawan kembali pakai default jabatannya.',
        ]);
    }
}
