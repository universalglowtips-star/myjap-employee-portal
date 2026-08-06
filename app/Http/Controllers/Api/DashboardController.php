<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\Payslip;
use App\Models\SystemWarning;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Ringkasan dashboard hari ini: total karyawan aktif, breakdown
     * kehadiran hari ini, jumlah cuti pending, dan ringkasan payroll
     * bulan berjalan. Semua murni agregasi dari tabel yang sudah ada,
     * tidak butuh tabel baru.
     */
    public function summary(Request $request): JsonResponse
    {
        $today = $request->filled('date')
            ? Carbon::parse($request->date)->toDateString()
            : now()->toDateString();

        $totalActiveEmployees = Employee::where('is_active', true)->count();

        $todayAttendances = Attendance::where('attendance_date', $today)->get();

        $present = $todayAttendances->whereIn('attendance_status', ['Present'])->count();
        $late = $todayAttendances->where('attendance_status', 'Late')->count();
        $onLeave = $todayAttendances->whereIn('attendance_status', ['Leave', 'Sick', 'Permission'])->count();
        $absent = $todayAttendances->where('attendance_status', 'Absent')->count();
        $notCheckedIn = max(0, $totalActiveEmployees - $todayAttendances->count());

        $pendingLeaves = Leave::where('status', 'Pending')->count();

        $currentMonth = now()->month;
        $currentYear = now()->year;

        $payslipsThisMonth = Payslip::where('month', $currentMonth)
            ->where('year', $currentYear)
            ->get();

        $unresolvedWarnings = SystemWarning::where('is_resolved', false)->count();

        return response()->json([
            'success' => true,
            'message' => 'Ringkasan dashboard berhasil diambil.',
            'data' => [
                'date' => $today,
                'employees' => [
                    'total_active' => $totalActiveEmployees,
                ],
                'attendance_today' => [
                    'present' => $present,
                    'late' => $late,
                    'on_leave' => $onLeave,
                    'absent' => $absent,
                    'not_checked_in' => $notCheckedIn,
                ],
                'leave' => [
                    'pending_count' => $pendingLeaves,
                ],
                'payroll_this_month' => [
                    'month' => $currentMonth,
                    'year' => $currentYear,
                    'total_payslips' => $payslipsThisMonth->count(),
                    'draft_count' => $payslipsThisMonth->where('status', 'Draft')->count(),
                    'published_count' => $payslipsThisMonth->where('status', 'Published')->count(),
                    'total_net_salary' => $payslipsThisMonth->sum('net_salary'),
                ],
                // System warning operasional (misal: notifikasi approval
                // gak ada penerima) - HRD/SUPER_ADMIN perlu tau ada yang
                // butuh perhatian, tanpa harus buka endpoint terpisah dulu.
                'system_warnings' => [
                    'unresolved_count' => $unresolvedWarnings,
                ],
            ],
        ]);
    }

    /**
     * Tren kehadiran N hari terakhir (default 7 hari), buat data chart.
     */
    public function attendanceTrend(Request $request): JsonResponse
    {
        $days = $request->integer('days', 7);
        $days = min(max($days, 1), 90); // batasi 1-90 hari biar query gak berat

        $startDate = now()->subDays($days - 1)->toDateString();
        $endDate = now()->toDateString();

        $attendances = Attendance::whereBetween('attendance_date', [$startDate, $endDate])->get();

        $trend = [];

        for ($i = 0; $i < $days; $i++) {

            $date = now()->subDays($days - 1 - $i)->toDateString();

            $dayData = $attendances->where('attendance_date', $date);

            $trend[] = [
                'date' => $date,
                'present' => $dayData->where('attendance_status', 'Present')->count(),
                'late' => $dayData->whereIn('attendance_status', ['Late'])->count(),
                'on_leave' => $dayData->whereIn('attendance_status', ['Leave', 'Sick', 'Permission'])->count(),
                'absent' => $dayData->where('attendance_status', 'Absent')->count(),
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'Tren kehadiran berhasil diambil.',
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'days' => $days,
            ],
            'data' => $trend,
        ]);
    }
}
