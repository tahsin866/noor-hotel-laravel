<?php

namespace App\Http\Controllers\reports;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;

class InvoiceReportController extends Controller
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

        $query = Invoice::query()
            ->with(['party', 'items.product', 'challans.product.party'])
            ->orderByDesc('id');

        if ($partyId) {
            $query->where('party_id', $partyId);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('invoices.invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('party', function ($q2) use ($search) {
                        $q2->where('party_name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('items.product', function ($q3) use ($search) {
                        $q3->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%")
                            ->orWhere('customer_po_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($dateFrom) {
            $query->where('date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->where('date', '<=', $dateTo);
        }

        $allInvoices = $query->get();
        $rows = $query->paginate($perPage);

        $mappedRows = collect($rows->items())->map(fn ($invoice) => $this->mapRow($invoice))->values();

        $summary = $this->buildSummary($allInvoices);

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

    private function mapRow(Invoice $invoice): array
    {
        $customerPoNumber = $invoice->items->first()?->product?->customer_po_number ?? null;

        $items = $invoice->items
            ->filter(fn ($item) => (int) $item->quantity > 0)
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_name' => $item->product->name ?? '-',
                    'meal_type' => $item->meal_type ?? '-',
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'vat_rate' => $item->vat_rate,
                    'vat_amount' => $item->vat_amount,
                    'total' => $item->total,
                ];
            })
            ->values();

        $challans = $invoice->challans->map(function ($challan) {
            return [
                'id' => $challan->id,
                'challan_number' => $challan->challan_number,
                'po_number' => $challan->product->code ?? '-',
                'product_name' => $challan->product->name ?? '-',
                'date' => $challan->date,
                'status' => $challan->status,
            ];
        });

        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'date' => $invoice->date?->format('Y-m-d'),
            'due_date' => $invoice->due_date?->format('Y-m-d'),
            'party_id' => $invoice->party_id,
            'party_name' => $invoice->party->party_name ?? '-',
            'address' => $invoice->party->address ?? '-',
            'customer_po_number' => $customerPoNumber,
            'notes' => $invoice->notes,
            'subtotal' => $invoice->subtotal,
            'total_vat' => $invoice->total_vat,
            'total_amount' => $invoice->total_amount,
            'amount_paid' => $invoice->amount_paid,
            'amount_due' => $invoice->amount_due,
            'status' => $invoice->status,
            'items' => $items,
            'challans' => $challans,
        ];
    }

    private function buildSummary($invoices): array
    {
        return [
            'total_invoices' => $invoices->count(),
            'total_amount' => round($invoices->sum('total_amount'), 2),
            'total_paid' => round($invoices->sum('amount_paid'), 2),
            'total_due' => round($invoices->sum('amount_due'), 2),
            'paid_count' => $invoices->where('status', 'paid')->count(),
            'paid_amount' => round($invoices->where('status', 'paid')->sum('total_amount'), 2),
            'partial_count' => $invoices->where('status', 'partial')->count(),
            'partial_amount' => round($invoices->where('status', 'partial')->sum('total_amount'), 2),
            'pending_count' => $invoices->where('status', 'pending')->count(),
            'pending_amount' => round($invoices->where('status', 'pending')->sum('total_amount'), 2),
            'overdue_count' => $invoices->where('status', 'overdue')->count(),
            'overdue_amount' => round($invoices->where('status', 'overdue')->sum('total_amount'), 2),
        ];
    }
}
