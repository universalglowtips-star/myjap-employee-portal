<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Position;
use App\Models\Department;

class PositionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ambil ID Department
        $direksi = Department::where('department_code', 'DIR')->first()->id;
        $hrd     = Department::where('department_code', 'HRD')->first()->id;
        $ops     = Department::where('department_code', 'OPS')->first()->id;
        $it      = Department::where('department_code', 'IT')->first()->id;
        $finance = Department::where('department_code', 'FIN')->first()->id;

        Position::insert([

            [
                'department_id' => $direksi,
                'position_code' => 'DIR',
                'position_name' => 'Director',
                'allowance' => 10000000,
                'description' => 'Direktur Perusahaan',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_id' => $direksi,
                'position_code' => 'GM',
                'position_name' => 'General Manager',
                'allowance' => 7000000,
                'description' => 'General Manager',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_id' => $ops,
                'position_code' => 'MGR',
                'position_name' => 'Manager',
                'allowance' => 5000000,
                'description' => 'Manager Operasional',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_id' => $ops,
                'position_code' => 'ASM',
                'position_name' => 'Assistant Manager',
                'allowance' => 3000000,
                'description' => 'Assistant Manager',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_id' => $ops,
                'position_code' => 'SPV',
                'position_name' => 'Supervisor',
                'allowance' => 2000000,
                'description' => 'Supervisor',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_id' => $ops,
                'position_code' => 'ADM',
                'position_name' => 'Administrator',
                'allowance' => 1000000,
                'description' => 'Administrator',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_id' => $hrd,
                'position_code' => 'HR',
                'position_name' => 'HR Staff',
                'allowance' => 1000000,
                'description' => 'Human Resource Staff',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_id' => $finance,
                'position_code' => 'FIN',
                'position_name' => 'Finance Staff',
                'allowance' => 1000000,
                'description' => 'Finance Staff',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_id' => $it,
                'position_code' => 'IT',
                'position_name' => 'IT Support',
                'allowance' => 1000000,
                'description' => 'IT Support',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_id' => $ops,
                'position_code' => 'DRV',
                'position_name' => 'Driver',
                'allowance' => 500000,
                'description' => 'Driver',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_id' => $ops,
                'position_code' => 'CRT',
                'position_name' => 'Courier',
                'allowance' => 500000,
                'description' => 'Courier',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_id' => $ops,
                'position_code' => 'SRT',
                'position_name' => 'Sorter',
                'allowance' => 500000,
                'description' => 'Sorter Gudang',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

        ]);
    }
}