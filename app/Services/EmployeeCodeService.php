<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\OfficeLocation;
use Carbon\Carbon;

class EmployeeCodeService
{
    /**
     * Create a new class instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Generate Employee Code
     */
    public function generate(int $officeLocationId, string $joinDate): string
    {
        // Ambil data kantor
        $office = OfficeLocation::findOrFail($officeLocationId);

        // Ambil kode kantor
        $officeCode = strtoupper($office->office_code);

        // Ambil tahun dari join date
        $year = Carbon::parse($joinDate)->format('y');

        // Prefix kode
        $prefix = "MJ-{$officeCode}-{$year}";

        // Cari employee terakhir berdasarkan prefix
        $lastEmployee = Employee::where('employee_code', 'like', "{$prefix}%")
            ->latest('id')
            ->first();

        // Tentukan nomor urut berikutnya
        if ($lastEmployee) {

            // Ambil 4 digit terakhir
            $lastNumber = (int) substr($lastEmployee->employee_code, -4);

            // Tambah 1
            $nextNumber = $lastNumber + 1;

        } else {

            // Jika belum ada data
            $nextNumber = 1;

        }

        // Format nomor urut menjadi 4 digit
        $runningNumber = str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        // Hasil akhir
        return "{$prefix}{$runningNumber}";
    }
}