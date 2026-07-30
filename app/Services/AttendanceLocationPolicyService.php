<?php

namespace App\Services;

use App\Models\Employee;
use Closure;

class AttendanceLocationPolicyService
{
    /**
     * Cek apakah employee boleh absen di office tertentu.
     * Priority: Employee Override > Position Policy > Home Office (default).
     */
    public function isOfficeAllowed(Employee $employee, int $officeLocationId): bool
    {
        // 1. Employee Override - prioritas paling tinggi, TAPI cuma
        // kalau masih dalam rentang effective_start_date/end_date-nya.
        // Kalau sudah expired, fallback ke Position Policy di bawah.
        $override = $employee->attendanceLocationOverride;

        if ($override && $override->isCurrentlyActive()) {
            return $this->checkScope(
                $employee,
                $override->scope_type,
                fn () => $override->offices()->pluck('office_locations.id')->toArray(),
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
     */
    private function checkScope(Employee $employee, string $scopeType, Closure $specificOfficesResolver, int $officeLocationId): bool
    {
        return match ($scopeType) {

            'ALL_BRANCHES' => true,

            'HOME_ONLY' => $officeLocationId === $employee->office_location_id,

            'SPECIFIC_BRANCHES' => in_array($officeLocationId, $specificOfficesResolver(), true),

            'SUPERVISED_BRANCHES' => $employee->supervisedOffices()
                ->where('office_locations.id', $officeLocationId)
                ->exists(),

            default => false,
        };
    }

    /**
     * Daftar office_location_id yang diizinkan buat employee ini -
     * dipakai buat nampilin pilihan kantor di dropdown Flutter/Web,
     * bukan buat validasi (validasi pakai isOfficeAllowed).
     * Return null artinya "semua kantor aktif diizinkan" (ALL_BRANCHES).
     */
    public function getAllowedOfficeIds(Employee $employee): ?array
    {
        $override = $employee->attendanceLocationOverride;

        if ($override && $override->isCurrentlyActive()) {
            return $this->resolveOfficeIds(
                $employee,
                $override->scope_type,
                fn () => $override->offices()->pluck('office_locations.id')->toArray()
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
            'HOME_ONLY' => [$employee->office_location_id],
            'SPECIFIC_BRANCHES' => $specificOfficesResolver(),
            'SUPERVISED_BRANCHES' => $employee->supervisedOffices()->pluck('office_locations.id')->toArray(),
            default => [$employee->office_location_id],
        };
    }
}
