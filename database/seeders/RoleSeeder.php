<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Pakai firstOrCreate (bukan insert() mentah) - idempotent, aman
     * dijalankan ulang di environment manapun tanpa bikin duplikat.
     * Ini yang bikin FINANCE (dan role core lainnya) otomatis konsisten
     * di semua environment tanpa perlu setup manual lewat API.
     */
    public function run(): void
    {
        $roles = [

            [
                'role_code' => 'SUPER_ADMIN',
                'role_name' => 'Super Administrator',
                'description' => 'Akses penuh ke seluruh sistem',
            ],

            [
                'role_code' => 'DIRECTOR',
                'role_name' => 'Director',
                'description' => 'Direktur Perusahaan',
            ],

            [
                'role_code' => 'MANAGER',
                'role_name' => 'Manager',
                'description' => 'Manager Divisi/Cabang',
            ],

            [
                'role_code' => 'FINANCE',
                'role_name' => 'Finance',
                'description' => 'Divisi Keuangan',
            ],

            [
                'role_code' => 'HRD',
                'role_name' => 'Human Resource',
                'description' => 'Human Resource Department',
            ],

            [
                'role_code' => 'EMPLOYEE',
                'role_name' => 'Employee',
                'description' => 'Karyawan',
            ],

        ];

        foreach ($roles as $role) {

            Role::firstOrCreate(
                ['role_code' => $role['role_code']],
                [
                    'role_name' => $role['role_name'],
                    'description' => $role['description'],
                    'is_active' => true,
                ]
            );
        }
    }
}