<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Models\Employee;
use App\Services\EmployeeService;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{
    protected EmployeeService $employeeService;

    public function __construct(EmployeeService $employeeService)
    {
        $this->employeeService = $employeeService;
    }

    /**
     * Menampilkan seluruh data karyawan
     */
    public function index(): JsonResponse
    {
        $employees = Employee::with([
            'department',
            'position',
            'role',
            'workShift',
            'officeLocation'
        ])
        ->orderBy('full_name', 'asc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data karyawan berhasil diambil.',
            'total'   => $employees->count(),
            'data'    => $employees
        ], 200);
    }

    /**
     * Menyimpan data karyawan baru
     */
    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        return $this->employeeService->store($request);
    }

    /**
     * Menampilkan detail karyawan
     */
    public function show(string $id): JsonResponse
    {
        $employee = Employee::with([
            'department',
            'position',
            'role',
            'workShift',
            'officeLocation'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $employee
        ]);
    }

    /**
     * Update data karyawan (partial update - hanya field yang dikirim
     * yang akan diubah, tidak perlu kirim ulang seluruh data).
     */
    public function update(UpdateEmployeeRequest $request, string $id): JsonResponse
    {
        $employee = Employee::find($id);

        if (!$employee) {
            return response()->json([
                'success' => false,
                'message' => 'Data karyawan tidak ditemukan.'
            ], 404);
        }

        $validated = $request->validated();

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $employee->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data karyawan berhasil diperbarui.',
            'data'    => $employee->fresh()->load([
                'department',
                'position',
                'role',
                'workShift',
                'officeLocation'
            ])
        ], 200);
    }

    /**
     * Hapus data karyawan
     */
public function destroy(string $id): JsonResponse
{
    $employee = Employee::find($id);

    if (!$employee) {
        return response()->json([
            'success' => false,
            'message' => 'Data karyawan tidak ditemukan.'
        ], 404);
    }

    $oldValues = $employee->only(['id', 'full_name', 'email', 'is_active']);

    $employee->delete(); // soft delete (trait SoftDeletes) - data lain (payroll, attendance, dll) tetap utuh

    AuditLogService::log(
        $employee,
        'deleted',
        $oldValues,
        null,
        request()->user()?->id,
        "Soft delete karyawan: {$employee->full_name}"
    );

    return response()->json([
        'success' => true,
        'message' => 'Data karyawan berhasil dihapus (soft delete). Riwayat payroll/attendance/leave tetap tersimpan.'
    ], 200);
}

/**
 * List karyawan yang sudah di-soft-delete - buat HRD cek/pulihkan
 * kalau ada yang kehapus gak sengaja.
 */
public function trashed(): JsonResponse
{
    $employees = Employee::onlyTrashed()->paginate(request()->integer('per_page', 10));

    return response()->json([
        'success' => true,
        'message' => 'Data karyawan yang dihapus berhasil diambil.',
        'total' => $employees->total(),
        'data' => $employees->items(),
        'pagination' => [
            'current_page' => $employees->currentPage(),
            'per_page' => $employees->perPage(),
            'last_page' => $employees->lastPage(),
        ]
    ]);
}

/**
 * Pulihkan karyawan yang sudah di-soft-delete.
 */
public function restore(string $id): JsonResponse
{
    $employee = Employee::onlyTrashed()->find($id);

    if (!$employee) {
        return response()->json([
            'success' => false,
            'message' => 'Data karyawan yang dihapus tidak ditemukan.'
        ], 404);
    }

    $employee->restore();

    AuditLogService::log(
        $employee,
        'restored',
        null,
        $employee->only(['id', 'full_name', 'email']),
        request()->user()?->id,
        "Pulihkan karyawan: {$employee->full_name}"
    );

    return response()->json([
        'success' => true,
        'message' => 'Data karyawan berhasil dipulihkan.',
        'data' => $employee->fresh()
    ]);
}

}