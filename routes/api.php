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

});