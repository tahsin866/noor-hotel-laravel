<?php

namespace App\Http\Controllers\party;

use App\Http\Controllers\Controller;
use App\Models\Challan;
use App\Models\ProductMeal;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ChallanController extends Controller
{
    public function index(Request $request)
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 10);
        $status = $request->get('status');
        $search = $request->get('search');
        $partyId = $request->get('party_id');

        $query = Challan::with(['product', 'product.party', 'user', 'items'])
            ->orderByDesc('created_at');

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('challan_number', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($q2) use ($search) {
                        $q2->where('code', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($partyId) {
            $query->whereHas('product', function ($q) use ($partyId) {
                $q->where('party_id', $partyId);
            });
        }

        $total = $query->count();
        $items = $query->skip(($page - 1) * $limit)->take($limit)->get();

        $items = $items->map(function ($item) {
            $totalQty = $item->items->sum('quantity');

            return [
                'id' => $item->id,
                'challan_number' => $item->challan_number,
                'product_id' => $item->product_id,
                'product_name' => $item->product->name ?? '-',
                'po_number' => $item->product->code ?? '-',
                'customer_po_number' => $item->product->customer_po_number ?? '-',
                'party_name' => $item->product->party->party_name ?? '-',
                'date' => $item->date,
                'address' => $item->address,
                'notes' => $item->notes,
                'total_amount' => $item->total_amount,
                'total_qty' => $totalQty,
                'status' => $item->status,
                'created_at' => $item->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => ['items' => $items, 'total' => $total],
        ]);
    }

    public function show($id)
    {
        $challan = Challan::with([
            'product',
            'product.party',
            'user',
            'items.productMeal',
        ])->findOrFail($id);

        $items = $challan->items->map(function ($item) {
            return [
                'id' => $item->id,
                'product_meal_id' => $item->product_meal_id,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'product_name' => $item->productMeal->product->name ?? '-',
                'meal_type' => $item->productMeal->meal_type ?? '-',
                'description' => $item->productMeal->description ?? '-',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $challan->id,
                'challan_number' => $challan->challan_number,
                'product_id' => $challan->product_id,
                'product_name' => $challan->product->name ?? '-',
                'po_number' => $challan->product->code ?? '-',
                'customer_po_number' => $challan->product->customer_po_number ?? '-',
                'party_name' => $challan->product->party->party_name ?? '-',
                'date' => $challan->date,
                'address' => $challan->address,
                'notes' => $challan->notes,
                'total_amount' => $challan->total_amount,
                'status' => $challan->status,
                'items' => $items,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'date' => 'required|date',
            'address' => 'required|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_meal_id' => 'required|exists:product_meals,id',
            'items.*.quantity' => 'required|numeric|min:0',
        ]);

        $total = 0;
        foreach ($request->items as $item) {
            $meal = ProductMeal::find($item['product_meal_id']);
            $total += ($item['quantity'] * ($meal->unit_price ?? 0));
        }

        $challan = Challan::create([
            'product_id' => $request->product_id,
            'user_id' => $request->user()->id ?? 1,
            'date' => $request->date,
            'address' => $request->address,
            'notes' => $request->notes,
            'total_amount' => $total,
            'status' => 'pending',
        ]);

        foreach ($request->items as $item) {
            $meal = ProductMeal::find($item['product_meal_id']);
            $challan->items()->create([
                'product_meal_id' => $item['product_meal_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $meal->unit_price ?? 0,
            ]);
        }

        return response()->json(['success' => true, 'message' => 'Challan created']);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'date' => 'required|date',
            'address' => 'required|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_meal_id' => 'required|exists:product_meals,id',
            'items.*.quantity' => 'required|numeric|min:0',
        ]);

        $challan = Challan::findOrFail($id);
        $wasDispatched = $challan->status === 'dispatched';

        if ($wasDispatched) {
            foreach ($challan->items as $oldItem) {
                ProductMeal::where('id', $oldItem['product_meal_id'])
                    ->decrement('delivered_quantity', $oldItem['quantity']);
            }
        }

        $total = 0;
        foreach ($request->items as $item) {
            $meal = ProductMeal::find($item['product_meal_id']);
            $total += ($item['quantity'] * ($meal->unit_price ?? 0));
        }

        $challan->update([
            'product_id' => $request->product_id,
            'date' => $request->date,
            'address' => $request->address,
            'notes' => $request->notes,
            'total_amount' => $total,
        ]);

        $challan->items()->delete();
        foreach ($request->items as $item) {
            $meal = ProductMeal::find($item['product_meal_id']);
            $challan->items()->create([
                'product_meal_id' => $item['product_meal_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $meal->unit_price ?? 0,
            ]);
        }

        if ($wasDispatched) {
            foreach ($request->items as $item) {
                ProductMeal::where('id', $item['product_meal_id'])
                    ->increment('delivered_quantity', $item['quantity']);
            }
        }

        return response()->json(['success' => true, 'message' => 'Challan updated']);
    }

    public function destroy($id)
    {
        $challan = Challan::findOrFail($id);

        if ($challan->status === 'dispatched') {
            foreach ($challan->items as $item) {
                ProductMeal::where('id', $item->product_meal_id)
                    ->decrement('delivered_quantity', $item->quantity);
            }
        }

        $challan->items()->delete();
        $challan->delete();

        return response()->json(['success' => true, 'message' => 'Challan deleted']);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:pending,dispatched,delivered,cancelled']);

        $challan = Challan::findOrFail($id);
        $previousStatus = $challan->status;
        $newStatus = $request->status;

        $challan->update(['status' => $newStatus]);

        $wasDispatched = $previousStatus === 'dispatched';
        $isNowDispatched = $newStatus === 'dispatched';

        if (! $wasDispatched && $isNowDispatched) {
            foreach ($challan->items as $item) {
                ProductMeal::where('id', $item->product_meal_id)
                    ->increment('delivered_quantity', $item->quantity);
            }
        } elseif ($wasDispatched && ! $isNowDispatched && $newStatus !== 'delivered') {
            foreach ($challan->items as $item) {
                ProductMeal::where('id', $item->product_meal_id)
                    ->decrement('delivered_quantity', $item->quantity);
            }
        }

        return response()->json(['success' => true, 'message' => 'Challan status updated']);
    }

    public function print(Request $request, $id)
    {
        $challan = Challan::with([
            'product',
            'product.party',
            'items.productMeal',
        ])->findOrFail($id);

        $items = $challan->items->map(function ($item) {
            return [
                'product_name' => $item->productMeal->product->name ?? '-',
                'meal_type' => $item->productMeal->meal_type ?? '-',
                'description' => $item->productMeal->description ?? '-',
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total' => $item->quantity * $item->unit_price,
            ];
        });

        $data = [
            'challan' => $challan,
            'product_name' => $challan->product->name ?? '-',
            'po_number' => $challan->product->code ?? '-',
            'customer_po_number' => $challan->product->customer_po_number ?? '-',
            'party_name' => $challan->product->party->party_name ?? '-',
            'items' => $items,
        ];

        $pdf = Pdf::loadView('pdf.challan', $data);
        $pdf->setPaper('a4');
        $pdf->setOption('margin-top', 15);
        $pdf->setOption('margin-bottom', 15);
        $pdf->setOption('margin-left', 15);
        $pdf->setOption('margin-right', 15);

        if ($request->query('download') === '1') {
            return $pdf->download(str_replace('/', '-', $challan->challan_number).'.pdf');
        }

        return $pdf->stream(str_replace('/', '-', $challan->challan_number).'.pdf');
    }

    public function printBatch(Request $request)
    {
        $request->validate(['ids' => 'required|array|min:1']);
        $request->validate(['ids.*' => 'required|integer|exists:challans,id']);

        $challans = Challan::with(['product', 'product.party', 'items.productMeal'])
            ->whereIn('id', $request->ids)
            ->orderBy('id')
            ->get();

        $challansData = $challans->map(function ($challan) {
            $items = $challan->items->map(function ($item) {
                return [
                    'product_name' => $item->productMeal->product->name ?? '-',
                    'meal_type' => $item->productMeal->meal_type ?? '-',
                    'description' => $item->productMeal->description ?? '-',
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total' => $item->quantity * $item->unit_price,
                ];
            });

            return [
                'challan' => $challan,
                'product_name' => $challan->product->name ?? '-',
                'po_number' => $challan->product->code ?? '-',
                'customer_po_number' => $challan->product->customer_po_number ?? '-',
                'party_name' => $challan->product->party->party_name ?? '-',
                'items' => $items,
            ];
        });

        $data = ['challans' => $challansData];

        $pdf = Pdf::loadView('pdf.challan_batch', $data);
        $pdf->setPaper('a4');
        $pdf->setOption('margin-top', 15);
        $pdf->setOption('margin-bottom', 15);
        $pdf->setOption('margin-left', 15);
        $pdf->setOption('margin-right', 15);

        if ($request->query('download') === '1') {
            return $pdf->download('challans-batch.pdf');
        }

        return $pdf->stream('challans-batch.pdf');
    }
}
