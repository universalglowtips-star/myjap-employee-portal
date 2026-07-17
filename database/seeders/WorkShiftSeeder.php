<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\WorkShift;

class WorkShiftSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        WorkShift::insert([

            [
                'shift_code' => 'SHIFT-1',
                'shift_name' => 'Shift Pagi',
                'check_in_time' => '08:00:00',
                'check_out_time' => '17:00:00',
                'break_start' => '12:00:00',
                'break_end' => '13:00:00',
                'late_tolerance' => 15,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'shift_code' => 'SHIFT-2',
                'shift_name' => 'Shift Siang',
                'check_in_time' => '13:00:00',
                'check_out_time' => '22:00:00',
                'break_start' => '17:00:00',
                'break_end' => '18:00:00',
                'late_tolerance' => 15,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            [
                'shift_code' => 'SHIFT-3',
                'shift_name' => 'Shift Malam',
                'check_in_time' => '22:00:00',
                'check_out_time' => '07:00:00',
                'break_start' => '02:00:00',
                'break_end' => '03:00:00',
                'late_tolerance' => 15,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

        ]);
    }
}