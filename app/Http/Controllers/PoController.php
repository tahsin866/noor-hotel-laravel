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

        $focusPo = $request->filled('po')
            ? Product::query()->select('id', 'code')->find($request->integer('po'))
            : null;

        return Inertia::render('noor-hotel/po', [
            'parties' => $parties,
            'focusPo' => $focusPo,
        ]);
    }
}
