<?php

namespace App\Http\Controllers\reports;

use App\Http\Controllers\Controller;
use App\Models\Challan;
use Illuminate\Http\Request;

class ChallanReportController extends Controller
{
    public function index(Request $request)
    {
        $partyId = $request->get('party_id');
        $status = $request->get('status');
        $search = $request->get('search');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        $perPage = (int) $request->get('per_page', 10);
        $perPage = in_array($perPage, [10, 20, 30, 50, 100, 1000]) ? $perPage : 10;

        $query = Challan::query()
            ->with(['product', 'product.party', 'items.productMeal'])
            ->orderByDesc('id');

        if ($partyId) {
            $query->whereHas('product', function ($q) use ($partyId) {
                $q->where('party_id', $partyId);
            });
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('challans.challan_number', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($q2) use ($search) {
                        $q2->where('code', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%")
                            ->orWhere('customer_po_number', 'like', "%{$search}%")
                            ->orWhereHas('party', function ($q3) use ($search) {
                                $q3->where('party_name', 'like', "%{$search}%");
                            });
                    });
            });
        }

        if ($dateFrom) {
            $query->where('date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->where('date', '<=', $dateTo);
        }

        $allChallans = $query->get();
        $rows = $query->paginate($perPage);

        $mappedRows = collect($rows->items())->map(fn ($challan) => $this->mapRow($challan))->values();

        $summary = $this->buildSummary($allChallans);

        return response()->json([
            'success' => true,
            'data' => [
                'rows' => $mappedRows,
                'summary' => $summary,
                'pagination' => [
                    'current_page' => $rows->currentPage(),
                    'per_page' => $rows->perPage(),
                    'total' => $rows->total(),
                    'last_page' => $rows->lastPage(),
                ],
            ],
        ]);
    }

    private function mapRow(Challan $challan): array
    {
        $totalQty = $challan->items->sum('quantity');

        $items = $challan->items->map(function ($item) {
            return [
                'id' => $item->id,
                'meal_type' => $item->productMeal->meal_type ?? '-',
                'description' => $item->productMeal->description ?? '-',
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total' => round($item->quantity * $item->unit_price, 2),
            ];
        });

        return [
            'id' => $challan->id,
            'challan_number' => $challan->challan_number,
            'date' => $challan->date,
            'product_id' => $challan->product_id,
            'po_number' => $challan->product->code ?? '-',
            'product_name' => $challan->product->name ?? '-',
            'customer_po_number' => $challan->product->customer_po_number ?? '-',
            'party_name' => $challan->product->party->party_name ?? '-',
            'address' => $challan->address,
            'notes' => $challan->notes,
            'total_qty' => $totalQty,
            'total_amount' => $challan->total_amount,
            'status' => $challan->status,
            'items' => $items,
        ];
    }

    private function buildSummary($challans): array
    {
        return [
            'total_challans' => $challans->count(),
            'total_qty' => $challans->sum(fn ($c) => $c->items->sum('quantity')),
            'total_amount' => round($challans->sum('total_amount'), 2),
            'delivered_count' => $challans->where('status', 'delivered')->count(),
            'delivered_amount' => round($challans->where('status', 'delivered')->sum('total_amount'), 2),
            'dispatched_count' => $challans->where('status', 'dispatched')->count(),
            'dispatched_amount' => round($challans->where('status', 'dispatched')->sum('total_amount'), 2),
            'pending_count' => $challans->where('status', 'pending')->count(),
            'pending_amount' => round($challans->where('status', 'pending')->sum('total_amount'), 2),
            'cancelled_count' => $challans->where('status', 'cancelled')->count(),
            'cancelled_amount' => round($challans->where('status', 'cancelled')->sum('total_amount'), 2),
        ];
    }
}
