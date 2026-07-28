<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Models\Employee;
use App\Services\EmployeeService;
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

    $employee->delete();

    return response()->json([
        'success' => true,
        'message' => 'Data karyawan berhasil dihapus.'
    ], 200);
}

}