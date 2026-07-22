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

            'employee_id' => 'sometimes|exists:employees,id',

            'leave_type' => 'sometimes|in:Annual Leave,Sick,Permission,Maternity,Unpaid Leave,Business Trip',

            'start_date' => 'sometimes|date',

            'end_date' => 'sometimes|date|after_or_equal:start_date',

            'reason' => 'sometimes|string|max:1000',

            'attachment' => 'nullable|string|max:255',

            'status' => 'sometimes|in:Pending,Approved,Rejected',

            'approved_by' => 'required_if:status,Approved|nullable|exists:employees,id',

            'approved_at' => 'nullable|date',

            'approval_notes' => 'nullable|string|max:1000',

        ];
    }
}