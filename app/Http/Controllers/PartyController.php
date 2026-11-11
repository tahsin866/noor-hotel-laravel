<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StorePartyRequest;
use App\Http\Requests\Api\UpdatePartyRequest;
use App\Http\Resources\PartyResource;
use App\Models\Party;
use App\Services\PartyService;
use App\Support\NotifyAdmins;
use App\ValueObjects\Money;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PartyController extends Controller
{
    public function __construct(private PartyService $parties) {}

    public function index(Request $request): Response
    {
        $query = (string) ($request->search ?? '');
        $filters = array_filter([
            'party_type' => $request->string('party_type')->toString(),
            'agreement_type' => $request->string('agreement_type')->toString(),
            'end_date_from' => $request->string('end_date_from')->toString(),
            'end_date_to' => $request->string('end_date_to')->toString(),
        ]);

        $perPage = $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 20, 50, 100], true) ? $perPage : 10;

        $parties = $this->parties->search($query, $filters, $perPage);

        return Inertia::render('noor-hotel/party', [
            'parties' => $parties,
            'filters' => [
                'search' => $query,
                'party_type' => $filters['party_type'] ?? '',
                'agreement_type' => $filters['agreement_type'] ?? '',
                'end_date_from' => $filters['end_date_from'] ?? '',
                'end_date_to' => $filters['end_date_to'] ?? '',
                'per_page' => $perPage,
            ],
        ]);
    }

    public function store(StorePartyRequest $request, PartyService $partyService): JsonResponse
    {
        $dto = new \App\DTOs\CreatePartyDTO(
            partyName: $request->validated('party_name'),
            partyType: $request->validated('party_type'),
            contactPerson: $request->validated('contact_person'),
            contactPersonDesignation: $request->validated('contact_person_designation'),
            phone: $request->validated('phone'),
            email: $request->validated('email'),
            address: $request->validated('address'),
            agreementType: $request->validated('agreement_type'),
            startDate: $request->validated('start_date'),
            endDate: $request->validated('end_date'),
            notes: $request->validated('notes'),
            requirements: $request->validated('requirements'),
        );

        $party = $partyService->create($dto);

        NotifyAdmins::recordCreated('party', [
            'party_name' => $party->party_name,
        ]);

        return response()->json([
            'message' => 'Party created successfully.',
            'party' => new PartyResource($party),
        ], 201);
    }

    public function update(UpdatePartyRequest $request, Party $party, PartyService $partyService): JsonResponse
    {
        $dto = new \App\DTOs\UpdatePartyDTO(
            partyName: $request->validated('party_name'),
            partyType: $request->validated('party_type'),
            contactPerson: $request->validated('contact_person'),
            contactPersonDesignation: $request->validated('contact_person_designation'),
            phone: $request->validated('phone'),
            email: $request->validated('email'),
            address: $request->validated('address'),
            agreementType: $request->validated('agreement_type'),
            startDate: $request->validated('start_date'),
            endDate: $request->validated('end_date'),
            notes: $request->validated('notes'),
            requirements: $request->validated('requirements'),
        );

        $party = $partyService->update($party, $dto);

        return response()->json([
            'message' => 'Party updated successfully.',
            'party' => new PartyResource($party),
        ]);
    }

    public function destroy(Party $party, PartyService $partyService): JsonResponse
    {
        $partyService->delete($party);

        return response()->json([
            'message' => 'Party deleted successfully.',
        ]);
    }

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
