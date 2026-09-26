<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreInvoiceRequest;
use App\Http\Requests\Api\UpdateInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Services\InvoiceService;
use App\Support\NotifyAdmins;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class InvoiceController extends Controller
{
    public function __construct(private InvoiceService $invoices) {}

    public function index(Request $request): JsonResponse
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 10);
        $status = $request->get('status');
        $partyId = $request->get('party_id');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');
        $search = $request->get('search');

        $filters = [];
        if ($status) {
            $filters['status'] = $status;
        }
        if ($partyId) {
            $filters['party_id'] = $partyId;
        }
        if ($dateFrom) {
            $filters['date'] = ['>=', $dateFrom];
        }
        if ($dateTo) {
            $filters['date'] = ['<=', $dateTo];
        }

        $query = \App\Models\Invoice::with(['party', 'items.product', 'paymentHistory', 'challans'])
            ->orderByDesc('created_at');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('items.product', function ($pq) use ($search) {
                        $pq->where('customer_po_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('party', function ($pq) use ($search) {
                        $pq->where('party_name', 'like', "%{$search}%");
                    });
            });
        }

        $total = $query->count();
        $items = $query->skip(($page - 1) * $limit)->take($limit)->get();

        $items = $items->map(function ($item) {
            $vatReduce = round((float) $item->paymentHistory->sum('reduce_amount'), 2);
            $dueAmount = max(0, round((float) $item->total_amount - (float) $item->amount_paid - $vatReduce, 2));

            return [
                'id' => $item->id,
                'invoice_number' => $item->invoice_number,
                'party_id' => $item->party_id,
                'party_name' => $item->party->party_name ?? '-',
                'customer_po_number' => $item->items->first()?->product?->customer_po_number,
                'date' => $item->date,
                'due_date' => $item->due_date,
                'total_amount' => $item->total_amount,
                'amount_paid' => $item->amount_paid,
                'amount_due' => $item->amount_due,
                'vat_reduce' => $vatReduce,
                'due_amount' => $dueAmount,
                'attachments' => $item->paymentHistory
                    ->filter(fn ($p) => ! empty($p->attachment))
                    ->map(fn ($p) => Storage::disk('public')->url($p->attachment))
                    ->values()
                    ->all(),
                'challan_ids' => $item->challans->pluck('id')->all(),
                'status' => $item->status,
                'print_status' => $item->print_status,
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
        $invoice = \App\Models\Invoice::with([
            'party',
            'items.product',
            'challans.product',
            'challans.product.party',
            'challans.items.productMeal',
            'challans.items.productMeal.product',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new InvoiceResource($invoice),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $invoice = \App\Models\Invoice::findOrFail($id);
        $invoice->items()->delete();
        $invoice->challans()->detach();
        $invoice->paymentHistory()->delete();
        $invoice->delete();

        return response()->json(['success' => true, 'message' => 'Invoice deleted']);
    }

    public function markPrinted($id): JsonResponse
    {
        $invoice = \App\Models\Invoice::findOrFail($id);
        $invoice->update(['print_status' => 'printed']);

        return response()->json(['success' => true, 'message' => 'Invoice marked as printed']);
    }

    public function store(StoreInvoiceRequest $request, InvoiceService $invoiceService): JsonResponse
    {
        $validated = $request->validated();

        $invoice = $invoiceService->createFromChallans(
            $validated['challan_ids'],
            $validated['party_id'],
            $request->user()->id ?? 1,
            $validated['date'],
            $validated['due_date'],
            $validated['notes'] ?? null,
        );

        NotifyAdmins::recordCreated('invoice', [
            'invoice_number' => $invoice->invoice_number,
            'party' => $invoice->party?->party_name,
            'amount' => round($invoice->total_amount, 2),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Invoice created',
            'data' => new InvoiceResource($invoice),
        ]);
    }

    public function update(UpdateInvoiceRequest $request, $id, InvoiceService $invoiceService): JsonResponse
    {
        $validated = $request->validated();
        $invoice = \App\Models\Invoice::findOrFail($id);

        $invoice->update([
            'party_id' => $validated['party_id'],
            'date' => $validated['date'],
            'due_date' => $validated['due_date'],
            'notes' => $validated['notes'] ?? null,
        ]);

        $invoice = $invoiceService->updateFromChallans($invoice, $validated['challan_ids']);

        return response()->json([
            'success' => true,
            'message' => 'Invoice updated',
            'data' => new InvoiceResource($invoice),
        ]);
    }

    public function rebuildFromChallans(\App\Models\Invoice $invoice): void
    {
        $this->invoices->rebuildFromChallans($invoice);
    }

    public function updateStatus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:pending,partial,paid,overdue,cancelled',
            'amount_paid' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string',
            'reference_number' => 'nullable|string',
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'payment_status' => 'nullable|string|in:partial,paid,due',
            'customer_bank_name' => 'nullable|string',
            'user_bank_name' => 'nullable|string',
            'attachment' => 'nullable|file|max:10240',
            'reduce_amount' => 'nullable|numeric|min:0',
            'reduce_note' => 'nullable|string',
        ]);

        $invoice = \App\Models\Invoice::findOrFail($id);
        $status = $request->status;

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('payment-attachments', 'public');
        }

        $reduceAmount = (float) ($request->reduce_amount ?? 0);

        if ($status === 'paid') {
            $paymentAmount = (float) $invoice->amount_due - $reduceAmount;
            if ($paymentAmount < 0) {
                $paymentAmount = 0;
            }
            $amountPaid = (float) $invoice->amount_paid + $paymentAmount;
            $amountDue = (float) $invoice->total_amount - $amountPaid;

            if ($amountDue <= 0) {
                $amountDue = 0;
                $status = 'paid';
            }

            $this->invoices->recordPayment($invoice, array_merge([
                'amount' => $paymentAmount,
                'payment_date' => $request->payment_date ?? now()->format('Y-m-d'),
                'payment_method' => $request->payment_method,
                'reference_number' => $request->reference_number,
                'notes' => $request->notes,
                'payment_status' => $request->payment_status,
                'customer_bank_name' => $request->customer_bank_name,
                'user_bank_name' => $request->user_bank_name,
                'attachment' => $attachmentPath,
                'reduce_amount' => $reduceAmount > 0 ? $reduceAmount : null,
                'reduce_note' => $request->reduce_note,
            ], $request->only([
                'payment_method', 'reference_number', 'notes', 'payment_status',
                'customer_bank_name', 'user_bank_name', 'reduce_note',
            ])));

            NotifyAdmins::recordCreated('payment', [
                'invoice_number' => $invoice->invoice_number,
                'party' => $invoice->party?->party_name,
                'amount' => round($paymentAmount, 2),
            ]);
        } elseif ($status === 'partial') {
            $paymentAmount = (float) ($request->amount_paid ?? 0);
            if ($paymentAmount <= 0) {
                return response()->json(['success' => false, 'message' => 'Payment amount must be greater than 0'], 422);
            }
            $paymentAmount = $paymentAmount - $reduceAmount;
            if ($paymentAmount < 0) {
                $paymentAmount = 0;
            }
            $amountPaid = (float) $invoice->amount_paid + $paymentAmount;
            $amountDue = (float) $invoice->total_amount - $amountPaid;

            if ($amountDue <= 0) {
                $amountDue = 0;
                $status = 'paid';
            } else {
                $status = 'partial';
            }

            $this->invoices->recordPayment($invoice, array_merge([
                'amount' => $paymentAmount,
                'payment_date' => $request->payment_date ?? now()->format('Y-m-d'),
                'payment_method' => $request->payment_method,
                'reference_number' => $request->reference_number,
                'notes' => $request->notes,
                'payment_status' => $request->payment_status,
                'customer_bank_name' => $request->customer_bank_name,
                'user_bank_name' => $request->user_bank_name,
                'attachment' => $attachmentPath,
                'reduce_amount' => $reduceAmount > 0 ? $reduceAmount : null,
                'reduce_note' => $request->reduce_note,
            ], $request->only([
                'payment_method', 'reference_number', 'notes', 'payment_status',
                'customer_bank_name', 'user_bank_name', 'reduce_note',
            ])));

            NotifyAdmins::recordCreated('payment', [
                'invoice_number' => $invoice->invoice_number,
                'party' => $invoice->party?->party_name,
                'amount' => round($paymentAmount, 2),
            ]);
        } elseif ($status === 'pending') {
            $amountPaid = 0;
            $amountDue = (float) $invoice->total_amount;
        }

        $invoice->update([
            'status' => $status,
            'amount_paid' => round($amountPaid ?? 0, 2),
            'amount_due' => round($amountDue ?? 0, 2),
        ]);

        return response()->json(['success' => true, 'message' => 'Payment status updated']);
    }

    public function bulkPayment(Request $request): JsonResponse
    {
        $request->validate([
            'invoice_ids' => 'required|array|min:1',
            'invoice_ids.*' => 'integer|exists:invoices,id',
            'payment_method' => 'nullable|string',
            'reference_number' => 'nullable|string',
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'payment_status' => 'nullable|string|in:partial,paid,due',
            'customer_bank_name' => 'nullable|string',
            'user_bank_name' => 'nullable|string',
            'attachment' => 'nullable|file|max:10240',
            'reduce_amount' => 'nullable|numeric|min:0',
            'reduce_note' => 'nullable|string',
        ]);

        $invoiceIds = array_unique($request->invoice_ids);
        $invoices = \App\Models\Invoice::whereIn('id', $invoiceIds)->get();

        $payable = $invoices->filter(fn ($inv) => (float) $inv->amount_due > 0)->values();

        if ($payable->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Selected invoices have no outstanding balance'], 422);
        }

        $totalDue = $payable->sum(fn ($inv) => (float) $inv->amount_due);
        $reduceTotal = min((float) ($request->reduce_amount ?? 0), $totalDue);
        $lastIndex = $payable->count() - 1;

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('payment-attachments', 'public');
        }

        $processed = 0;
        $targetStatus = $request->payment_status === 'partial' ? 'partial' : 'paid';

        foreach ($payable as $index => $invoice) {
            $due = (float) $invoice->amount_due;

            if ($reduceTotal > 0) {
                $reduceShare = $index === $lastIndex
                    ? round($reduceTotal, 2)
                    : round(($due / $totalDue) * $reduceTotal, 2);
                $reduceTotal = round($reduceTotal - $reduceShare, 2);
            } else {
                $reduceShare = 0;
            }

            $paymentAmount = round(max(0, $due - $reduceShare), 2);
            $amountPaid = round((float) $invoice->amount_paid + $paymentAmount, 2);
            $amountDue = round(max(0, (float) $invoice->total_amount - $amountPaid), 2);

            $this->invoices->recordPayment($invoice, array_merge([
                'amount' => $paymentAmount,
                'reduce_amount' => $reduceShare > 0 ? $reduceShare : null,
                'payment_date' => $request->payment_date ?? now()->format('Y-m-d'),
                'payment_method' => $request->payment_method,
                'reference_number' => $request->reference_number,
                'notes' => $request->notes,
                'payment_status' => $request->payment_status,
                'customer_bank_name' => $request->customer_bank_name,
                'user_bank_name' => $request->user_bank_name,
                'attachment' => $attachmentPath,
                'reduce_note' => $request->reduce_note,
            ], $request->only([
                'payment_method', 'reference_number', 'notes', 'payment_status',
                'customer_bank_name', 'user_bank_name', 'reduce_note',
            ])));

            NotifyAdmins::recordCreated('payment', [
                'invoice_number' => $invoice->invoice_number,
                'party' => $invoice->party?->party_name,
                'amount' => round($paymentAmount, 2),
            ]);

            $invoice->update([
                'status' => $targetStatus,
                'amount_paid' => $amountPaid,
                'amount_due' => $amountDue,
            ]);

            $processed++;
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment recorded for '.$processed.' invoice'.($processed === 1 ? '' : 's'),
        ]);
    }

    public function paymentHistory($id): JsonResponse
    {
        $invoice = \App\Models\Invoice::with(['party', 'paymentHistory'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'invoice' => [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'party_name' => $invoice->party->party_name ?? '-',
                    'total_amount' => $invoice->total_amount,
                    'amount_paid' => $invoice->amount_paid,
                    'amount_due' => $invoice->amount_due,
                    'status' => $invoice->status,
                ],
                'payments' => $invoice->paymentHistory->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'amount' => $p->amount,
                        'payment_date' => $p->payment_date,
                        'payment_method' => $p->payment_method,
                        'reference_number' => $p->reference_number,
                        'notes' => $p->notes,
                        'payment_status' => $p->payment_status,
                        'customer_bank_name' => $p->customer_bank_name,
                        'user_bank_name' => $p->user_bank_name,
                        'attachment' => $p->attachment ? Storage::disk('public')->url($p->attachment) : null,
                        'reduce_amount' => $p->reduce_amount,
                        'reduce_note' => $p->reduce_note,
                    ];
                }),
            ],
        ]);
    }

    public function report(Request $request): JsonResponse
    {
        $partyId = $request->get('party_id');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');
        $status = $request->get('status');

        $query = \App\Models\Invoice::with(['party', 'paymentHistory'])
            ->orderByDesc('created_at');

        if ($partyId) {
            $query->where('party_id', $partyId);
        }
        if ($status) {
            $query->where('status', $status);
        }
        if ($dateFrom) {
            $query->where('date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->where('date', '<=', $dateTo);
        }

        $invoices = $query->get();

        $report = $invoices->map(function ($inv) {
            $payments = $inv->paymentHistory->map(function ($p) {
                return [
                    'date' => $p->payment_date->format('d/m/Y'),
                    'amount' => $p->amount,
                    'method' => $p->payment_method ?? '-',
                    'reference' => $p->reference_number ?? '-',
                ];
            });

            return [
                'invoice_number' => $inv->invoice_number,
                'party_name' => $inv->party->party_name ?? '-',
                'date' => $inv->date->format('d/m/Y'),
                'due_date' => $inv->due_date->format('d/m/Y'),
                'total_amount' => $inv->total_amount,
                'amount_paid' => $inv->amount_paid,
                'amount_due' => $inv->amount_due,
                'status' => $inv->status,
                'payments' => $payments,
            ];
        });

        $summary = [
            'total_invoices' => $invoices->count(),
            'total_amount' => $invoices->sum('total_amount'),
            'total_paid' => $invoices->sum('amount_paid'),
            'total_due' => $invoices->sum('amount_due'),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'invoices' => $report,
                'summary' => $summary,
            ],
        ]);
    }

    public function print(Request $request, $id)
    {
        $invoice = \App\Models\Invoice::with([
            'party',
            'items.product',
            'challans.product',
            'challans.items.productMeal.product',
        ])->findOrFail($id);

        $items = $invoice->items->map(function ($item) {
            return [
                'product_name' => $item->product->name ?? '-',
                'description' => $item->description
                    ?? $item->product->name
                    ?? '-',
                'meal_type' => $item->meal_type,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'vat_rate' => (float) $item->vat_rate,
                'vat_amount' => (float) $item->vat_amount,
                'total' => (float) $item->total,
            ];
        })->all();

        $challans = $invoice->challans->map(function ($ch) {
            $challanItems = $ch->items->map(function ($ci) {
                return [
                    'meal_type' => $ci->productMeal->meal_type ?? '-',
                    'quantity' => $ci->quantity,
                    'description' => $ci->productMeal->description ?? '-',
                ];
            });

            return [
                'challan_number' => $ch->challan_number,
                'product_name' => $ch->product->name ?? '-',
                'date' => \Carbon\Carbon::parse($ch->date)->format('d/m/Y'),
                'items' => $challanItems,
            ];
        });

        $totalInWords = $this->numberToWords($invoice->total_amount);

        $customerPoNumber = $invoice->items->first()?->product->customer_po_number ?? null;

        $data = [
            'invoice' => $invoice,
            'party_name' => $invoice->party->party_name ?? '-',
            'party_address' => $invoice->party->address ?? '',
            'items' => $items,
            'challans' => $challans,
            'total_in_words' => $totalInWords,
            'customer_po_number' => $customerPoNumber,
        ];

        if ($request->query('download') === '1') {
            $pdf = Pdf::loadView('pdf.invoice', $data);
            $pdf->setPaper('a4');
            $pdf->setOption('margin-top', 10);
            $pdf->setOption('margin-bottom', 10);
            $pdf->setOption('margin-left', 10);
            $pdf->setOption('margin-right', 10);

            return $pdf->download(str_replace('/', '-', $invoice->invoice_number).'.pdf');
        }

        $pdf = Pdf::loadView('pdf.invoice', $data);
        $pdf->setPaper('a4');
        $pdf->setOption('margin-top', 10);
        $pdf->setOption('margin-bottom', 10);
        $pdf->setOption('margin-left', 10);
        $pdf->setOption('margin-right', 10);

        return $pdf->stream(str_replace('/', '-', $invoice->invoice_number).'.pdf');
    }

    private function numberToWords(float $amount): string
    {
        $whole = (int) floor($amount);
        $decimal = (int) round(($amount - $whole) * 100);

        if ($whole === 0) {
            $words = 'Zero';
        } else {
            $words = '';
            if ($whole >= 10000000) {
                $words .= $this->chunkToWords((int) floor($whole / 10000000)).' Crore ';
                $whole %= 10000000;
            }
            if ($whole >= 100000) {
                $words .= $this->chunkToWords((int) floor($whole / 100000)).' Lakh ';
                $whole %= 100000;
            }
            if ($whole >= 1000) {
                $words .= $this->chunkToWords((int) floor($whole / 1000)).' Thousand ';
                $whole %= 1000;
            }
            if ($whole >= 100) {
                $words .= $this->chunkToWords((int) floor($whole / 100)).' Hundred ';
                $whole %= 100;
            }
            if ($whole >= 20) {
                $words .= $this->getTens((int) floor($whole / 10)).' ';
                $whole %= 10;
            }
            if ($whole > 0) {
                $words .= $this->getOnes($whole).' ';
            }
            $words = trim($words).' Taka';
        }

        if ($decimal > 0) {
            $decimalWords = '';
            if ($decimal >= 20) {
                $decimalWords .= $this->getTens((int) floor($decimal / 10)).' ';
                $decimal %= 10;
            }
            if ($decimal > 0) {
                $decimalWords .= $this->getOnes($decimal);
            }
            $words .= ' and '.trim($decimalWords).' Paisa';
        }

        $words .= ' Only';

        return $words;
    }

    private function getOnes(int $n): string
    {
        $ones = [
            '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen',
        ];

        return $ones[$n] ?? '';
    }

    private function getTens(int $n): string
    {
        $tens = [
            '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
        ];

        return $tens[$n] ?? '';
    }

    private function chunkToWords(int $n): string
    {
        $result = '';
        if ($n >= 20) {
            $result .= $this->getTens((int) floor($n / 10)).' ';
            $n %= 10;
        }
        if ($n > 0) {
            $result .= $this->getOnes($n);
        }

        return trim($result);
    }
}
