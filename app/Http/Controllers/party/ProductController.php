<?php

namespace App\Http\Controllers\party;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->select('products.*')
            ->leftJoin('parties', 'products.party_id', '=', 'parties.id')
            ->addSelect('parties.party_name')
            ->with('meals');

        $status = $request->get('status');
        $partyId = $request->get('party_id');

        $query->withSum('meals as total_ordered', 'quantity')
            ->withSum('meals as total_delivered', 'delivered_quantity');

        if ($partyId) {
            $query->where('products.party_id', $partyId);
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

        $limit = $request->integer('limit', 10);
        $limit = in_array($limit, [10, 20, 50, 100]) ? $limit : 10;

        $products = $query->orderByDesc('products.id')->paginate($limit);

        return response()->json([
            'items' => $products->items(),
            'total' => $products->total(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:50',
            'vat_rate' => 'nullable|numeric',
            'party_id' => 'nullable|exists:parties,id',
            'customer_po_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'meals' => 'required|array|min:1',
            'meals.*.meal_type' => 'required|string|in:breakfast,lunch,dinner,snack,morning_snacks,evening_snacks,hot_meal',
            'meals.*.quantity' => 'required|integer|min:0',
            'meals.*.unit_price' => 'required|numeric|min:0',
            'meals.*.description' => 'nullable|string',
        ]);

        $validated['code'] = 'PO-'.str_pad(Product::max('id') + 1, 4, '0', STR_PAD_LEFT);

        $meals = $validated['meals'];
        unset($validated['meals']);

        $product = Product::create($validated);

        foreach ($meals as $meal) {
            if (($meal['quantity'] ?? 0) > 0 || ($meal['unit_price'] ?? 0) > 0) {
                $product->meals()->create($meal);
            }
        }

        $product->load(['meals', 'party:id,party_name']);
        $product->party_name = $product->party->party_name ?? null;
        $product->total_ordered = $product->meals->sum('quantity');
        $product->total_delivered = $product->meals->sum('delivered_quantity');

        return response()->json([
            'message' => 'PO created successfully.',
            'product' => $product,
        ], 201);
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['party:id,party_name', 'meals']);

        $meals = $product->meals;
        $subtotal = $meals->sum(fn ($m) => $m->quantity * $m->unit_price);
        $vat = round($subtotal * $product->vat_rate / 100, 2);

        $product->meals_subtotal = $subtotal;
        $product->meals_total = $subtotal + $vat;

        return response()->json($product);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:50',
            'vat_rate' => 'nullable|numeric',
            'party_id' => 'nullable|exists:parties,id',
            'customer_po_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'meals' => 'required|array|min:1',
            'meals.*.meal_type' => 'required|string|in:breakfast,lunch,dinner,snack,morning_snacks,evening_snacks,hot_meal',
            'meals.*.quantity' => 'required|integer|min:0',
            'meals.*.unit_price' => 'required|numeric|min:0',
            'meals.*.description' => 'nullable|string',
        ]);

        $meals = $validated['meals'];
        unset($validated['meals']);

        $product->update($validated);

        $existingMeals = $product->meals()->get();
        $mealsToKeep = [];

        foreach ($meals as $index => $meal) {
            if (($meal['quantity'] ?? 0) <= 0 && ($meal['unit_price'] ?? 0) <= 0) {
                continue;
            }
            if (isset($existingMeals[$index])) {
                $existingMeals[$index]->update($meal);
                $mealsToKeep[] = $existingMeals[$index]->id;
            } else {
                $new = $product->meals()->create($meal);
                $mealsToKeep[] = $new->id;
            }
        }

        $product->meals()->whereNotIn('id', $mealsToKeep)->delete();

        $product->load(['meals', 'party:id,party_name']);
        $product->total_ordered = $product->meals->sum('quantity');
        $product->total_delivered = $product->meals->sum('delivered_quantity');

        return response()->json([
            'message' => 'PO updated successfully.',
            'product' => $product,
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->meals()->delete();
        $product->delete();

        return response()->json([
            'message' => 'PO deleted successfully.',
        ]);
    }

    public function print(Request $request, Product $product)
    {
        $product->load(['party:id,party_name', 'meals']);

        $meals = $product->meals;
        $subtotal = $meals->sum(fn ($m) => $m->quantity * $m->unit_price);
        $vat = round($subtotal * $product->vat_rate / 100, 2);

        $items = $meals->map(function ($m) {
            return [
                'meal_type' => ucfirst($m->meal_type),
                'quantity' => $m->quantity,
                'unit_price' => $m->unit_price,
                'total' => $m->quantity * $m->unit_price,
                'delivered_quantity' => $m->delivered_quantity ?? 0,
                'remaining' => max(0, $m->quantity - ($m->delivered_quantity ?? 0)),
                'description' => $m->description ?? '-',
            ];
        });

        $data = [
            'product' => $product,
            'party_name' => $product->party->party_name ?? '-',
            'items' => $items,
            'subtotal' => $subtotal,
            'vat' => $vat,
            'total' => $subtotal + $vat,
            'date' => Carbon::now()->format('d/m/Y'),
        ];

        if ($request->query('download') === '1') {
            $pdf = Pdf::loadView('pdf.po', $data);
            $pdf->setPaper('a4');
            $pdf->setOption('margin-top', 15);
            $pdf->setOption('margin-bottom', 15);
            $pdf->setOption('margin-left', 15);
            $pdf->setOption('margin-right', 15);

            return $pdf->download('po-'.$product->code.'.pdf');
        }

        $pdf = Pdf::loadView('pdf.po', $data);
        $pdf->setPaper('a4');
        $pdf->setOption('margin-top', 15);
        $pdf->setOption('margin-bottom', 15);
        $pdf->setOption('margin-left', 15);
        $pdf->setOption('margin-right', 15);

        return $pdf->stream('po-'.$product->code.'.pdf');
    }
}
