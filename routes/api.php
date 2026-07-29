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

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Public Route
|
*/

Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Protected Route
|--------------------------------------------------------------------------
|
| Semua endpoint di bawah harus login menggunakan Sanctum
|
*/

Route::middleware('auth:sanctum')->group(function () {

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

    Route::apiResource('departments', DepartmentController::class);

    Route::apiResource('positions', PositionController::class);

    Route::apiResource('roles', RoleController::class);

    Route::apiResource('work-shifts', WorkShiftController::class);

    Route::apiResource('office-locations', OfficeLocationController::class);

    Route::apiResource('employees', EmployeeController::class)
        ->only(['index', 'show'])->middleware('permission:employee.view');

    Route::apiResource('employees', EmployeeController::class)
        ->only(['store'])->middleware('permission:employee.create');

    Route::apiResource('employees', EmployeeController::class)
        ->only(['update'])->middleware('permission:employee.update');

    Route::apiResource('employees', EmployeeController::class)
        ->only(['destroy'])->middleware('permission:employee.delete');

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

    Route::get('payslips-summary', [PayslipController::class, 'summary'])
        ->middleware('permission:payslip.view');

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
    Route::get('company-settings', [CompanySettingController::class, 'index']);

    Route::put('company-settings', [CompanySettingController::class, 'update']);

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
    Route::apiResource('store-items', StoreItemController::class);

    Route::apiResource('store-transactions', StoreTransactionController::class)
        ->only(['index', 'store', 'show', 'destroy']);

    // =========================
    // RBAC (Permission)
    // =========================
    Route::get('permissions', [PermissionController::class, 'index']);

    Route::get('roles/{role}/permissions', [RolePermissionController::class, 'show']);

    Route::put('roles/{role}/permissions', [RolePermissionController::class, 'update']);

});