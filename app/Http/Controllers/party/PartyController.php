<?php

namespace App\Http\Controllers\party;

use App\Http\Controllers\Controller;
use App\Http\Requests\party\StorePartyRequest;
use App\Http\Requests\party\UpdatePartyRequest;
use App\Models\Party;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class PartyController extends Controller
{
    /**
     * Display a listing of parties.
     */
    public function index(): Response
    {
        $parties = Party::latest()->get();

        return Inertia::render('noor-hotel/party', [
            'parties' => $parties,
        ]);
    }

    /**
     * Store a newly created party via API.
     */
    public function store(StorePartyRequest $request): JsonResponse
    {
        $party = Party::create($request->validated());

        return response()->json([
            'message' => 'Party created successfully.',
            'party' => $party,
        ], 201);
    }

    /**
     * Update the specified party.
     */
    public function update(UpdatePartyRequest $request, Party $party): JsonResponse
    {
        $party->update($request->validated());

        return response()->json([
            'message' => 'Party updated successfully.',
            'party' => $party,
        ]);
    }

    /**
     * Remove the specified party.
     */
    public function destroy(Party $party): JsonResponse
    {
        $party->delete();

        return response()->json([
            'message' => 'Party deleted successfully.',
        ]);
    }
}
