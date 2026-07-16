<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attendance extends Model
{
    use SoftDeletes;

    protected $fillable = [

        'employee_id',

        'office_location_id',

        'attendance_date',

        'check_in',

        'check_in_latitude',

        'check_in_longitude',

        'check_in_photo',

        'check_out',

        'check_out_latitude',

        'check_out_longitude',

        'check_out_photo',

        'device_name',

        'ip_address',

        'attendance_status',

        'late_minutes',

        'working_hours',

        'overtime_hours',

        'is_valid_location',

        'is_valid_selfie',

        'is_approved',

        'notes'

    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function officeLocation(): BelongsTo
    {
        return $this->belongsTo(OfficeLocation::class);
    }

}