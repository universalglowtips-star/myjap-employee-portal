<?php

namespace App\Services;

use App\Http\Requests\StoreEmployeeRequest;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmployeeService
{
    protected EmployeeCodeService $employeeCodeService;

    public function __construct(EmployeeCodeService $employeeCodeService)
    {
        $this->employeeCodeService = $employeeCodeService;
    }

    /**
     * Simpan Data Karyawan
     */
    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        DB::beginTransaction();

        try {

            // Generate Employee Code
            $employeeCode = $this->employeeCodeService->generate(
                $request->office_location_id,
                $request->join_date
            );

            // Upload Foto
            $photo = null;

            if ($request->hasFile('photo')) {
                $photo = $request->file('photo')->store('employees', 'public');
            }

            // Simpan Data Employee
            $employee = Employee::create([

                'employee_code'      => $employeeCode,

                'department_id'      => $request->department_id,
                'position_id'        => $request->position_id,
                'work_shift_id'      => $request->work_shift_id,
                'office_location_id' => $request->office_location_id,
                'role_id'            => $request->role_id,

                'full_name'          => $request->full_name,
                'email'              => $request->email,
                'phone'              => $request->phone,

                'password'           => $request->password,

                'birth_date'         => $request->birth_date,
                'gender'             => $request->gender,
                'address'            => $request->address,

                'join_date'          => $request->join_date,
                'basic_salary'       => $request->basic_salary,

                'photo'              => $photo,

                'is_active'          => $request->boolean('is_active', true),

            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Data karyawan berhasil disimpan.',
                'data'    => $employee,
            ], 201);

        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Data karyawan gagal disimpan.',
                'error'   => $e->getMessage(),
            ], 500);

        }
    }
}