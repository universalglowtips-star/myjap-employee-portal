<?php

namespace App\Services;

use App\Models\Employee;
use Closure;

class AttendanceLocationPolicyService
{
    /**
     * Cek apakah employee boleh absen di office tertentu, UNTUK ARAH
     * TERTENTU (CHECK_IN/CHECK_OUT - Task per-arah). scope_type sekarang
     * dipecah per arah cuma di level Employee Override - Position Policy
     * & Home Office default TETAP 1 aturan buat kedua arah (di luar
     * scope task ini, table attendance_location_policies gak disentuh).
     * Priority: Employee Override > Position Policy > Home Office (default).
     */
    public function isOfficeAllowed(Employee $employee, int $officeLocationId, string $direction): bool
    {
        // 1. Employee Override - prioritas paling tinggi, TAPI cuma
        // kalau masih dalam rentang effective_start_date/end_date-nya.
        // Kalau sudah expired, fallback ke Position Policy di bawah.
        $override = $employee->attendanceLocationOverride;

        if ($override && $override->isCurrentlyActive()) {
            return $this->checkScope(
                $employee,
                $this->scopeTypeForDirection($override, $direction),
                fn () => $this->officesForDirection($override, $direction)->pluck('office_locations.id')->toArray(),
                $officeLocationId
            );
        }

        // 2. Position Policy
        $policy = $employee->position?->attendanceLocationPolicy;

        if ($policy) {
            return $this->checkScope(
                $employee,
                $policy->scope_type,
                fn () => $policy->offices()->pluck('office_locations.id')->toArray(),
                $officeLocationId
            );
        }

        // 3. Default - Home Office aja
        return $officeLocationId === $employee->office_location_id;
    }

    /**
     * Evaluasi satu scope_type terhadap office yang mau dipakai absen.
     * $specificOfficesResolver dipanggil malas (lazy) - cuma query DB
     * kalau scope-nya beneran SPECIFIC_BRANCHES, biar efisien.
     *
     * 'ANYWHERE' (Task per-arah) - employee ini dikecualikan TOTAL dari
     * pengecekan kantor/radius buat arah ini, cuma bisa muncul dari
     * Employee Override (enum ANYWHERE cuma ada di kolom
     * scope_type_check_in/out, TIDAK ditambahkan ke enum scope_type
     * Position Policy - di luar scope task ini).
     */
    private function checkScope(Employee $employee, string $scopeType, Closure $specificOfficesResolver, int $officeLocationId): bool
    {
        return match ($scopeType) {

            'ALL_BRANCHES' => true,

            'ANYWHERE' => true,

            'HOME_ONLY' => $officeLocationId === $employee->office_location_id,

            'SPECIFIC_BRANCHES' => in_array($officeLocationId, $specificOfficesResolver(), true),

            'SUPERVISED_BRANCHES' => $employee->supervisedOffices()
                ->where('office_locations.id', $officeLocationId)
                ->exists(),

            default => false,
        };
    }

    /**
     * Apakah aturan yang BERLAKU untuk employee ini, di arah ini,
     * persisnya 'ANYWHERE' - dipakai controller buat mutuskan apa
     * validasi RADIUS GPS (bukan validasi office-membership di atas)
     * mau di-skip atau tetap ditegakkan. HANYA Employee Override yang
     * bisa punya nilai ANYWHERE (Position Policy & Home Office default
     * gak punya konsep ini sama sekali), jadi kalau override gak aktif,
     * hasilnya SELALU false (radius tetap ditegakkan).
     */
    public function isUnrestricted(Employee $employee, string $direction): bool
    {
        $override = $employee->attendanceLocationOverride;

        if ($override && $override->isCurrentlyActive()) {
            return $this->scopeTypeForDirection($override, $direction) === 'ANYWHERE';
        }

        return false;
    }

    /**
     * Daftar office_location_id yang diizinkan buat employee ini, UNTUK
     * ARAH TERTENTU - dipakai buat nampilin pilihan kantor di dropdown
     * Flutter/Web, bukan buat validasi (validasi pakai isOfficeAllowed).
     * Return null artinya "semua kantor aktif diizinkan" (ALL_BRANCHES
     * ATAU ANYWHERE - keduanya sama-sama gak membatasi daftar kantor,
     * bedanya ANYWHERE juga mematikan validasi radius, ANYWHERE TIDAK
     * berarti daftar kantornya kosong/gak perlu pilih kantor sama sekali,
     * office_location_id tetap wajib diisi salah satu kantor yang ada).
     */
    public function getAllowedOfficeIds(Employee $employee, string $direction): ?array
    {
        $override = $employee->attendanceLocationOverride;

        if ($override && $override->isCurrentlyActive()) {
            return $this->resolveOfficeIds(
                $employee,
                $this->scopeTypeForDirection($override, $direction),
                fn () => $this->officesForDirection($override, $direction)->pluck('office_locations.id')->toArray()
            );
        }

        $policy = $employee->position?->attendanceLocationPolicy;

        if ($policy) {
            return $this->resolveOfficeIds(
                $employee,
                $policy->scope_type,
                fn () => $policy->offices()->pluck('office_locations.id')->toArray()
            );
        }

        return [$employee->office_location_id];
    }

    private function resolveOfficeIds(Employee $employee, string $scopeType, Closure $specificOfficesResolver): ?array
    {
        return match ($scopeType) {
            'ALL_BRANCHES' => null,
            'ANYWHERE' => null,
            'HOME_ONLY' => [$employee->office_location_id],
            'SPECIFIC_BRANCHES' => $specificOfficesResolver(),
            'SUPERVISED_BRANCHES' => $employee->supervisedOffices()->pluck('office_locations.id')->toArray(),
            default => [$employee->office_location_id],
        };
    }

    /** @param \App\Models\EmployeeAttendanceLocationOverride $override */
    private function scopeTypeForDirection($override, string $direction): string
    {
        return $direction === 'CHECK_OUT' ? $override->scope_type_check_out : $override->scope_type_check_in;
    }

    /** @param \App\Models\EmployeeAttendanceLocationOverride $override */
    private function officesForDirection($override, string $direction)
    {
        return $direction === 'CHECK_OUT' ? $override->officesCheckOut() : $override->officesCheckIn();
    }
}
