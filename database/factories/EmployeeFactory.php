<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Employee;
use App\Models\OfficeLocation;
use App\Models\Position;
use App\Models\Role;
use App\Models\WorkShift;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'employee_code' => 'EMP-' . strtoupper(Str::random(6)),
            'full_name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->numerify('08##########'),
            'password' => 'password123', // otomatis di-hash lewat cast 'hashed'
            'gender' => fake()->randomElement(['L', 'P']),
            'birth_date' => fake()->date(),
            'address' => fake()->address(),
            // Ambil dari master data yang sudah di-seed (bukan bikin baru),
            // supaya test gak perlu factory turunan buat tiap master table.
            // WAJIB panggil $this->seed() dulu di test sebelum pakai factory ini.
            'department_id' => Department::first()?->id,
            'position_id' => Position::first()?->id,
            'role_id' => Role::where('role_code', 'EMPLOYEE')->first()?->id ?? Role::first()?->id,
            'work_shift_id' => WorkShift::first()?->id,
            'office_location_id' => OfficeLocation::first()?->id,
            'join_date' => fake()->date(),
            'basic_salary' => fake()->numberBetween(3000000, 10000000),
            'is_active' => true,
        ];
    }

    /**
     * Pakai role yang sudah ada di database (dari seeder) berdasarkan
     * role_code, daripada bikin role baru - buat konsistensi test
     * dengan data production (SUPER_ADMIN, HRD, EMPLOYEE, dst).
     */
    public function withRole(string $roleCode): static
    {
        return $this->state(function () use ($roleCode) {
            $role = Role::where('role_code', $roleCode)->first();

            return [
                'role_id' => $role?->id,
            ];
        });
    }
}
