<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use RuntimeException;

class Employee extends Authenticatable
{
    use HasApiTokens, Notifiable, SoftDeletes;

    /**
     * Guard force-delete vs payslip Published. payslips.employee_id
     * cascadeOnDelete() (migration Task 12 lama) - tanpa guard ini,
     * force-delete Employee diam-diam ikut menghapus PERMANEN payslip
     * (termasuk item-nya, cascade lagi dari payslips.id) lewat FK di
     * level database, sama sekali TIDAK lewat forceDeleting() guard
     * milik Payslip/PayslipItem sendiri (guard itu cuma nyantol ke
     * pemanggilan Eloquent forceDelete() langsung, bukan ke DELETE
     * yang dipicu cascade). Payslip Draft TETAP boleh ikut kebuang -
     * cuma yang sudah Published (dokumen finansial final) yang diblokir,
     * sesuai keputusan Bagus. withTrashed() SENGAJA dipakai - payslip
     * Published yang entah-bagaimana sudah soft-deleted (harusnya
     * gak pernah kejadian lewat alur normal, tapi jangan diasumsikan)
     * tetap harus diblokir, bukan cuma yang masih aktif.
     *
     * TIDAK ADA endpoint/UI produksi yang memanggil Employee::forceDelete()
     * sama sekali (dikonfirmasi grep menyeluruh) - selama ini cuma
     * dipakai manual lewat tinker buat bersih-bersih data uji. Guard di
     * event model (bukan cek di controller) tetap dipilih supaya
     * proteksi ini konsisten berlaku dari jalur manapun (tinker,
     * command, atau kalau suatu saat ada endpoint baru), sama pola
     * persis Payslip/PayslipItem/PayrollPeriod.
     */
    protected static function booted(): void
    {
        static::forceDeleting(function (self $employee) {

            if ($employee->payslips()->withTrashed()->where('status', 'Published')->exists()) {
                throw new RuntimeException('Karyawan ini masih memiliki slip gaji yang sudah dipublikasikan dan tidak dapat dihapus permanen.');
            }

            // attendances.employee_id cascadeOnDelete() - pola risiko sama
            // persis Payslip di atas. Attendance TIDAK punya status "final"/
            // "published" kayak Payslip (attendance_status cuma kategori
            // deskriptif Present/Late/dst, is_approved default true buat
            // SEMUA baris - bukan penanda konsekuensial) - jadi beda dari
            // Payslip yang cuma blokir 1 status, di sini blokir kalau ADA
            // baris attendance SAMA SEKALI (keputusan Bagus 2026-09-28:
            // riwayat absensi basis payroll, gak boleh hilang diam-diam).
            if ($employee->attendances()->withTrashed()->exists()) {
                throw new RuntimeException('Karyawan ini masih memiliki riwayat absensi dan tidak dapat dihapus permanen.');
            }

            // leaves.employee_id (pemohon) cascadeOnDelete() - approved_by/
            // cancelled_by SENGAJA TIDAK ikut dicek di sini: keduanya
            // nullOnDelete() (dikonfirmasi migration), jadi force-delete
            // approver/canceller TIDAK memicu cascade ke baris cuti orang
            // lain, gak perlu diblokir dari sisi itu. Kondisi block: status
            // Approved ATAU Cancelled (dikonfirmasi live DB - enum
            // sebenarnya Pending/Approved/Rejected/Cancelled, migration
            // file lama gak nyebut Cancelled sama sekali, cek SHOW COLUMNS
            // kalau ragu). Cancelled SELALU eks-Approved (LeaveController::
            // cancel() nolak kalau status bukan Approved), jadi tetap
            // merepresentasikan cuti yang PERNAH resmi disetujui (quota
            // kepakai, approval_notes, audit log) - Pending/Rejected TIDAK
            // PERNAH efektif, aman ikut kebuang, sama semangat Payslip yang
            // cuma blokir Published (bukan Draft).
            if ($employee->leaves()->withTrashed()->whereIn('status', ['Approved', 'Cancelled'])->exists()) {
                throw new RuntimeException('Karyawan ini masih memiliki riwayat cuti yang pernah disetujui dan tidak dapat dihapus permanen.');
            }

            // notifications.employee_id cascadeOnDelete() - beda struktural
            // dari 3 tabel di atas: tabel ini TIDAK pakai soft-delete sama
            // sekali (App\Models\Notification gak pakai trait SoftDeletes,
            // migration-nya juga gak ada softDeletes()) - baris notifikasi
            // memang sudah disposable secara desain, gak ada status "final"
            // buat dibedakan. Tetap diblokir kalau ADA baris sama sekali
            // (keputusan eksplisit Bagus 2026-09-28: generalisasi ke SEMUA
            // 3 tabel). Method notifications() di bawah SENGAJA override
            // punya trait Notifiable (built-in Laravel, asumsi kolom
            // notifiable_type/notifiable_id yang gak ada di tabel custom
            // ini) - trait punya dikonfirmasi gak pernah dipanggil di
            // manapun sebelumnya, jadi aman ditimpa ke App\Models\Notification.
            if ($employee->notifications()->exists()) {
                throw new RuntimeException('Karyawan ini masih memiliki riwayat notifikasi dan tidak dapat dihapus permanen.');
            }
        });
    }

    protected $fillable = [

        'employee_code',

        'full_name',

        'email',

        'phone',

        'password',

        'gender',

        'birth_date',

        'address',

        'department_id',

        'position_id',

        'role_id',

        'work_shift_id',

        'office_location_id',

        'join_date',

        'basic_salary',

        'photo',

        'is_active'

    ];
    /**
     * two_factor_secret/two_factor_recovery_codes SENGAJA disembunyikan
     * (fitur 2FA) - secret TOTP dan hash recovery code gak pernah boleh
     * nampil di response API manapun, sama alasannya kayak password.
     * two_factor_confirmed_at TIDAK disembunyikan - cuma timestamp
     * status (aktif/belum), frontend butuh baca ini buat nentuin UI.
     */
    protected $hidden = [
    'password',
    'remember_token',
    'two_factor_secret',
    'two_factor_recovery_codes',
    ];

    protected function casts(): array
{
    return [

        'password' => 'hashed',

        'birth_date' => 'date:Y-m-d',

        'join_date' => 'date:Y-m-d',

        'is_active' => 'boolean',

        'basic_salary' => 'decimal:2',

        'created_at' => 'datetime:Y-m-d H:i:s',

        'updated_at' => 'datetime:Y-m-d H:i:s',

        // Fitur 2FA - dienkripsi at-rest (Laravel encrypted cast, APP_KEY).
        // two_factor_recovery_codes isinya array HASH (Hash::make() tiap
        // kode, lihat TwoFactorService) - jadi 2 lapis proteksi (encrypted
        // cast DI LUAR, hash bcrypt DI DALAM tiap kode), sama kayak kenapa
        // password di-hash walau DB-nya sendiri gak dienkripsi kolom-per-kolom.
        'two_factor_secret' => 'encrypted',

        'two_factor_recovery_codes' => 'encrypted:array',

        'two_factor_confirmed_at' => 'datetime:Y-m-d H:i:s',

    ];
}
    /*
    |--------------------------------------------------------------------------
    | Relationship
    |--------------------------------------------------------------------------
    */

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class)->withTrashed();
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class)->withTrashed();
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class)->withTrashed();
    }

    public function workShift(): BelongsTo
    {
        return $this->belongsTo(WorkShift::class)->withTrashed();
    }

    /**
     * Override attendance location individu (kalau ada) - prioritas
     * paling tinggi, mengalahkan policy per Position.
     */
    public function attendanceLocationOverride(): HasOne
    {
        return $this->hasOne(EmployeeAttendanceLocationOverride::class);
    }

    /**
     * Kantor-kantor yang diawasi employee ini (kalau dia supervisor).
     */
    public function supervisedOffices(): BelongsToMany
    {
        return $this->belongsToMany(OfficeLocation::class, 'office_location_supervisors')->withTrashed();
    }

    public function officeLocation(): BelongsTo
    {
        return $this->belongsTo(OfficeLocation::class)->withTrashed();
    }

    /**
     * office_location_id di atas adalah KANTOR ASAL (tempat kerja),
     * BUKAN wewenang. Wewenang approval branch-restricted SELALU
     * lewat tabel ini (employee_office_scopes) - satu employee bisa
     * punya banyak scope (misal Manager Kaltim berwenang di banyak
     * cabang sekaligus, walau kantor asalnya cuma satu).
     */
    public function officeScopes(): HasMany
    {
        return $this->hasMany(EmployeeOfficeScope::class);
    }

    /**
     * Cek wewenang - TANPA fallback ke office_location_id sama sekali,
     * sesuai keputusan desain: kantor asal bukan dasar wewenang.
     */
    public function hasScopeFor(int $officeLocationId): bool
    {
        return $this->officeScopes()->where('office_location_id', $officeLocationId)->exists();
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaves(): HasMany
    {
        return $this->hasMany(Leave::class);
    }

    public function approvedLeaves(): HasMany
    {
        return $this->hasMany(Leave::class, 'approved_by');
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    /**
     * Override method notifications() milik trait Notifiable (Laravel
     * built-in, asumsi tabel polymorphic notifiable_type/notifiable_id) -
     * tabel notifications app ini CUSTOM, employee_id langsung (lihat
     * App\Models\Notification). Trait punya dikonfirmasi gak pernah
     * dipanggil di manapun sebelum ini (dead code), aman ditimpa.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Task 15b - override nominal/tarif komponen gaji individu (misal
     * karena senioritas), TIMPA default dari jabatan (lihat
     * PositionSalaryComponent) kalau ada baris untuk kombinasi komponen
     * yang sama.
     */
    public function salaryComponentOverrides(): HasMany
    {
        return $this->hasMany(EmployeeSalaryComponent::class);
    }

}