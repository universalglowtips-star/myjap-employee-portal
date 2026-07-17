<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Role::insert([

            [
                'role_code' => 'SUPER_ADMIN',
                'role_name' => 'Super Administrator',
                'description' => 'Akses penuh ke seluruh sistem',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'role_code' => 'DIRECTOR',
                'role_name' => 'Director',
                'description' => 'Direktur Perusahaan',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'role_code' => 'MANAGER',
                'role_name' => 'Manager',
                'description' => 'Manager Divisi',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'role_code' => 'HRD',
                'role_name' => 'Human Resource',
                'description' => 'Human Resource Department',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'role_code' => 'EMPLOYEE',
                'role_name' => 'Employee',
                'description' => 'Karyawan',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

        ]);
    }
}