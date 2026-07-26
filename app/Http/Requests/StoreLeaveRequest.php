<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeaveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [

            'employee_id' => 'required|exists:employees,id',

            'leave_type' => 'required|in:Annual Leave,Sick Leave,Permission,Maternity Leave,Unpaid Leave,Business Trip',

            'start_date' => 'required|date',

            'end_date' => 'required|date|after_or_equal:start_date',

            'reason' => 'required|string|max:1000',

            'attachment' => 'nullable|string|max:255',

        ];
    }
}