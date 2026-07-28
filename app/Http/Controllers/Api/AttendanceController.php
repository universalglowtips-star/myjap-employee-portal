<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;
use App\Models\WorkShift;
use Carbon\Carbon;

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

    /**
     * Hitung late_minutes, working_hours, dan overtime_hours otomatis
     * berdasarkan check_in/check_out & jadwal shift kerja - tidak lagi
     * dipercaya dari input client, supaya tidak bisa dimanipulasi.
     */
    private function calculateMetrics(?WorkShift $shift, string $attendanceDate, ?string $checkIn, ?string $checkOut): array
    {
        $lateMinutes = 0;
        $workingHours = 0;
        $overtimeHours = 0;

        if ($shift && $checkIn) {

            $shiftCheckIn = Carbon::parse($attendanceDate . ' ' . $shift->check_in_time);
            $toleratedCheckIn = $shiftCheckIn->copy()->addMinutes($shift->late_tolerance ?? 0);
            $actualCheckIn = Carbon::parse($checkIn);

            if ($actualCheckIn->gt($toleratedCheckIn)) {
                $lateMinutes = $actualCheckIn->diffInMinutes($shiftCheckIn, true);
            }
        }

        if ($checkIn && $checkOut) {

            $start = Carbon::parse($checkIn);
            $end = Carbon::parse($checkOut);

            $totalMinutes = max(0, $end->diffInMinutes($start, true));

            if ($shift && $shift->break_start && $shift->break_end) {
                $breakMinutes = Carbon::parse($shift->break_start)
                    ->diffInMinutes(Carbon::parse($shift->break_end), true);

                $totalMinutes = max(0, $totalMinutes - $breakMinutes);
            }

            $workingHours = round($totalMinutes / 60, 2);

            if ($shift) {

                $shiftStart = Carbon::parse($attendanceDate . ' ' . $shift->check_in_time);
                $shiftEnd = Carbon::parse($attendanceDate . ' ' . $shift->check_out_time);

                // Shift malam (jam pulang lebih kecil dari jam masuk) - tambah 1 hari
                if ($shiftEnd->lt($shiftStart)) {
                    $shiftEnd->addDay();
                }

                $standardMinutes = $shiftEnd->diffInMinutes($shiftStart, true);

                if ($shift->break_start && $shift->break_end) {
                    $standardMinutes -= Carbon::parse($shift->break_start)
                        ->diffInMinutes(Carbon::parse($shift->break_end), true);
                }

                $standardHours = round(max(0, $standardMinutes) / 60, 2);

                $overtimeHours = max(0, round($workingHours - $standardHours, 2));
            }
        }

        return [
            'late_minutes' => $lateMinutes,
            'working_hours' => $workingHours,
            'overtime_hours' => $overtimeHours,
        ];
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

        'is_valid_location' => 'boolean',

        'is_valid_selfie' => 'boolean',

        'is_approved' => 'boolean',

        'notes' => 'nullable|string'

    ]);

    $shift = isset($validated['work_shift_id'])
        ? WorkShift::find($validated['work_shift_id'])
        : null;

    $metrics = $this->calculateMetrics(
        $shift,
        $validated['attendance_date'],
        $validated['check_in'] ?? null,
        $validated['check_out'] ?? null
    );

    $attendance = Attendance::create($validated + $metrics);

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

        'is_valid_location' => 'boolean',

        'is_valid_selfie' => 'boolean',

        'is_approved' => 'boolean',

        'notes' => 'nullable|string'

    ]);

    // Gabungkan data lama + baru buat hitung ulang metrics-nya
    $workShiftId = $validated['work_shift_id'] ?? $attendance->work_shift_id;
    $attendanceDate = $validated['attendance_date'] ?? $attendance->attendance_date;
    $checkIn = array_key_exists('check_in', $validated) ? $validated['check_in'] : $attendance->check_in;
    $checkOut = array_key_exists('check_out', $validated) ? $validated['check_out'] : $attendance->check_out;

    $shift = $workShiftId ? WorkShift::find($workShiftId) : null;

    $metrics = $this->calculateMetrics(
        $shift,
        (string) $attendanceDate,
        $checkIn ? (string) $checkIn : null,
        $checkOut ? (string) $checkOut : null
    );

    $attendance->update($validated + $metrics);

    return response()->json([
        'success' => true,
        'message' => 'Data absensi berhasil diperbarui.',
        'data' => $attendance->fresh()->load([
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
