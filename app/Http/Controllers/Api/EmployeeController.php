<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEmployeeRequest;
use App\Models\Employee;
use App\Services\EmployeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
     * Update data karyawan
     */
    public function update(Request $request, string $id)
    {
        // Akan kita kerjakan nanti
    }

    /**
     * Hapus data karyawan
     */
    public function destroy(string $id)
    {
        // Akan kita kerjakan nanti
    }
}