<?php

namespace App\Http\Controllers;

use App\Models\ChallanItem;
use App\Models\Party;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChallanPageController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $products = Product::with([
            'party',
            'meals' => function ($query) {
                $query->addSelect([
                    'allocated_quantity' => ChallanItem::query()
                        ->join('challans', 'challans.id', '=', 'challan_items.challan_id')
                        ->whereColumn('challan_items.product_meal_id', 'product_meals.id')
                        ->where('challans.status', '!=', 'cancelled')
                        ->whereNull('challans.deleted_at')
                        ->selectRaw('COALESCE(SUM(challan_items.quantity), 0)'),
                    'delivered_quantity' => ChallanItem::query()
                        ->join('challans', 'challans.id', '=', 'challan_items.challan_id')
                        ->whereColumn('challan_items.product_meal_id', 'product_meals.id')
                        ->where('challans.status', '!=', 'cancelled')
                        ->whereNull('challans.deleted_at')
                        ->selectRaw('COALESCE(SUM(challan_items.quantity), 0)'),
                ]);
            },
        ])
            ->select('id', 'name', 'code', 'unit', 'party_id')
            ->withSum('meals as total_ordered', 'quantity')
            ->addSelect([
                'total_delivered' => ChallanItem::query()
                    ->join('challans', 'challans.id', '=', 'challan_items.challan_id')
                    ->whereColumn('challans.product_id', 'products.id')
                    ->where('challans.status', '!=', 'cancelled')
                    ->whereNull('challans.deleted_at')
                    ->selectRaw('COALESCE(SUM(challan_items.quantity), 0)'),
            ])
            ->get();

        $parties = Party::select('id', 'party_name')->get();

        return Inertia::render('noor-hotel/chalans', [
            'products' => $products,
            'parties' => $parties,
        ]);
    }
}
