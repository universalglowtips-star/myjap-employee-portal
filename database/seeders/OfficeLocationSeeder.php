<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\OfficeLocation;

class OfficeLocationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        OfficeLocation::insert([

            [
                'office_code'      => 'BPN',
                'office_name'      => 'Balikpapan Head Office',
                'latitude'         => -1.265386,
                'longitude'        => 116.831200,
                'radius_meter'     => 100,
                'check_in_start'   => '07:00:00',
                'check_in_end'     => '09:00:00',
                'check_out_start'  => '16:00:00',
                'check_out_end'    => '20:00:00',
                'description'      => 'Kantor Pusat PT MyJAP Balikpapan',
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],

            [
                'office_code'      => 'SMD',
                'office_name'      => 'Samarinda Branch',
                'latitude'         => -0.502183,
                'longitude'        => 117.153801,
                'radius_meter'     => 100,
                'check_in_start'   => '07:00:00',
                'check_in_end'     => '09:00:00',
                'check_out_start'  => '16:00:00',
                'check_out_end'    => '20:00:00',
                'description'      => 'Cabang Samarinda',
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],

            [
                'office_code'      => 'PPU',
                'office_name'      => 'Penajam Branch',
                'latitude'         => -1.292580,
                'longitude'        => 116.697200,
                'radius_meter'     => 100,
                'check_in_start'   => '07:00:00',
                'check_in_end'     => '09:00:00',
                'check_out_start'  => '16:00:00',
                'check_out_end'    => '20:00:00',
                'description'      => 'Cabang Penajam',
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],

            [
                'office_code'      => 'PSR',
                'office_name'      => 'Paser Branch',
                'latitude'         => -1.879350,
                'longitude'        => 116.202700,
                'radius_meter'     => 100,
                'check_in_start'   => '07:00:00',
                'check_in_end'     => '09:00:00',
                'check_out_start'  => '16:00:00',
                'check_out_end'    => '20:00:00',
                'description'      => 'Cabang Paser',
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],

            [
                'office_code'      => 'SBJ',
                'office_name'      => 'Samboja Branch',
                'latitude'         => -0.987300,
                'longitude'        => 116.741400,
                'radius_meter'     => 100,
                'check_in_start'   => '07:00:00',
                'check_in_end'     => '09:00:00',
                'check_out_start'  => '16:00:00',
                'check_out_end'    => '20:00:00',
                'description'      => 'Cabang Samboja',
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],

        ]);
    }
}