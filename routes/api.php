<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\PositionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\WorkShiftController;

// =========================
// PUBLIC ROUTES
// =========================
Route::post('/login', [AuthController::class, 'login']);

Route::apiResource('employees', EmployeeController::class);

// =========================
// PROTECTED ROUTES
// =========================
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/me', function (Request $request) {
        return $request->user();
    });

    Route::apiResource('departments', DepartmentController::class);

    Route::apiResource('positions', PositionController::class);

    Route::apiResource('roles', RoleController::class);

    Route::apiResource('work-shifts', WorkShiftController::class);

});