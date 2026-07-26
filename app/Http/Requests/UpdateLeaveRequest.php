<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLeaveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [

            'leave_type' => 'sometimes|in:Annual Leave,Sick Leave,Permission,Maternity Leave,Unpaid Leave,Business Trip',

            'start_date' => 'sometimes|date',

            'end_date' => 'sometimes|date|after_or_equal:start_date',

            'reason' => 'sometimes|string|max:1000',

            'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048',

        ];
    }
}