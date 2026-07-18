<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    /**
     * Apakah user boleh mengakses request ini
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validasi data
     */
    public function rules(): array
    {
        return [

            'department_id' => 'required|exists:departments,id',

            'position_id' => 'required|exists:positions,id',

            'work_shift_id' => 'required|exists:work_shifts,id',

            'office_location_id' => 'required|exists:office_locations,id',

            'role_id' => 'required|exists:roles,id',

            'full_name' => 'required|string|max:150',

            'email' => 'required|email|unique:employees,email',

            'phone' => 'nullable|string|max:20',

            'password' => 'required|string|min:8',

            'birth_date' => 'nullable|date',

            'gender' => 'required|in:L,P',

            'address' => 'nullable|string',

            'join_date' => 'required|date',

            'basic_salary' => 'required|numeric|min:0',

            'photo' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',

            'is_active' => 'nullable|boolean',

        ];
    }

    /**
     * Nama field agar lebih mudah dibaca
     */
    public function attributes(): array
    {
        return [

            'department_id' => 'Departemen',

            'position_id' => 'Jabatan',

            'work_shift_id' => 'Shift Kerja',

            'office_location_id' => 'Kantor',

            'role_id' => 'Role',

            'full_name' => 'Nama Lengkap',

            'email' => 'Email',

            'phone' => 'Nomor HP',

            'password' => 'Password',

            'birth_date' => 'Tanggal Lahir',

            'gender' => 'Jenis Kelamin',

            'address' => 'Alamat',

            'join_date' => 'Tanggal Bergabung',

            'basic_salary' => 'Gaji Pokok',

            'photo' => 'Foto',

            'is_active' => 'Status',

        ];
    }
}