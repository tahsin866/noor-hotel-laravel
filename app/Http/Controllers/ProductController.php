<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreProductRequest;
use App\Http\Requests\Api\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Services\ProductService;
use App\Support\NotifyAdmins;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function __construct(private ProductService $products) {}

    public function index(Request $request): JsonResponse
    {
        $partyId = $request->get('party_id');
        $status = $request->get('status');
        $search = $request->get('search');

        $query = \App\Models\Product::query()
            ->select('products.*')
            ->leftJoin('parties', 'products.party_id', '=', 'parties.id')
            ->addSelect('parties.party_name')
            ->withDeliveredTotals()
            ->withCount([
                'challans as challans_count' => function ($q) {
                    $q->where('status', '!=', 'cancelled');
                },
                'challans as invoiced_challans_count' => function ($q) {
                    $q->whereHas('invoices');
                },
            ]);

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
                $query->whereHas('challans', function ($q) {
                    $q->whereHas('invoices');
                });
            } elseif ($status === 'waiting') {
                $query->whereHas('challans', function ($q) {
                    $q->where('status', '!=', 'cancelled');
                })->whereDoesntHave('challans', function ($q) {
                    $q->whereHas('invoices');
                });
            } elseif ($status === 'pending') {
                $query->whereDoesntHave('challans', function ($q) {
                    $q->where('status', '!=', 'cancelled');
                });
            }
        }

        $limit = $request->integer('limit', 10);
        $limit = in_array($limit, [10, 20, 50, 100]) ? $limit : 10;

        $products = $query->orderByDesc('products.id')->paginate($limit);

        return response()->json([
            'items' => ProductResource::collection($products->items()),
            'total' => $products->total(),
        ]);
    }

    public function store(StoreProductRequest $request, ProductService $productService): JsonResponse
    {
        $validated = $request->validated();
        $validated['code'] = \App\Models\Product::generateCode();

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('product-attachments', 'public');
        }

        $reminderAt = isset($validated['reminder_at']) && $validated['reminder_at'] ? \Carbon\Carbon::parse($validated['reminder_at']) : null;

        $dto = new \App\DTOs\CreateProductDTO(
            code: $validated['code'],
            name: $validated['name'],
            unit: $validated['unit'],
            vatRate: $validated['vat_rate'] ?? null,
            partyId: $validated['party_id'] ?? null,
            customerPoNumber: $validated['customer_po_number'] ?? null,
            description: $validated['description'] ?? null,
            attachmentPath: $attachmentPath,
            reminderAt: $reminderAt,
            meals: $validated['meals'],
        );

        $product = $productService->create($dto);

        NotifyAdmins::recordCreated('purchase_order', [
            'code' => $product->code,
            'name' => $product->name,
            'party' => $product->party->party_name ?? '-',
            'amount' => round($product->meals->sum(fn ($m) => $m->quantity * $m->unit_price), 2),
        ]);

        return response()->json([
            'message' => 'PO created successfully.',
            'product' => new ProductResource($product),
        ], 201);
    }

    public function show(\App\Models\Product $product): JsonResponse
    {
        $product->load(['party:id,party_name', 'meals' => function ($q) {
            $q->withChallanDelivered();
        }]);

        $meals = $product->meals;
        $subtotal = $meals->sum(fn ($m) => $m->quantity * $m->unit_price);
        $vat = round($subtotal * $product->vat_rate / 100, 2);

        $product->total_ordered = (int) $meals->sum('quantity');
        $product->meals_subtotal = $subtotal;
        $product->meals_total = $subtotal + $vat;
        $product->total_delivered = (int) $meals->sum('delivered_quantity');

        return response()->json(new ProductResource($product));
    }

    public function update(UpdateProductRequest $request, \App\Models\Product $product, ProductService $productService): JsonResponse
    {
        $validated = $request->validated();
        $meals = $validated['meals'];
        unset($validated['meals']);

        $attachmentPath = null;
        $removeAttachment = false;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('product-attachments', 'public');
        } elseif ($request->boolean('attachment_remove')) {
            $removeAttachment = true;
        }

        $product = $productService->update($product, $validated, $meals, $attachmentPath, $removeAttachment);

        return response()->json([
            'message' => 'PO updated successfully.',
            'product' => new ProductResource($product),
        ]);
    }

    public function destroy(\App\Models\Product $product, ProductService $productService): JsonResponse
    {
        $productService->delete($product);

        return response()->json([
            'message' => 'PO deleted successfully.',
        ]);
    }

    public function summaryChallan(\App\Models\Product $product): JsonResponse
    {
        $product->load(['party:id,party_name']);

        $year = now()->year;
        $prefix = "Noor/{$year}/CH/";
        $last = \Illuminate\Support\Facades\DB::select(
            'SELECT MAX(CAST(SUBSTR(challan_number, ?) AS INTEGER)) as max_num FROM challans WHERE challan_number LIKE ?',
            [strlen($prefix) + 1, $prefix.'%']
        );
        $ref = $prefix.str_pad(max(($last[0]->max_num ?? 0) + 1, 650), 4, '0', STR_PAD_LEFT);

        $challans = $product->challans()
            ->where('status', '!=', 'cancelled')
            ->with(['items.productMeal', 'items.productMeal.product'])
            ->orderBy('created_at')
            ->get();

        $items = $challans->flatMap(function ($c) {
            return $c->items->map(function ($it) {
                return [
                    'description' => $it->productMeal->description
                        ?? $it->productMeal->product->name
                        ?? '-',
                    'quantity' => (int) $it->quantity,
                    'meal_type' => $it->productMeal->meal_type ?? '',
                ];
            });
        })->values();

        $notes = $challans->map(fn ($c) => $c->notes)
            ->filter()
            ->unique()
            ->implode("\n");

        return response()->json([
            'success' => true,
            'data' => [
                'ref' => $ref,
                'client' => $product->party->party_name ?? '-',
                'product_name' => $product->name,
                'po_number' => $product->code,
                'customer_po_number' => $product->customer_po_number,
                'delivery_date' => now()->format('d/m/Y'),
                'notes' => $notes,
                'items' => $items,
            ],
        ]);
    }

    public function print(Request $request, \App\Models\Product $product)
    {
        $product->load(['party:id,party_name', 'meals' => function ($q) {
            $q->withChallanDelivered();
        }]);

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
                'remaining' => $m->remaining,
                'over_delivered' => $m->over_delivered,
                'description' => $m->description ?? '-',
            ];
        });

        $data = [
            'product' => $product,
            'party_name' => $product->party->party_name ?? '-',
            'items' => $items,
            'total_remaining' => $product->totalRemaining(),
            'total_over_delivered' => $product->totalOverDelivered(),
            'subtotal' => $subtotal,
            'vat' => $vat,
            'total' => $subtotal + $vat,
            'date' => \Carbon\Carbon::now()->format('d/m/Y'),
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
