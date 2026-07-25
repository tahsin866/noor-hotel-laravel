<?php

namespace App\Http\Controllers\party;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductMeal;
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
            $query->whereHas('meals', function ($q) use ($status) {
                $q->groupBy('product_id');
                $q->havingRaw('SUM(delivered_quantity) ' . ($status === 'delivered' ? '>=' : '<') . ' SUM(quantity)');
                if ($status === 'partial') {
                    $q->havingRaw('SUM(delivered_quantity) > 0');
                }
            });
        }

        $products = $query->orderByDesc('products.id')->paginate(10);

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
            'vat_rate' => 'nullable|numeric|min:0',
            'party_id' => 'nullable|exists:parties,id',
            'customer_po_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'meals' => 'required|array|min:1',
            'meals.*.meal_type' => 'required|string|in:breakfast,lunch,dinner,snack',
            'meals.*.quantity' => 'required|integer|min:0',
            'meals.*.unit_price' => 'required|numeric|min:0',
            'meals.*.description' => 'nullable|string',
        ]);

        $validated['code'] = 'PO-' . str_pad(Product::max('id') + 1, 4, '0', STR_PAD_LEFT);

        $meals = $validated['meals'];
        unset($validated['meals']);

        $product = Product::create($validated);

        foreach ($meals as $meal) {
            if (($meal['quantity'] ?? 0) > 0 || ($meal['unit_price'] ?? 0) > 0) {
                $product->meals()->create($meal);
            }
        }

        return response()->json([
            'message' => 'PO created successfully.',
            'product' => $product->load('meals'),
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
            'vat_rate' => 'nullable|numeric|min:0',
            'party_id' => 'nullable|exists:parties,id',
            'customer_po_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'meals' => 'required|array|min:1',
            'meals.*.meal_type' => 'required|string|in:breakfast,lunch,dinner,snack',
            'meals.*.quantity' => 'required|integer|min:0',
            'meals.*.unit_price' => 'required|numeric|min:0',
            'meals.*.description' => 'nullable|string',
        ]);

        $meals = $validated['meals'];
        unset($validated['meals']);

        $product->update($validated);
        $product->meals()->delete();

        foreach ($meals as $meal) {
            if (($meal['quantity'] ?? 0) > 0 || ($meal['unit_price'] ?? 0) > 0) {
                $product->meals()->create($meal);
            }
        }

        return response()->json([
            'message' => 'PO updated successfully.',
            'product' => $product->load('meals'),
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
}
