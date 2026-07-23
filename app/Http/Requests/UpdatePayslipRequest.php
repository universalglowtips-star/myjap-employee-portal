<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePayslipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
{
    return [

        'employee_id' => 'sometimes|exists:employees,id',

        'month' => 'sometimes|integer|between:1,12',

        'year' => 'sometimes|integer|min:2024',

        'status' => 'sometimes|in:Draft,Published',

        'file_pdf' => 'nullable|string|max:255',

        'items' => 'sometimes|array|min:1',

        'items.*.salary_component_id'
            => 'required_with:items|exists:salary_components,id',

        'items.*.amount'
            => 'required_with:items|numeric',

        'items.*.notes'
            => 'nullable|string|max:255',

    ];
}

}