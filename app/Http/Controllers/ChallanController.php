<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreChallanRequest;
use App\Http\Requests\Api\UpdateChallanRequest;
use App\Http\Resources\ChallanResource;
use App\Services\ChallanService;
use App\Support\NotifyAdmins;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ChallanController extends Controller
{
    public function __construct(private ChallanService $challans) {}

    private function syncLinkedInvoices(\App\Models\Challan $challan): void
    {
        $invoices = $challan->invoices()->get();

        if ($invoices->isEmpty()) {
            return;
        }

        $invoiceController = app(\App\Http\Controllers\InvoiceController::class);

        foreach ($invoices as $invoice) {
            $invoiceController->rebuildFromChallans($invoice);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 10);
        $status = $request->get('status');
        $search = $request->get('search');
        $partyId = $request->get('party_id');

        $filters = [];
        if ($status) {
            $filters['status'] = $status;
        }

        $query = \App\Models\Challan::query()
            ->with(['product', 'product.party', 'user', 'items'])
            ->orderByDesc('created_at');

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
                'total_qty' => $item->items->sum('quantity'),
                'status' => $item->status,
                'created_at' => $item->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => ['items' => $items, 'total' => $total],
        ]);
    }

    public function show($id): JsonResponse
    {
        $challan = \App\Models\Challan::with([
            'product',
            'product.party',
            'user',
            'items.productMeal',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new ChallanResource($challan),
        ]);
    }

    public function store(StoreChallanRequest $request, ChallanService $challanService): JsonResponse
    {
        $validated = $request->validated();

        $total = 0;
        foreach ($validated['items'] as $item) {
            $meal = \App\Models\ProductMeal::find($item['product_meal_id']);
            $total += ($item['quantity'] * ($meal->unit_price ?? 0));
        }

        $dto = new \App\DTOs\CreateChallanDTO(
            productId: $validated['product_id'],
            userId: $request->user()->id ?? 1,
            date: $validated['date'],
            address: $validated['address'],
            notes: $validated['notes'] ?? null,
            items: $validated['items'],
            showPrintDate: $validated['show_print_date'] ?? true,
        );

        $challan = $challanService->create($dto);

        NotifyAdmins::recordCreated('challan', [
            'challan_number' => $challan->challan_number,
            'po_number' => $challan->product?->code,
            'amount' => round($total, 2),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Challan created',
            'data' => new ChallanResource($challan),
        ]);
    }

    public function update(UpdateChallanRequest $request, $id, ChallanService $challanService): JsonResponse
    {
        $validated = $request->validated();
        $challan = \App\Models\Challan::findOrFail($id);

        $dto = new \App\DTOs\CreateChallanDTO(
            productId: $validated['product_id'],
            userId: $request->user()->id ?? 1,
            date: $validated['date'],
            address: $validated['address'],
            notes: $validated['notes'] ?? null,
            items: $validated['items'],
            showPrintDate: $validated['show_print_date'] ?? true,
        );

        $challan = $challanService->update($challan, $dto);

        $this->syncLinkedInvoices($challan);

        return response()->json([
            'success' => true,
            'message' => 'Challan updated',
            'data' => new ChallanResource($challan),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $challan = \App\Models\Challan::findOrFail($id);
        $invoices = $challan->invoices()->get();

        foreach ($invoices as $invoice) {
            if ($invoice->challans()->count() <= 1) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete challan {$challan->challan_number}: invoice {$invoice->invoice_number} contains only this challan.",
                ], 422);
            }
        }

        $challan->items()->delete();
        $challan->delete();

        foreach ($invoices as $invoice) {
            $invoice->challans()->detach($challan->id);
            app(\App\Http\Controllers\InvoiceController::class)->rebuildFromChallans($invoice);
        }

        return response()->json(['success' => true, 'message' => 'Challan deleted']);
    }

    public function updateStatus(Request $request, $id): JsonResponse
    {
        $request->validate(['status' => 'required|in:pending,dispatched,delivered,cancelled']);

        $challan = \App\Models\Challan::findOrFail($id);
        $previousStatus = $challan->status;
        $newStatus = $request->status;

        if ($newStatus === 'cancelled' && $challan->invoices()->exists()) {
            $invoices = $challan->invoices()->get();

            foreach ($invoices as $invoice) {
                if ($invoice->challans()->count() <= 1) {
                    return response()->json([
                        'success' => false,
                        'message' => "Cannot cancel challan {$challan->challan_number}: invoice {$invoice->invoice_number} contains only this challan.",
                    ], 422);
                }
            }

            if (in_array($previousStatus, ['dispatched', 'delivered'], true)) {
                foreach ($challan->items as $item) {
                    \App\Models\ProductMeal::where('id', $item->product_meal_id)
                        ->decrement('delivered_quantity', $item->quantity);
                }
            }

            $challan->update(['status' => $newStatus]);

            foreach ($invoices as $invoice) {
                $invoice->challans()->detach($challan->id);
                app(\App\Http\Controllers\InvoiceController::class)->rebuildFromChallans($invoice);
            }

            return response()->json(['success' => true, 'message' => 'Challan status updated']);
        }

        $wasCounted = in_array($previousStatus, ['dispatched', 'delivered'], true);
        $willBeCounted = in_array($newStatus, ['dispatched', 'delivered'], true);

        if (! $wasCounted && $willBeCounted) {
            foreach ($challan->items as $item) {
                \App\Models\ProductMeal::where('id', $item->product_meal_id)
                    ->increment('delivered_quantity', $item->quantity);
            }
        } elseif ($wasCounted && ! $willBeCounted) {
            foreach ($challan->items as $item) {
                \App\Models\ProductMeal::where('id', $item->product_meal_id)
                    ->decrement('delivered_quantity', $item->quantity);
            }
        }

        $challan->update(['status' => $newStatus]);

        $this->syncLinkedInvoices($challan);

        return response()->json(['success' => true, 'message' => 'Challan status updated']);
    }

    public function print(Request $request, $id)
    {
        $challan = \App\Models\Challan::with([
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

        $challans = \App\Models\Challan::with(['product', 'product.party', 'items.productMeal'])
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
