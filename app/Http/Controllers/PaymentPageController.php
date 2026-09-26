<?php

namespace App\Http\Controllers;

use App\Models\Party;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentPageController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/payment', [
            'parties' => $parties,
        ]);
    }
}
