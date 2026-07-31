<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

trait ScopesOwnData
{
    /**
     * Batasi query cuma ke data milik sendiri kalau role-nya EMPLOYEE.
     * Role lain (DIRECTOR/MANAGER/HRD/SUPER_ADMIN) tetap lihat semua,
     * karena mereka butuh visibility ke tim/perusahaan buat kerjaannya.
     */
    protected function scopeToOwnDataIfEmployee(Builder $query, Request $request, string $employeeColumn = 'employee_id'): Builder
    {
        $user = $request->user();

        if ($user->role && $user->role->role_code === 'EMPLOYEE') {
            $query->where($employeeColumn, $user->id);
        }

        return $query;
    }

    /**
     * Cek akses ke satu record spesifik - kalau EMPLOYEE dan bukan
     * miliknya sendiri, tolak 403. Dipakai di show()/update()/destroy().
     */
    protected function ensureOwnDataOrAdmin(Request $request, int $ownerEmployeeId): void
    {
        $user = $request->user();

        if ($user->role && $user->role->role_code === 'EMPLOYEE' && $user->id !== $ownerEmployeeId) {
            throw new HttpException(403, 'Kamu cuma bisa akses data milik sendiri.');
        }
    }

    /**
     * Batasi query cuma ke status Published kalau role-nya EMPLOYEE.
     * Dipakai khusus buat Payslip - Draft/Submitted/Pending Approval
     * gak boleh kelihatan karyawan biasa, cuma yang udah final.
     */
    protected function restrictToPublishedIfEmployee(Builder $query, Request $request, string $statusColumn = 'status'): Builder
    {
        $user = $request->user();

        if ($user->role && $user->role->role_code === 'EMPLOYEE') {
            $query->where($statusColumn, 'Published');
        }

        return $query;
    }

    /**
     * Cek 1 record spesifik - kalau EMPLOYEE dan statusnya belum
     * Published, tolak 403. Dipakai di show()/pdf() Payslip.
     */
    protected function ensurePublishedOrAdmin(Request $request, string $status): void
    {
        $user = $request->user();

        if ($user->role && $user->role->role_code === 'EMPLOYEE' && $status !== 'Published') {
            throw new HttpException(403, 'Slip gaji ini belum dipublish, belum bisa dilihat.');
        }
    }

    /**
     * Kalau role EMPLOYEE, employee_id WAJIB dirinya sendiri - gak boleh
     * ngirim employee_id orang lain di body (cegah "ngaku-ngaku" jadi
     * orang lain). Role administratif (HRD/Manager/dst) tetap bebas
     * input employee_id manapun (buat input manual/koreksi data).
     */
    protected function resolveEmployeeIdForStore(Request $request, ?int $requestedEmployeeId): int
    {
        $user = $request->user();

        if ($user->role && $user->role->role_code === 'EMPLOYEE') {

            if ($requestedEmployeeId !== null && $requestedEmployeeId !== $user->id) {
                throw new HttpException(422, 'Kamu cuma bisa membuat data atas nama dirimu sendiri, tidak bisa atas nama karyawan lain.');
            }

            return $user->id;
        }

        // Role administratif - employee_id wajib tetap diisi di body
        return $requestedEmployeeId;
    }
}
