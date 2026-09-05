<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\WorkShift;
use App\Services\AttendanceLocationPolicyService;
use App\Services\AuditLogService;
use App\Traits\ScopesOwnData;
use Carbon\Carbon;

class AttendanceController extends Controller
{
use ScopesOwnData;

/**
 * Query params: employee_id, office_location_id, attendance_status,
 * start_date, end_date, per_page. Row-level scoping: EMPLOYEE cuma
 * lihat absensinya sendiri.
 */
public function index(Request $request)
{
    $query = Attendance::with([
        'employee',
        'officeLocation',
        'workShift'
    ])
    ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->employee_id))
    ->when($request->filled('office_location_id'), fn ($q) => $q->where('office_location_id', $request->office_location_id))
    ->when($request->filled('attendance_status'), fn ($q) => $q->where('attendance_status', $request->attendance_status))
    ->when($request->filled('start_date'), fn ($q) => $q->whereDate('attendance_date', '>=', $request->start_date))
    ->when($request->filled('end_date'), fn ($q) => $q->whereDate('attendance_date', '<=', $request->end_date));

    $this->scopeToOwnDataIfEmployee($query, $request);

    // Urutan attendance_date DESC (BUKAN created_at/->latest()) - Riwayat
    // Absensi (Task 9.5b) butuh "terbaru dulu" berdasar TANGGAL absennya,
    // yang bisa beda dari kapan barisnya dibuat di DB (mis. admin nginput
    // data susulan tanggal lampau setelah data yang lebih baru). created_at
    // dipakai sebagai tie-breaker kedua (beda employee, tanggal sama).
    $query->orderByDesc('attendance_date')->orderByDesc('created_at');

    $attendance = $query->paginate($request->integer('per_page', 15));

    return response()->json([
        'success' => true,
        'message' => 'Data absensi berhasil diambil.',
        'total' => $attendance->total(),
        'data' => $attendance->items(),
        'pagination' => [
            'current_page' => $attendance->currentPage(),
            'per_page' => $attendance->perPage(),
            'last_page' => $attendance->lastPage(),
        ]
    ]);
}

    /**
     * Daftar kantor yang diizinkan buat employee yang login HARI INI,
     * lengkap dengan koordinat+radius - dipakai frontend (Task 9.5)
     * buat resolve lokasi check-in/check-out. Cuma nyambungin ke
     * AttendanceLocationPolicyService::getAllowedOfficeIds() yang
     * SUDAH ADA (priority Employee Override > Position Policy > Home
     * Office), TIDAK menulis ulang logicnya di sini.
     *
     * ?direction=CHECK_IN|CHECK_OUT (Task per-arah) - default CHECK_IN
     * kalau gak dikirim/nilainya gak dikenal. `is_unrestricted` BARU -
     * true kalau aturan yang berlaku buat arah ini persis 'ANYWHERE',
     * dipakai frontend buat mutuskan sembunyikan section GPS sama
     * sekali (bukan cuma nampilin peringatan radius yang gak relevan).
     */
    public function allowedOffices(Request $request)
    {
        $employee = $request->user();

        $direction = $request->query('direction', 'CHECK_IN');
        $direction = in_array($direction, ['CHECK_IN', 'CHECK_OUT'], true) ? $direction : 'CHECK_IN';

        $locationPolicyService = new AttendanceLocationPolicyService();

        $officeIds = $locationPolicyService->getAllowedOfficeIds($employee, $direction);
        $isUnrestricted = $locationPolicyService->isUnrestricted($employee, $direction);

        // null = ALL_BRANCHES ATAU ANYWHERE (kontrak getAllowedOfficeIds()) -
        // ambil semua kantor aktif. Array = daftar id spesifik dari HOME_ONLY/
        // SPECIFIC_BRANCHES/SUPERVISED_BRANCHES, ambil apa adanya.
        $query = \App\Models\OfficeLocation::query();

        if ($officeIds === null) {
            $query->where('is_active', true);
        } else {
            $query->whereIn('id', $officeIds);
        }

        $offices = $query->get(['id', 'office_name', 'latitude', 'longitude', 'radius_meter']);

        return response()->json([
            'success' => true,
            'message' => 'Daftar kantor yang diizinkan berhasil diambil.',
            'data' => $offices,
            'is_unrestricted' => $isUnrestricted,
        ]);
    }

    /**
     * Hitung jarak antara 2 koordinat pakai formula Haversine (meter).
     */
    private function distanceInMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // meter

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Validasi GPS di server - TIDAK PERCAYA is_valid_location dari
     * client. Kalau koordinat check-in dikirim, hitung jaraknya ke
     * office_location, bandingkan sama radius_meter kantor tersebut.
     */
    private function validateLocation(?float $lat, ?float $lon, $officeLocation): bool
    {
        if ($lat === null || $lon === null || !$officeLocation) {
            return false;
        }

        $distance = $this->distanceInMeters(
            (float) $lat,
            (float) $lon,
            (float) $officeLocation->latitude,
            (float) $officeLocation->longitude
        );

        return $distance <= $officeLocation->radius_meter;
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

        'employee_id' => 'nullable|exists:employees,id',

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

        'is_approved' => 'boolean',

        'notes' => 'nullable|string'

    ]);

    // employee_id WAJIB dari user login kalau role EMPLOYEE (self check-in),
    // role administratif tetap bebas isi employee_id manapun (input manual)
    $validated['employee_id'] = $this->resolveEmployeeIdForStore($request, $validated['employee_id'] ?? null);

    if (!$validated['employee_id']) {
        return response()->json([
            'success' => false,
            'message' => 'employee_id wajib diisi.'
        ], 422);
    }

    $employee = Employee::findOrFail($validated['employee_id']);

    $locationPolicyService = new AttendanceLocationPolicyService();

    if (!$locationPolicyService->isOfficeAllowed($employee, $validated['office_location_id'], 'CHECK_IN')) {
        return response()->json([
            'success' => false,
            'message' => 'Karyawan ini tidak diizinkan absen di lokasi kantor tersebut sesuai kebijakan lokasi absensi (Attendance Location Policy).'
        ], 422);
    }

    $shift = isset($validated['work_shift_id'])
        ? WorkShift::find($validated['work_shift_id'])
        : null;

    $metrics = $this->calculateMetrics(
        $shift,
        $validated['attendance_date'],
        $validated['check_in'] ?? null,
        $validated['check_out'] ?? null
    );

    // Validasi GPS di server - is_valid_location TIDAK diterima dari client
    $isValidLocation = $this->validateLocation(
        $validated['check_in_latitude'] ?? null,
        $validated['check_in_longitude'] ?? null,
        \App\Models\OfficeLocation::find($validated['office_location_id'])
    );

    // Block radius (Task per-arah, Bagian B.2) - SEBELUMNYA is_valid_location
    // cuma flag informational, gak pernah nolak request. Sekarang di luar
    // radius BENERAN nolak submit, KECUALI aturan yang berlaku buat arah
    // CHECK_IN employee ini persis 'ANYWHERE' (isUnrestricted) - GPS/foto
    // TETAP direkam apa adanya di kedua kasus (lihat Attendance::create()
    // di bawah, TIDAK ada field yang di-skip), cuma keputusan block/
    // gak-nya yang beda.
    if (!$isValidLocation && !$locationPolicyService->isUnrestricted($employee, 'CHECK_IN')) {
        return response()->json([
            'success' => false,
            'message' => 'Kamu berada di luar radius kantor yang diizinkan. Absen tidak dapat disimpan.'
        ], 422);
    }

    $attendance = Attendance::create($validated + $metrics + [
        'is_valid_location' => $isValidLocation,
        'is_valid_selfie' => false, // baru bisa true lewat review manual HRD (is_approved) - belum ada face recognition
    ]);

    AuditLogService::log(
        $attendance,
        'created',
        null,
        $attendance->only(['employee_id', 'office_location_id', 'attendance_date', 'attendance_status']),
        $request->user()->id,
        'Absensi baru dibuat'
    );

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

public function show(Request $request, string $id)
{
    $attendance = Attendance::with([
        'employee',
        'officeLocation',
        'workShift'
    ])->findOrFail($id);

    $this->ensureOwnDataOrAdmin($request, $attendance->employee_id);

    return response()->json([
        'success' => true,
        'message' => 'Detail absensi berhasil diambil.',
        'data' => $attendance
    ]);
}

public function update(Request $request, string $id)
{
    $attendance = Attendance::findOrFail($id);

    $this->ensureOwnDataOrAdmin($request, $attendance->employee_id);

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

        'is_approved' => 'boolean',

        'notes' => 'nullable|string'

    ]);

    // Kalau role EMPLOYEE, gak boleh pindahin absensi ke employee_id lain
    if (isset($validated['employee_id'])) {
        $this->resolveEmployeeIdForStore($request, $validated['employee_id']);
    }

    // Kalau employee_id atau office_location_id ikut diubah, cek ulang
    // Attendance Location Policy-nya - arah CHECK_IN (perubahan
    // office_location_id eksplisit dianggap koreksi kantor "hari itu",
    // arah yang sama dipakai pas absen masuk; alur Absen Pulang NORMAL
    // gak pernah kirim office_location_id sama sekali, ditangani blok
    // terpisah di bawah yang selalu reuse kantor dari baris yang sama).
    $employeeId = $validated['employee_id'] ?? $attendance->employee_id;
    $officeLocationId = $validated['office_location_id'] ?? $attendance->office_location_id;

    $locationPolicyService = new AttendanceLocationPolicyService();

    if (isset($validated['employee_id']) || isset($validated['office_location_id'])) {

        $employee = Employee::findOrFail($employeeId);

        if (!$locationPolicyService->isOfficeAllowed($employee, $officeLocationId, 'CHECK_IN')) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan ini tidak diizinkan absen di lokasi kantor tersebut sesuai kebijakan lokasi absensi (Attendance Location Policy).'
            ], 422);
        }
    }

    // Absen Pulang (Task per-arah, Bagian B.3): kantor SELALU direuse
    // dari office_location_id baris yang SAMA (attendance->office_location_id
    // yang sudah divalidasi pas check-in) - karyawan TIDAK PERNAH diminta
    // pilih ulang kantor pas check-out. Blok ini HANYA jalan kalau request
    // beneran ngirim koordinat check-out (aksi check-out asli, bukan
    // sekadar edit field lain kayak notes/attendance_status).
    if (array_key_exists('check_out_latitude', $validated) || array_key_exists('check_out_longitude', $validated)) {

        $checkOutEmployee = Employee::findOrFail($employeeId);
        $checkOutOfficeId = $attendance->office_location_id;
        $checkOutOffice = \App\Models\OfficeLocation::find($checkOutOfficeId);

        if (!$locationPolicyService->isOfficeAllowed($checkOutEmployee, $checkOutOfficeId, 'CHECK_OUT')) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan ini tidak diizinkan absen di lokasi kantor tersebut sesuai kebijakan lokasi absensi (Attendance Location Policy).'
            ], 422);
        }

        $isCheckOutValidLocation = $this->validateLocation(
            $validated['check_out_latitude'] ?? null,
            $validated['check_out_longitude'] ?? null,
            $checkOutOffice
        );

        if (!$isCheckOutValidLocation && !$locationPolicyService->isUnrestricted($checkOutEmployee, 'CHECK_OUT')) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu berada di luar radius kantor yang diizinkan. Absen tidak dapat disimpan.'
            ], 422);
        }
    }

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

    // Kalau koordinat check-in ikut diupdate, hitung ulang validasi lokasi
    $extra = [];
    if (array_key_exists('check_in_latitude', $validated) || array_key_exists('check_in_longitude', $validated)) {
        $lat = $validated['check_in_latitude'] ?? $attendance->check_in_latitude;
        $lon = $validated['check_in_longitude'] ?? $attendance->check_in_longitude;
        $extra['is_valid_location'] = $this->validateLocation($lat, $lon, \App\Models\OfficeLocation::find($officeLocationId));
    }

    $oldValues = $attendance->only(['attendance_status', 'check_in', 'check_out', 'office_location_id']);

    $attendance->update($validated + $metrics + $extra);

    AuditLogService::log(
        $attendance,
        'updated',
        $oldValues,
        $attendance->fresh()->only(['attendance_status', 'check_in', 'check_out', 'office_location_id']),
        $request->user()->id,
        'Update absensi'
    );

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

public function destroy(Request $request, string $id)
{
    $attendance = Attendance::findOrFail($id);

    $this->ensureOwnDataOrAdmin($request, $attendance->employee_id);

    $oldValues = $attendance->only(['employee_id', 'attendance_date', 'attendance_status']);

    $attendance->delete();

    AuditLogService::log(
        $attendance,
        'deleted',
        $oldValues,
        null,
        $request->user()->id,
        'Hapus absensi'
    );

    return response()->json([
        'success' => true,
        'message' => 'Data absensi berhasil dihapus.'
    ]);
}

}
