<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployeeRequest extends FormRequest
{
    /**
     * Apakah user boleh mengakses request ini
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validasi data - semua "sometimes" supaya HRD bisa update
     * sebagian field saja (misal cuma nomor HP), tidak perlu
     * mengirim ulang seluruh data karyawan.
     */
    public function rules(): array
    {
        $employeeId = $this->route('employee');

        return [

            'department_id' => 'sometimes|exists:departments,id',

            'position_id' => 'sometimes|exists:positions,id',

            'work_shift_id' => 'sometimes|exists:work_shifts,id',

            'office_location_id' => 'sometimes|exists:office_locations,id',

            'role_id' => 'sometimes|exists:roles,id',

            'full_name' => 'sometimes|string|max:150',

            'email' => 'sometimes|email|unique:employees,email,' . $employeeId,

            'phone' => 'sometimes|string|max:20',

            'password' => 'nullable|string|min:8',

            'birth_date' => 'sometimes|date',

            'gender' => 'sometimes|in:L,P',

            'address' => 'sometimes|string',

            'join_date' => 'sometimes|date',

            'basic_salary' => 'sometimes|numeric|min:0',

            'photo' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',

            'is_active' => 'sometimes|boolean',

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
