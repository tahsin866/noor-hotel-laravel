<?php

namespace App\Http\Controllers\party;

use App\Http\Controllers\Controller;
use App\Http\Requests\party\StorePartyRequest;
use App\Http\Requests\party\UpdatePartyRequest;
use App\Models\Party;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PartyController extends Controller
{
    /**
     * Display a listing of parties.
     */
    public function index(Request $request): Response
    {
        $query = Party::query();

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('party_name', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('party_type')) {
            $query->where('party_type', $request->party_type);
        }

        if ($request->filled('agreement_type')) {
            $query->where('agreement_type', $request->agreement_type);
        }

        if ($request->filled('end_date_from')) {
            $query->whereDate('end_date', '>=', $request->end_date_from);
        }

        if ($request->filled('end_date_to')) {
            $query->whereDate('end_date', '<=', $request->end_date_to);
        }

        $perPage = $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 20, 50, 100]) ? $perPage : 10;

        $parties = $query->latest()->paginate($perPage);

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

    /**
     * Print party as PDF.
     */
    public function print(Request $request, Party $party)
    {
        if ($request->query('download') === '1') {
            $pdf = Pdf::loadView('pdf.party', ['party' => $party]);
            $pdf->setPaper('a4');
            $pdf->setOption('margin-top', 15);
            $pdf->setOption('margin-bottom', 15);
            $pdf->setOption('margin-left', 15);
            $pdf->setOption('margin-right', 15);

            return $pdf->download(str_replace('/', '-', $party->party_name).'.pdf');
        }

        $pdf = Pdf::loadView('pdf.party', ['party' => $party]);
        $pdf->setPaper('a4');
        $pdf->setOption('margin-top', 15);
        $pdf->setOption('margin-bottom', 15);
        $pdf->setOption('margin-left', 15);
        $pdf->setOption('margin-right', 15);

        return $pdf->stream(str_replace('/', '-', $party->party_name).'.pdf');
    }
}
