<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeOfficeScope extends Model
{
    protected $fillable = [
        'employee_id',
        'office_location_id',
        'granted_by',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function officeLocation(): BelongsTo
    {
        return $this->belongsTo(OfficeLocation::class)->withTrashed();
    }

    public function grantedBy(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'granted_by')->withTrashed();
    }
}
