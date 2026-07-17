<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Department;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Department::insert([

            [
                'department_code' => 'DIR',
                'department_name' => 'Direksi',
                'description' => 'Direktur Perusahaan',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_code' => 'HRD',
                'department_name' => 'Human Resource',
                'description' => 'Human Resource Department',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_code' => 'OPS',
                'department_name' => 'Operational',
                'description' => 'Divisi Operasional',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_code' => 'IT',
                'department_name' => 'Information Technology',
                'description' => 'Divisi Teknologi Informasi',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'department_code' => 'FIN',
                'department_name' => 'Finance',
                'description' => 'Divisi Keuangan',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

        ]);
    }
}