<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Daftar permission granular per modul. Kalau nanti ada modul baru,
     * tinggal tambah baris di sini + migration baru buat isi datanya -
     * tidak perlu ubah struktur tabel permissions.
     */
    public function run(): void
    {
        $crud = ['view', 'create', 'update', 'delete'];

        $modules = [

            'department' => $crud,
            'position' => $crud,
            'role' => $crud,
            'work-shift' => $crud,
            'office-location' => $crud,
            'employee' => $crud,
            'attendance' => $crud,

            'leave' => [...$crud, 'approve', 'reject', 'cancel'],

            'payslip' => [...$crud, 'publish', 'unpublish'],

            'payroll' => ['generate-bulk', 'publish-bulk'],

            'store-item' => $crud,

            'store-transaction' => ['view', 'create', 'delete'],

            'company-setting' => ['view', 'update'],

            'dashboard' => ['view'],

            'notification' => ['view', 'delete'],

        ];

        foreach ($modules as $module => $actions) {
            foreach ($actions as $action) {

                Permission::firstOrCreate(
                    ['permission_code' => "{$module}.{$action}"],
                    [
                        'module' => $module,
                        'action' => $action,
                        'description' => ucfirst($action) . ' ' . str_replace('-', ' ', $module),
                    ]
                );
            }
        }
    }
}
