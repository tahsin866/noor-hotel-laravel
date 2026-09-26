<?php

namespace App\Http\Controllers;

use App\Models\Challan;
use App\Models\Party;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InvoicePageController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $parties = Party::select('id', 'party_name')->get();
        $products = Product::with(['party'])
            ->select('id', 'name', 'code', 'unit', 'party_id', 'customer_po_number')
            ->get();
        $challans = Challan::with(['product', 'product.party', 'items.productMeal'])
            ->whereIn('status', ['pending', 'delivered'])
            ->whereNotIn('id', function ($query) {
                $query->select('challan_id')->from('invoice_challans');
            })
            ->select('id', 'challan_number', 'product_id', 'date', 'status')
            ->get()
            ->map(function ($c) {
                $items = $c->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'meal_type' => $item->productMeal->meal_type ?? '-',
                        'quantity' => $item->quantity,
                        'description' => $item->productMeal->description ?? '-',
                    ];
                });

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
                    'items' => $items,
                ];
            });

        return Inertia::render('noor-hotel/invoice', [
            'parties' => $parties,
            'products' => $products,
            'challans' => $challans,
        ]);
    }
}
