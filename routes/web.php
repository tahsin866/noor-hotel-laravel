<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\party\PartyController;
use App\Models\Party;
use App\Models\Product;
use App\Models\Challan;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('party', [PartyController::class, 'index'])->name('party');
    Route::post('party', [PartyController::class, 'store']);

    Route::get('po', function () {
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/po', [
            'parties' => $parties,
        ]);
    })->name('po');

    Route::get('chalans', function () {
        $products = Product::with(['party', 'meals'])
            ->select('id', 'name', 'code', 'unit', 'party_id', 'total_ordered', 'total_delivered')
            ->get();
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/chalans', [
            'products' => $products,
            'parties' => $parties,
        ]);
    })->name('chalans');

    Route::get('invoices', function () {
        $parties = Party::select('id', 'party_name')->get();
        $challans = Challan::with(['product', 'product.party'])
            ->where('status', 'delivered')
            ->whereNotIn('id', function ($query) {
                $query->select('challan_id')->from('invoice_challans');
            })
            ->select('id', 'challan_number', 'product_id', 'date', 'status')
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'challan_number' => $c->challan_number,
                    'product_id' => $c->product_id,
                    'product_name' => $c->product->name ?? '-',
                    'po_number' => $c->product->code ?? '-',
                    'party_id' => $c->product->party_id ?? null,
                    'party_name' => $c->product->party->party_name ?? '-',
                    'date' => $c->date,
                    'status' => $c->status,
                ];
            });

        return Inertia::render('noor-hotel/invoice', [
            'parties' => $parties,
            'challans' => $challans,
        ]);
    })->name('invoices');

    Route::get('payments', function () {
        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/payment', [
            'parties' => $parties,
        ]);
    })->name('payments');
});

require __DIR__.'/settings.php';
