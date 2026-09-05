<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class EmployeeAttendanceLocationOverride extends Model
{
    protected $table = 'employee_attendance_location_overrides';

    protected $fillable = [

        'employee_id',

        'scope_type_check_in',

        'scope_type_check_out',

        'effective_start_date',

        'effective_end_date',

        'reason',

        'created_by',

    ];

    protected function casts(): array
    {
        return [

            'effective_start_date' => 'date:Y-m-d',

            'effective_end_date' => 'date:Y-m-d',

        ];
    }

    /**
     * Cek apakah override ini masih berlaku hari ini. Kalau
     * effective_start_date/end_date null, berarti berlaku permanen
     * (tanpa batas). Kalau sudah lewat effective_end_date, override
     * dianggap kadaluarsa dan sistem otomatis fallback ke Position
     * Policy (TANPA perlu dihapus manual dari database).
     */
    public function isCurrentlyActive(): bool
    {
        $today = now()->toDateString();

        if ($this->effective_start_date && $today < $this->effective_start_date->toDateString()) {
            return false;
        }

        if ($this->effective_end_date && $today > $this->effective_end_date->toDateString()) {
            return false;
        }

        return true;
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class)->withTrashed();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'created_by')->withTrashed();
    }

    /**
     * Daftar cabang SPECIFIC_BRANCHES buat KEDUA arah sekaligus (dipakai
     * cuma buat tampilan gabungan/lama) - pemakaian nyata yang butuh
     * bedain arah HARUS pakai officesCheckIn()/officesCheckOut() di bawah.
     */
    public function offices(): BelongsToMany
    {
        return $this->belongsToMany(
            OfficeLocation::class,
            'employee_attendance_location_override_offices',
            'employee_attendance_location_override_id',
            'office_location_id'
        )->withTrashed();
    }

    /**
     * Daftar cabang SPECIFIC_BRANCHES khusus arah CHECK_IN - pivot
     * sekarang punya kolom `direction` (Task per-arah), bisa beda dari
     * officesCheckOut(). withPivotValue() (BUKAN wherePivot() biasa) -
     * dicek langsung ke source Laravel (InteractsWithPivotTable.php):
     * withPivotValue() otomatis (a) nge-filter query pas dibaca DAN
     * (b) nge-isi kolom `direction` otomatis pas attach()/sync() insert
     * baris baru, plus (c) newPivotQuery() (dipakai detach() di dalam
     * sync()) ikut ke-scope juga - wherePivot() polos CUMA (a), gak akan
     * ngisi `direction` sendiri pas sync() nyoba insert baris baru
     * (bakal error kolom NOT NULL gak keisi).
     */
    public function officesCheckIn(): BelongsToMany
    {
        return $this->offices()->withPivotValue('direction', 'CHECK_IN');
    }

    /** Daftar cabang SPECIFIC_BRANCHES khusus arah CHECK_OUT. */
    public function officesCheckOut(): BelongsToMany
    {
        return $this->offices()->withPivotValue('direction', 'CHECK_OUT');
    }
}
