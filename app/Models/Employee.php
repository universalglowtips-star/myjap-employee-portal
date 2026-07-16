<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Authenticatable
{
    use HasApiTokens, Notifiable;

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

        'join_date',

        'basic_salary',

        'photo',

        'is_active'

    ];
    protected $hidden = [
    'password',
    'remember_token',
    ];
    /*
    |--------------------------------------------------------------------------
    | Relationship
    |--------------------------------------------------------------------------
    */

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function workShift(): BelongsTo
    {
        return $this->belongsTo(WorkShift::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

}