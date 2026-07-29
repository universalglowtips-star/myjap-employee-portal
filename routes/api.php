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

    Route::apiResource('employees', EmployeeController::class);

    // =========================
    // TRANSACTION
    // =========================

    Route::apiResource('attendances', AttendanceController::class);

    Route::apiResource('leaves', LeaveController::class);

    Route::post('leaves/{leave}/approve', [LeaveController::class, 'approve']);

    Route::post('leaves/{leave}/reject', [LeaveController::class, 'reject']);

    Route::post('leaves/{leave}/cancel', [LeaveController::class, 'cancel']);

    Route::apiResource('payslips', PayslipController::class);

    Route::get('payslips-summary', [PayslipController::class, 'summary']);

    Route::get('payslips/{payslip}/pdf', [PayslipController::class, 'pdf']);

    Route::post('payroll/generate-bulk', [PayslipController::class, 'generateBulk']);

    Route::post('payroll/publish-bulk', [PayslipController::class, 'publishBulk']);

    Route::post('payslips/{payslip}/publish', [PayslipController::class, 'publish']);

    Route::post('payslips/{payslip}/unpublish', [PayslipController::class, 'unpublish']);

    // =========================
    // COMPANY SETTINGS (singleton)
    // =========================
    Route::get('company-settings', [CompanySettingController::class, 'index']);

    Route::put('company-settings', [CompanySettingController::class, 'update']);

    // =========================
    // DASHBOARD
    // =========================
    Route::get('dashboard/summary', [DashboardController::class, 'summary']);

    Route::get('dashboard/attendance-trend', [DashboardController::class, 'attendanceTrend']);

    // =========================
    // NOTIFICATION
    // =========================
    Route::get('notifications', [NotificationController::class, 'index']);

    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);

    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead']);

    Route::delete('notifications/{id}', [NotificationController::class, 'destroy']);

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