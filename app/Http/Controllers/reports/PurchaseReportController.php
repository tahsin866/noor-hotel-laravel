<?php

namespace App\Http\Controllers\reports;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class PurchaseReportController extends Controller
{
    public function index(Request $request)
    {
        $partyId = $request->get('party_id');
        $status = $request->get('status');
        $search = $request->get('search');

        $query = Product::query()
            ->select('products.*')
            ->leftJoin('parties', 'products.party_id', '=', 'parties.id')
            ->addSelect('parties.party_name')
            ->with('meals')
            ->withSum('meals as total_ordered', 'quantity')
            ->withSum('meals as total_delivered', 'delivered_quantity');

        if ($partyId) {
            $query->where('products.party_id', $partyId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('products.code', 'like', "%{$search}%")
                    ->orWhere('products.name', 'like', "%{$search}%")
                    ->orWhere('products.customer_po_number', 'like', "%{$search}%")
                    ->orWhere('parties.party_name', 'like', "%{$search}%");
            });
        }

        if ($status && $status !== 'all') {
            if ($status === 'delivered') {
                $query->whereDoesntHave('meals', function ($q) {
                    $q->whereColumn('delivered_quantity', '<', 'quantity');
                })->whereHas('meals');
            } elseif ($status === 'partial') {
                $query->whereHas('meals', function ($q) {
                    $q->where('delivered_quantity', '>', 0);
                })->whereHas('meals', function ($q) {
                    $q->whereColumn('delivered_quantity', '<', 'quantity');
                });
            } elseif ($status === 'pending') {
                $query->whereDoesntHave('meals', function ($q) {
                    $q->where('delivered_quantity', '>', 0);
                });
            }
        }

        $products = $query->orderByDesc('products.id')->get();

        $rows = $products->map(function ($product) {
            $subtotal = $product->meals->sum(fn ($m) => $m->quantity * $m->unit_price);
            $vat = round($subtotal * $product->vat_rate / 100, 2);
            $ordered = (int) $product->total_ordered;
            $delivered = (int) $product->total_delivered;
            $remaining = max(0, $ordered - $delivered);

            return [
                'id' => $product->id,
                'code' => $product->code,
                'name' => $product->name,
                'party_id' => $product->party_id,
                'party_name' => $product->party_name ?? '-',
                'customer_po_number' => $product->customer_po_number,
                'unit' => $product->unit,
                'vat_rate' => $product->vat_rate,
                'total_ordered' => $ordered,
                'total_delivered' => $delivered,
                'remaining' => $remaining,
                'subtotal' => $subtotal,
                'vat' => $vat,
                'total' => round($subtotal + $vat, 2),
                'status' => $this->deliveryStatus($ordered, $delivered),
            ];
        });

        $summary = [
            'total_orders' => $rows->count(),
            'total_ordered' => $rows->sum('total_ordered'),
            'total_delivered' => $rows->sum('total_delivered'),
            'total_remaining' => $rows->sum('remaining'),
            'total_subtotal' => round($rows->sum('subtotal'), 2),
            'total_vat' => round($rows->sum('vat'), 2),
            'total_amount' => round($rows->sum('total'), 2),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'rows' => $rows,
                'summary' => $summary,
            ],
        ]);
    }

    private function deliveryStatus(int $ordered, int $delivered): string
    {
        if ($ordered === 0) {
            return 'no_items';
        }
        if ($delivered >= $ordered) {
            return 'delivered';
        }
        if ($delivered > 0) {
            return 'partial';
        }

        return 'pending';
    }
}
