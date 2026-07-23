<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePayslipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
{
    return [

        'employee_id' => 'required|exists:employees,id',

        'month' => 'required|integer|between:1,12',

        'year' => 'required|integer|min:2024',

        'status' => 'nullable|in:Draft,Published',

        'file_pdf' => 'nullable|string|max:255',

        'items' => 'required|array|min:1',

        'items.*.salary_component_id'
            => 'required|exists:salary_components,id',

        'items.*.amount'
            => 'required|numeric',

        'items.*.notes'
            => 'nullable|string|max:255',

    ];

}

}