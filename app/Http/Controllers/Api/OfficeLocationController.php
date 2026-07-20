<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OfficeLocation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;


class OfficeLocationController extends Controller
{

public function index(): JsonResponse
{
    $officeLocations = OfficeLocation::orderBy('office_name', 'asc')->get();

    return response()->json([
        'success' => true,
        'message' => 'Data lokasi kantor berhasil diambil.',
        'total'   => $officeLocations->count(),
        'data'    => $officeLocations
    ], 200);
}

public function store(Request $request): JsonResponse
{
    $validated = $request->validate([
        'office_code'      => 'required|string|max:20|unique:office_locations,office_code',
        'office_name'      => 'required|string|max:100',
        'latitude'         => 'required|numeric',
        'longitude'        => 'required|numeric',
        'radius_meter'     => 'required|integer|min:1',
        'check_in_start'   => 'required',
        'check_in_end'     => 'required',
        'check_out_start'  => 'required',
        'check_out_end'    => 'required',
        'description'      => 'nullable|string',
        'is_active'        => 'required|boolean',
    ]);

    $officeLocation = OfficeLocation::create($validated);

    return response()->json([
        'success' => true,
        'message' => 'Data lokasi kantor berhasil ditambahkan.',
        'data'    => $officeLocation
    ], 201);
}

public function show(string $id): JsonResponse
{
    $officeLocation = OfficeLocation::findOrFail($id);

    return response()->json([
        'success' => true,
        'message' => 'Detail lokasi kantor berhasil diambil.',
        'data'    => $officeLocation
    ], 200);
}

public function update(Request $request, string $id): JsonResponse
{
    $officeLocation = OfficeLocation::findOrFail($id);

    $validated = $request->validate([
        'office_code'      => 'required|string|max:20|unique:office_locations,office_code,' . $officeLocation->id,
        'office_name'      => 'required|string|max:100',
        'latitude'         => 'required|numeric',
        'longitude'        => 'required|numeric',
        'radius_meter'     => 'required|integer|min:1',
        'check_in_start'   => 'required',
        'check_in_end'     => 'required',
        'check_out_start'  => 'required',
        'check_out_end'    => 'required',
        'description'      => 'nullable|string',
        'is_active'        => 'required|boolean',
    ]);

    $officeLocation->update($validated);

    return response()->json([
        'success' => true,
        'message' => 'Data lokasi kantor berhasil diperbarui.',
        'data'    => $officeLocation
    ], 200);
}

public function destroy(string $id): JsonResponse
{
    $officeLocation = OfficeLocation::findOrFail($id);

    $officeLocation->delete();

    return response()->json([
        'success' => true,
        'message' => 'Data lokasi kantor berhasil dihapus.'
    ], 200);
}
}
