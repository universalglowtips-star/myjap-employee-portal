<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Default permission assignment per role, khusus untuk modul yang
     * enforcement-nya diaktifkan tahap ini: Employee, Attendance, Leave,
     * Payslip/Payroll, Dashboard, Notification.
     *
     * SUPER_ADMIN sengaja tidak ada di sini - selalu bypass lewat
     * Role::hasPermission().
     *
     * Catatan penting: permission ini mengatur akses ke ENDPOINT,
     * bukan scoping per-baris data (misal EMPLOYEE dengan leave.view
     * masih bisa lihat daftar cuti SEMUA orang, bukan cuma cutinya
     * sendiri). Row-level scoping itu pekerjaan fase berikutnya.
     */
    public function run(): void
    {
        $map = [

            'DIRECTOR' => [
                'employee.view',
                'attendance.view',
                'leave.view', 'leave.approve', 'leave.reject',
                'payslip.view', 'payslip.publish', 'payslip.unpublish',
                'dashboard.view',
                'notification.view', 'notification.delete',
            ],

            'MANAGER' => [
                'employee.view',
                'attendance.view', 'attendance.create', 'attendance.update',
                'leave.view', 'leave.approve', 'leave.reject',
                'payslip.view',
                'dashboard.view',
                'notification.view', 'notification.delete',
            ],

            'HRD' => [
                'employee.view', 'employee.create', 'employee.update', 'employee.delete',
                'attendance.view', 'attendance.create', 'attendance.update', 'attendance.delete',
                'leave.view', 'leave.create', 'leave.update', 'leave.delete', 'leave.approve', 'leave.reject', 'leave.cancel',
                'payslip.view', 'payslip.create', 'payslip.update', 'payslip.delete', 'payslip.publish', 'payslip.unpublish',
                'payroll.generate-bulk', 'payroll.publish-bulk',
                'dashboard.view',
                'notification.view', 'notification.delete',
            ],

            'EMPLOYEE' => [
                'attendance.view', 'attendance.create',
                'leave.view', 'leave.create',
                'payslip.view',
                'notification.view', 'notification.delete',
            ],

        ];

        foreach ($map as $roleCode => $permissionCodes) {

            $role = Role::where('role_code', $roleCode)->first();

            if (!$role) {
                continue; // skip kalau role belum ada, jangan bikin error
            }

            $permissionIds = Permission::whereIn('permission_code', $permissionCodes)->pluck('id');

            $role->permissions()->syncWithoutDetaching($permissionIds);
        }
    }
}
