<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEmployeeRequest;
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
     * Update data karyawan
     */
    public function update(Request $request, string $id)
{

    $employee = Employee::find($id);

    if (!$employee) {
        return response()->json([
            'success' => false,
            'message' => 'Data karyawan tidak ditemukan.'
        ], 404);
    }

    $validated = $request->validate([
        'department_id'      => 'required|exists:departments,id',
        'position_id'        => 'required|exists:positions,id',
        'work_shift_id'      => 'required|exists:work_shifts,id',
        'office_location_id' => 'required|exists:office_locations,id',
        'role_id'            => 'required|exists:roles,id',
        'full_name'          => 'required|string|max:100',
        'email'              => 'required|email|unique:employees,email,' . $employee->id,
        'phone'              => 'required|string|max:20',
        'password'           => 'nullable|min:8',
        'birth_date'         => 'required|date',
        'gender'             => 'required|in:L,P',
        'address'            => 'required|string',
        'join_date'          => 'required|date',
        'basic_salary'       => 'required|numeric',
        'is_active'          => 'required|boolean',
    ]);

    if (!empty($validated['password'])) {
        $validated['password'] = Hash::make($validated['password']);
    } else {
        unset($validated['password']);
    }

    $employee->update($validated);

    return response()->json([
        'success' => true,
        'message' => 'Data karyawan berhasil diperbarui.',
        'data'    => $employee->load([
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
    public function destroy(string $id)
    {
        // Akan kita kerjakan nanti
    }
}