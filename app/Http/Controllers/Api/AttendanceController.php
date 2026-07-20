<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;

class AttendanceController extends Controller
{
public function index()
{
    $attendance = Attendance::with([
        'employee',
        'officeLocation',
        'workShift'
    ])
    ->latest()
    ->get();

    return response()->json([
        'success' => true,
        'message' => 'Data absensi berhasil diambil.',
        'total' => $attendance->count(),
        'data' => $attendance
    ]);
}

public function store(Request $request)
{
    $validated = $request->validate([

        'employee_id' => 'required|exists:employees,id',

        'office_location_id' => 'required|exists:office_locations,id',

        'work_shift_id' => 'nullable|exists:work_shifts,id',

        'attendance_date' => 'required|date',

        'check_in' => 'nullable|date',

        'check_in_latitude' => 'nullable|numeric',

        'check_in_longitude' => 'nullable|numeric',

        'check_in_photo' => 'nullable|string',

        'check_out' => 'nullable|date',

        'check_out_latitude' => 'nullable|numeric',

        'check_out_longitude' => 'nullable|numeric',

        'check_out_photo' => 'nullable|string',

        'device_name' => 'nullable|string',

        'ip_address' => 'nullable|ip',

        'attendance_status' => 'required|in:Present,Late,Leave,Sick,Permission,Absent',

        'late_minutes' => 'nullable|integer',

        'working_hours' => 'nullable|numeric',

        'overtime_hours' => 'nullable|numeric',

        'is_valid_location' => 'boolean',

        'is_valid_selfie' => 'boolean',

        'is_approved' => 'boolean',

        'notes' => 'nullable|string'

    ]);

    $attendance = Attendance::create($validated);

    return response()->json([
        'success' => true,
        'message' => 'Data absensi berhasil ditambahkan.',
        'data' => $attendance->load([
            'employee',
            'officeLocation',
            'workShift'
        ])
    ],201);
}

public function show(string $id)
{
    $attendance = Attendance::with([
        'employee',
        'officeLocation',
        'workShift'
    ])->findOrFail($id);

    return response()->json([
        'success' => true,
        'message' => 'Detail absensi berhasil diambil.',
        'data' => $attendance
    ]);
}

public function update(Request $request, string $id)
{
    $attendance = Attendance::findOrFail($id);

    $validated = $request->validate([

        'employee_id' => 'sometimes|exists:employees,id',

        'office_location_id' => 'sometimes|exists:office_locations,id',

        'work_shift_id' => 'nullable|exists:work_shifts,id',

        'attendance_date' => 'sometimes|date',

        'check_in' => 'nullable|date',

        'check_in_latitude' => 'nullable|numeric',

        'check_in_longitude' => 'nullable|numeric',

        'check_in_photo' => 'nullable|string',

        'check_out' => 'nullable|date',

        'check_out_latitude' => 'nullable|numeric',

        'check_out_longitude' => 'nullable|numeric',

        'check_out_photo' => 'nullable|string',

        'device_name' => 'nullable|string',

        'ip_address' => 'nullable|ip',

        'attendance_status' => 'sometimes|in:Present,Late,Leave,Sick,Permission,Absent',

        'late_minutes' => 'nullable|integer',

        'working_hours' => 'nullable|numeric',

        'overtime_hours' => 'nullable|numeric',

        'is_valid_location' => 'boolean',

        'is_valid_selfie' => 'boolean',

        'is_approved' => 'boolean',

        'notes' => 'nullable|string'

    ]);

    $attendance->update($validated);

    return response()->json([
        'success' => true,
        'message' => 'Data absensi berhasil diperbarui.',
        'data' => $attendance->load([
            'employee',
            'officeLocation',
            'workShift'
        ])
    ]);
}

public function destroy(string $id)
{
    $attendance = Attendance::findOrFail($id);

    $attendance->delete();

    return response()->json([
        'success' => true,
        'message' => 'Data absensi berhasil dihapus.'
    ]);
}

}
