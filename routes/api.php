<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\PositionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\WorkShiftController;
use App\Http\Controllers\Api\OfficeLocationController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\PayslipController;
use App\Http\Controllers\Api\CompanySettingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\StoreItemController;
use App\Http\Controllers\Api\StoreTransactionController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\AttendanceLocationPolicyController;
use App\Http\Controllers\Api\EmployeeAttendanceLocationOverrideController;
use App\Http\Controllers\Api\OfficeLocationSupervisorController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\PayrollPeriodController;
use App\Http\Controllers\Api\ApprovalWorkflowController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Public Route
|
*/

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::post('/v1/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

/*
|--------------------------------------------------------------------------
| Protected Route
|--------------------------------------------------------------------------
|
| Semua endpoint di bawah harus login menggunakan Sanctum
|
*/

$apiRoutes = function () {

    // =========================
    // AUTH
    // =========================

    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/me', function (Request $request) {
        return $request->user();
    });

    // =========================
    // MASTER DATA
    // =========================

    Route::apiResource('departments', DepartmentController::class)
        ->only(['index', 'show'])->middleware('permission:department.view');

    Route::apiResource('departments', DepartmentController::class)
        ->only(['store'])->middleware('permission:department.create');

    Route::apiResource('departments', DepartmentController::class)
        ->only(['update'])->middleware('permission:department.update');

    Route::apiResource('departments', DepartmentController::class)
        ->only(['destroy'])->middleware('permission:department.delete');

    Route::apiResource('positions', PositionController::class)
        ->only(['index', 'show'])->middleware('permission:position.view');

    Route::apiResource('positions', PositionController::class)
        ->only(['store'])->middleware('permission:position.create');

    Route::apiResource('positions', PositionController::class)
        ->only(['update'])->middleware('permission:position.update');

    Route::apiResource('positions', PositionController::class)
        ->only(['destroy'])->middleware('permission:position.delete');

    Route::apiResource('roles', RoleController::class)
        ->only(['index', 'show'])->middleware('permission:role.view');

    Route::apiResource('roles', RoleController::class)
        ->only(['store'])->middleware('permission:role.create');

    Route::apiResource('roles', RoleController::class)
        ->only(['update'])->middleware('permission:role.update');

    Route::apiResource('roles', RoleController::class)
        ->only(['destroy'])->middleware('permission:role.delete');

    Route::apiResource('work-shifts', WorkShiftController::class)
        ->only(['index', 'show'])->middleware('permission:work-shift.view');

    Route::apiResource('work-shifts', WorkShiftController::class)
        ->only(['store'])->middleware('permission:work-shift.create');

    Route::apiResource('work-shifts', WorkShiftController::class)
        ->only(['update'])->middleware('permission:work-shift.update');

    Route::apiResource('work-shifts', WorkShiftController::class)
        ->only(['destroy'])->middleware('permission:work-shift.delete');

    Route::apiResource('office-locations', OfficeLocationController::class)
        ->only(['index', 'show'])->middleware('permission:office-location.view');

    Route::apiResource('office-locations', OfficeLocationController::class)
        ->only(['store'])->middleware('permission:office-location.create');

    Route::apiResource('office-locations', OfficeLocationController::class)
        ->only(['update'])->middleware('permission:office-location.update');

    Route::apiResource('office-locations', OfficeLocationController::class)
        ->only(['destroy'])->middleware('permission:office-location.delete');

    Route::apiResource('employees', EmployeeController::class)
        ->only(['index', 'show'])->middleware('permission:employee.view');

    Route::apiResource('employees', EmployeeController::class)
        ->only(['store'])->middleware('permission:employee.create');

    Route::apiResource('employees', EmployeeController::class)
        ->only(['update'])->middleware('permission:employee.update');

    Route::apiResource('employees', EmployeeController::class)
        ->only(['destroy'])->middleware('permission:employee.delete');

    Route::get('employees-trashed', [EmployeeController::class, 'trashed'])
        ->middleware('permission:employee.delete');

    Route::post('employees/{id}/restore', [EmployeeController::class, 'restore'])
        ->middleware('permission:employee.delete');

    // =========================
    // TRANSACTION
    // =========================

    Route::apiResource('attendances', AttendanceController::class)
        ->only(['index', 'show'])->middleware('permission:attendance.view');

    Route::apiResource('attendances', AttendanceController::class)
        ->only(['store'])->middleware('permission:attendance.create');

    Route::apiResource('attendances', AttendanceController::class)
        ->only(['update'])->middleware('permission:attendance.update');

    Route::apiResource('attendances', AttendanceController::class)
        ->only(['destroy'])->middleware('permission:attendance.delete');

    Route::apiResource('leaves', LeaveController::class)
        ->only(['index', 'show'])->middleware('permission:leave.view');

    Route::apiResource('leaves', LeaveController::class)
        ->only(['store'])->middleware('permission:leave.create');

    Route::apiResource('leaves', LeaveController::class)
        ->only(['update'])->middleware('permission:leave.update');

    Route::apiResource('leaves', LeaveController::class)
        ->only(['destroy'])->middleware('permission:leave.delete');

    Route::post('leaves/{leave}/approve', [LeaveController::class, 'approve'])
        ->middleware('permission:leave.approve');

    Route::post('leaves/{leave}/reject', [LeaveController::class, 'reject'])
        ->middleware('permission:leave.reject');

    Route::post('leaves/{leave}/cancel', [LeaveController::class, 'cancel'])
        ->middleware('permission:leave.cancel');

    Route::apiResource('payslips', PayslipController::class)
        ->only(['index', 'show'])->middleware('permission:payslip.view');

    Route::apiResource('payslips', PayslipController::class)
        ->only(['store'])->middleware('permission:payslip.create');

    Route::apiResource('payslips', PayslipController::class)
        ->only(['update'])->middleware('permission:payslip.update');

    Route::apiResource('payslips', PayslipController::class)
        ->only(['destroy'])->middleware('permission:payslip.delete');

    // Sengaja dashboard.view (bukan payslip.view) - endpoint ini rekap
    // AGREGAT semua karyawan dalam 1 periode, admin-level only.
    Route::get('payslips-summary', [PayslipController::class, 'summary'])
        ->middleware('permission:dashboard.view');

    Route::get('payslips/{payslip}/pdf', [PayslipController::class, 'pdf'])
        ->middleware('permission:payslip.view');

    Route::post('payroll/generate-bulk', [PayslipController::class, 'generateBulk'])
        ->middleware('permission:payroll.generate-bulk');

    Route::post('payroll/publish-bulk', [PayslipController::class, 'publishBulk'])
        ->middleware('permission:payroll.publish-bulk');

    Route::post('payslips/{payslip}/publish', [PayslipController::class, 'publish'])
        ->middleware('permission:payslip.publish');

    Route::post('payslips/{payslip}/unpublish', [PayslipController::class, 'unpublish'])
        ->middleware('permission:payslip.unpublish');

    // =========================
    // COMPANY SETTINGS (singleton)
    // =========================
    Route::get('company-settings', [CompanySettingController::class, 'index'])
        ->middleware('permission:company-setting.view');

    Route::put('company-settings', [CompanySettingController::class, 'update'])
        ->middleware('permission:company-setting.update');

    // =========================
    // DASHBOARD
    // =========================
    Route::get('dashboard/summary', [DashboardController::class, 'summary'])
        ->middleware('permission:dashboard.view');

    Route::get('dashboard/attendance-trend', [DashboardController::class, 'attendanceTrend'])
        ->middleware('permission:dashboard.view');

    // =========================
    // NOTIFICATION
    // =========================
    Route::get('notifications', [NotificationController::class, 'index'])
        ->middleware('permission:notification.view');

    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])
        ->middleware('permission:notification.view');

    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])
        ->middleware('permission:notification.view');

    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])
        ->middleware('permission:notification.view');

    Route::delete('notifications/{id}', [NotificationController::class, 'destroy'])
        ->middleware('permission:notification.delete');

    // =========================
    // STORE (INVENTARIS)
    // =========================
    Route::apiResource('store-items', StoreItemController::class)
        ->only(['index', 'show'])->middleware('permission:store-item.view');

    Route::apiResource('store-items', StoreItemController::class)
        ->only(['store'])->middleware('permission:store-item.create');

    Route::apiResource('store-items', StoreItemController::class)
        ->only(['update'])->middleware('permission:store-item.update');

    Route::apiResource('store-items', StoreItemController::class)
        ->only(['destroy'])->middleware('permission:store-item.delete');

    Route::apiResource('store-transactions', StoreTransactionController::class)
        ->only(['index', 'show'])->middleware('permission:store-transaction.view');

    Route::apiResource('store-transactions', StoreTransactionController::class)
        ->only(['store'])->middleware('permission:store-transaction.create');

    Route::apiResource('store-transactions', StoreTransactionController::class)
        ->only(['destroy'])->middleware('permission:store-transaction.delete');

    // =========================
    // RBAC (Permission)
    // =========================
    Route::get('permissions', [PermissionController::class, 'index'])
        ->middleware('permission:role.view');

    Route::get('roles/{role}/permissions', [RolePermissionController::class, 'show'])
        ->middleware('permission:role.view');

    Route::put('roles/{role}/permissions', [RolePermissionController::class, 'update'])
        ->middleware('permission:role.update');

    // =========================
    // ATTENDANCE LOCATION POLICY
    // =========================
    Route::get('attendance-location-policies', [AttendanceLocationPolicyController::class, 'index'])
        ->middleware('permission:attendance-location-policy.view');

    Route::get('positions/{position}/attendance-location-policy', [AttendanceLocationPolicyController::class, 'show'])
        ->middleware('permission:attendance-location-policy.view');

    Route::put('positions/{position}/attendance-location-policy', [AttendanceLocationPolicyController::class, 'update'])
        ->middleware('permission:attendance-location-policy.update');

    Route::delete('positions/{position}/attendance-location-policy', [AttendanceLocationPolicyController::class, 'destroy'])
        ->middleware('permission:attendance-location-policy.update');

    Route::get('employees/{employee}/attendance-location-override', [EmployeeAttendanceLocationOverrideController::class, 'show'])
        ->middleware('permission:attendance-location-policy.view');

    Route::put('employees/{employee}/attendance-location-override', [EmployeeAttendanceLocationOverrideController::class, 'update'])
        ->middleware('permission:attendance-location-policy.update');

    Route::delete('employees/{employee}/attendance-location-override', [EmployeeAttendanceLocationOverrideController::class, 'destroy'])
        ->middleware('permission:attendance-location-policy.update');

    Route::get('office-locations/{officeLocation}/supervisors', [OfficeLocationSupervisorController::class, 'index'])
        ->middleware('permission:attendance-location-policy.view');

    Route::put('office-locations/{officeLocation}/supervisors', [OfficeLocationSupervisorController::class, 'update'])
        ->middleware('permission:attendance-location-policy.update');

    // =========================
    // AUDIT LOG (global, semua modul)
    // =========================
    Route::get('audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:audit-log.view');

    Route::get('audit-logs/{id}', [AuditLogController::class, 'show'])
        ->middleware('permission:audit-log.view');

    // =========================
    // PAYROLL PERIOD (Tahap 0 - read only, Tahap 1 nanti manajemen approval penuh)
    //
    // Sengaja pakai permission 'dashboard.view' (bukan 'payslip.view') -
    // endpoint ini nampilin AGREGAT semua payslip dalam 1 periode
    // (termasuk milik orang lain), jadi harus admin-level only.
    // EMPLOYEE punya payslip.view tapi TIDAK punya dashboard.view,
    // sehingga tetap gak bisa intip data gaji semua orang lewat sini.
    // =========================
    Route::get('payroll-periods', [PayrollPeriodController::class, 'index'])
        ->middleware('permission:dashboard.view');

    Route::get('payroll-periods/pending-my-approval', [PayrollPeriodController::class, 'pendingMyApproval'])
        ->middleware('permission:payroll-period.view');

    Route::get('payroll-periods/{id}', [PayrollPeriodController::class, 'show'])
        ->middleware('permission:dashboard.view');

    Route::post('payroll-periods/{id}/submit', [PayrollPeriodController::class, 'submit'])
        ->middleware('permission:payroll-period.submit');

    Route::post('payroll-periods/{id}/approve', [PayrollPeriodController::class, 'approve'])
        ->middleware('permission:payroll-period.approve');

    Route::post('payroll-periods/{id}/reject', [PayrollPeriodController::class, 'reject'])
        ->middleware('permission:payroll-period.reject');

    // =========================
    // APPROVAL WORKFLOW CONFIG (HRD/SUPER_ADMIN only - ini yang atur
    // "aturan main" approval, bukan yang jalanin approval-nya)
    // =========================
    Route::apiResource('approval-workflows', ApprovalWorkflowController::class)
        ->only(['index', 'show'])->middleware('permission:approval-workflow.view');

    Route::apiResource('approval-workflows', ApprovalWorkflowController::class)
        ->only(['store'])->middleware('permission:approval-workflow.create');

    Route::apiResource('approval-workflows', ApprovalWorkflowController::class)
        ->only(['update'])->middleware('permission:approval-workflow.update');

    Route::apiResource('approval-workflows', ApprovalWorkflowController::class)
        ->only(['destroy'])->middleware('permission:approval-workflow.delete');

};

// Route lama TANPA prefix - dipertahankan biar Postman collection lama
// (dan konsumen lain yang udah pernah dibuat) tetap jalan tanpa perlu
// ganti semua URL. Dianggap "deprecated", akan dilepas di masa depan
// setelah semua konsumen resmi pindah ke /api/v1.
Route::middleware('auth:sanctum')->group($apiRoutes);

// Route BARU dengan versioning - pakai ini untuk semua development baru
// (Website Admin, Flutter app) supaya kalau ada breaking change nanti,
// /api/v1 tetap stabil dan kita bikin /api/v2 terpisah tanpa mendadak
// merusak konsumen lama.
Route::prefix('v1')->middleware('auth:sanctum')->group($apiRoutes);