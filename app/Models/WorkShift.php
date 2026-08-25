<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkShift extends Model
{
    use SoftDeletes;

    protected $fillable = [

        'shift_code',

        'shift_name',

        'check_in_time',

        'check_out_time',

        'break_start',

        'break_end',

        'late_tolerance',

        'is_active'

    ];

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }
}