<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompanySetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanySettingController extends Controller
{
    /**
     * Ambil data perusahaan saat ini.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Data perusahaan berhasil diambil.',
            'data' => CompanySetting::current(),
        ]);
    }

    /**
     * Update data perusahaan (singleton - selalu update baris yang sama).
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([

            'company_name' => 'sometimes|string|max:255',

            'address' => 'nullable|string',

            'phone' => 'nullable|string|max:30',

            'email' => 'nullable|email|max:255',

            'logo' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',

        ]);

        $company = CompanySetting::current();

        if ($request->hasFile('logo')) {
            $validated['logo'] = $request->file('logo')->store('company', 'public');
        }

        $company->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data perusahaan berhasil diperbarui.',
            'data' => $company->fresh(),
        ]);
    }
}
