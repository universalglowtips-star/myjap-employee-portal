<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $employees = Employee::with([
            'department',
            'position',
            'role',
            'workShift'
        ])->orderBy('full_name', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Data karyawan berhasil diambil.',
            'total' => $employees->count(),
            'data' => $employees
        ], 200);
    }

    /**
 * Store a newly created employee.
 */
public function store(Request $request): JsonResponse
{
    $validated = $request->validate([
        'full_name'      => 'required|string|max:100',
        'email'          => 'required|email|unique:employees,email',
        'phone'          => 'nullable|string|max:20',
        'password'       => 'required|min:6',

        'gender'         => 'required|in:L,P',
        'birth_date'     => 'required|date',
        'address'        => 'nullable|string',

        'department_id'  => 'required|exists:departments,id',
        'position_id'    => 'required|exists:positions,id',
        'role_id'        => 'required|exists:roles,id',
        'work_shift_id'  => 'required|exists:work_shifts,id',

        'join_date'      => 'required|date',
        'basic_salary'   => 'required|numeric|min:0',

        'photo'          => 'nullable|string',
        'is_active'      => 'boolean'
    ]);

    // Generate kode karyawan
    $lastEmployee = Employee::latest('id')->first();

    if ($lastEmployee) {
        $number = (int) substr($lastEmployee->employee_code, 3) + 1;
    } else {
        $number = 1;
    }

    $validated['employee_code'] = 'EMP' . str_pad($number, 4, '0', STR_PAD_LEFT);

    // Hash password
    $validated['password'] = Hash::make($validated['password']);

    // Simpan data
    $employee = Employee::create($validated);

    return response()->json([
        'success' => true,
        'message' => 'Data karyawan berhasil ditambahkan.',
        'data'    => $employee
    ], 201);
}

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}