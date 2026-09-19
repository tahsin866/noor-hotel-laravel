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
            ->withDeliveredTotals();

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

        $products = $query->orderByDesc('products.id')->get();

        $rows = $products->map(function ($product) {
            $subtotal = $product->meals->sum(fn ($m) => $m->quantity * $m->unit_price);
            $deliveredSubtotal = $product->meals->sum(fn ($m) => $m->delivered_quantity * $m->unit_price);
            $remainingSubtotal = max(0, $subtotal - $deliveredSubtotal);

            $vat = round($subtotal * $product->vat_rate / 100, 2);
            $deliveredVat = round($deliveredSubtotal * $product->vat_rate / 100, 2);
            $remainingVat = round($remainingSubtotal * $product->vat_rate / 100, 2);

            $ordered = (int) $product->total_ordered;
            $delivered = (int) $product->total_delivered;
            $remaining = max(0, $ordered - $delivered);

            $hasMeals = $product->meals->isNotEmpty();
            $fullyDelivered = $hasMeals && $product->meals->every(fn ($m) => (int) $m->delivered_quantity >= (int) $m->quantity);
            $hasDelivered = $product->meals->contains(fn ($m) => (int) $m->delivered_quantity > 0);
            $hasRemaining = $product->meals->contains(fn ($m) => (int) $m->delivered_quantity < (int) $m->quantity);

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
                'delivered_subtotal' => round($deliveredSubtotal, 2),
                'delivered_vat' => $deliveredVat,
                'delivered_total' => round($deliveredSubtotal + $deliveredVat, 2),
                'remaining_subtotal' => round($remainingSubtotal, 2),
                'remaining_vat' => $remainingVat,
                'remaining_total' => round($remainingSubtotal + $remainingVat, 2),
                'status' => $this->deliveryStatus($ordered, $delivered),
                '_hasMeals' => $hasMeals,
                '_fullyDelivered' => $fullyDelivered,
                '_hasDelivered' => $hasDelivered,
                '_hasRemaining' => $hasRemaining,
            ];
        });

        $rows = $rows->filter(function ($row) use ($status) {
            if (! in_array($status, ['delivered', 'partial', 'pending'], true)) {
                return true;
            }
            if ($status === 'delivered') {
                return $row['_hasMeals'] && $row['_fullyDelivered'];
            }
            if ($status === 'partial') {
                return $row['_hasDelivered'] && $row['_hasRemaining'];
            }

            return ! $row['_hasDelivered'];
        })->values()->map(fn ($row) => array_diff_key($row, array_flip(['_hasMeals', '_fullyDelivered', '_hasDelivered', '_hasRemaining'])));

        $summary = [
            'total_orders' => $rows->count(),
            'total_ordered' => $rows->sum('total_ordered'),
            'total_delivered' => $rows->sum('total_delivered'),
            'total_remaining' => $rows->sum('remaining'),
            'total_subtotal' => round($rows->sum('subtotal'), 2),
            'total_vat' => round($rows->sum('vat'), 2),
            'total_amount' => round($rows->sum('total'), 2),
            'total_delivered_subtotal' => round($rows->sum('delivered_subtotal'), 2),
            'total_delivered_vat' => round($rows->sum('delivered_vat'), 2),
            'total_delivered_amount' => round($rows->sum('delivered_total'), 2),
            'total_remaining_subtotal' => round($rows->sum('remaining_subtotal'), 2),
            'total_remaining_vat' => round($rows->sum('remaining_vat'), 2),
            'total_remaining_amount' => round($rows->sum('remaining_total'), 2),
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