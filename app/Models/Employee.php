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

class Employee extends Authenticatable
{
    use HasApiTokens, Notifiable, SoftDeletes;

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
    protected $hidden = [
    'password',
    'remember_token',
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

}