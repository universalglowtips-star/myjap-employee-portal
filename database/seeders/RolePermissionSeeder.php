<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Default permission assignment per role, sekarang mencakup SEMUA
     * modul yang di-enforce: Master Data (Department/Position/Role/
     * Work Shift/Office Location), Employee, Attendance, Leave,
     * Payslip/Payroll, Company Settings, Store, Dashboard, Notification.
     *
     * SUPER_ADMIN sengaja tidak ada di sini - selalu bypass lewat
     * Role::hasPermission().
     *
     * Keputusan keamanan sengaja: TIDAK ADA role (selain SUPER_ADMIN)
     * yang dikasih 'role.update' - supaya tidak ada role operasional
     * yang bisa mengubah-ubah permission role lain (privilege escalation).
     * Cuma SUPER_ADMIN yang boleh atur permission lewat RolePermissionController.
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
                'department.view', 'position.view', 'role.view', 'work-shift.view', 'office-location.view',
                'employee.view',
                'attendance.view',
                'leave.view', 'leave.approve', 'leave.reject',
                'payslip.view', 'payslip.publish', 'payslip.unpublish',
                'company-setting.view',
                'store-item.view', 'store-transaction.view',
                'dashboard.view',
                'notification.view', 'notification.delete',
                'attendance-location-policy.view',
                'audit-log.view',
            ],

            'MANAGER' => [
                'department.view', 'position.view', 'role.view', 'work-shift.view', 'office-location.view',
                'employee.view',
                'attendance.view', 'attendance.create', 'attendance.update',
                'leave.view', 'leave.approve', 'leave.reject',
                'payslip.view',
                'company-setting.view',
                'store-item.view', 'store-transaction.view', 'store-transaction.create',
                'dashboard.view',
                'notification.view', 'notification.delete',
            ],

            'HRD' => [
                'department.view', 'department.create', 'department.update', 'department.delete',
                'position.view', 'position.create', 'position.update', 'position.delete',
                'role.view',
                'work-shift.view', 'work-shift.create', 'work-shift.update', 'work-shift.delete',
                'office-location.view', 'office-location.create', 'office-location.update', 'office-location.delete',
                'employee.view', 'employee.create', 'employee.update', 'employee.delete',
                'attendance.view', 'attendance.create', 'attendance.update', 'attendance.delete',
                'leave.view', 'leave.create', 'leave.update', 'leave.delete', 'leave.approve', 'leave.reject', 'leave.cancel',
                'payslip.view', 'payslip.create', 'payslip.update', 'payslip.delete', 'payslip.publish', 'payslip.unpublish',
                'payroll.generate-bulk', 'payroll.publish-bulk',
                'company-setting.view', 'company-setting.update',
                'store-item.view', 'store-item.create', 'store-item.update', 'store-item.delete',
                'store-transaction.view', 'store-transaction.create', 'store-transaction.delete',
                'dashboard.view',
                'notification.view', 'notification.delete',
                'attendance-location-policy.view', 'attendance-location-policy.update',
                'audit-log.view',
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
