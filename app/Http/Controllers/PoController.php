<?php

namespace App\Http\Controllers;

use App\Models\Party;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PoController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/po', [
            'parties' => $parties,
        ]);
    }
}
