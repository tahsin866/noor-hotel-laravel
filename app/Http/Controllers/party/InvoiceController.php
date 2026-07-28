<?php

namespace App\Http\Controllers\party;

use App\Http\Controllers\Controller;
use App\Models\Challan;
use App\Models\Invoice;
use App\Models\PaymentHistory;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 10);
        $status = $request->get('status');
        $partyId = $request->get('party_id');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        $query = Invoice::with(['party'])
            ->orderByDesc('created_at');

        if ($status) {
            $query->where('status', $status);
        }
        if ($partyId) {
            $query->where('party_id', $partyId);
        }
        if ($dateFrom) {
            $query->where('date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->where('date', '<=', $dateTo);
        }

        $total = $query->count();
        $items = $query->skip(($page - 1) * $limit)->take($limit)->get();

        $items = $items->map(function ($item) {
            return [
                'id' => $item->id,
                'invoice_number' => $item->invoice_number,
                'party_id' => $item->party_id,
                'party_name' => $item->party->party_name ?? '-',
                'date' => $item->date,
                'due_date' => $item->due_date,
                'total_amount' => $item->total_amount,
                'amount_paid' => $item->amount_paid,
                'amount_due' => $item->amount_due,
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
        $invoice = Invoice::with([
            'party',
            'items.product',
            'challans.product',
            'challans.product.party',
            'challans.items.productMeal',
        ])->findOrFail($id);

        $items = $invoice->items->map(function ($item) {
            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product->name ?? '-',
                'meal_type' => $item->meal_type,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'vat_rate' => $item->vat_rate,
                'vat_amount' => $item->vat_amount,
                'total' => $item->total,
            ];
        });

        $challans = $invoice->challans->map(function ($ch) {
            $challanItems = $ch->items->map(function ($ci) {
                return [
                    'meal_type' => $ci->productMeal->meal_type ?? '-',
                    'quantity' => $ci->quantity,
                    'description' => $ci->productMeal->description ?? '-',
                ];
            });

            return [
                'id' => $ch->id,
                'challan_number' => $ch->challan_number,
                'product_name' => $ch->product->name ?? '-',
                'po_number' => $ch->product->code ?? '-',
                'party_name' => $ch->product->party->party_name ?? '-',
                'challan_date' => $ch->date,
                'challan_status' => $ch->status,
                'items' => $challanItems,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'party_id' => $invoice->party_id,
                'party_name' => $invoice->party->party_name ?? '-',
                'date' => $invoice->date,
                'due_date' => $invoice->due_date,
                'subtotal' => $invoice->subtotal,
                'total_vat' => $invoice->total_vat,
                'total_amount' => $invoice->total_amount,
                'amount_paid' => $invoice->amount_paid,
                'amount_due' => $invoice->amount_due,
                'status' => $invoice->status,
                'notes' => $invoice->notes,
                'items' => $items,
                'challans' => $challans,
            ],
        ]);
    }

    public function destroy($id)
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->items()->delete();
        $invoice->challans()->detach();
        $invoice->paymentHistory()->delete();
        $invoice->delete();

        return response()->json(['success' => true, 'message' => 'Invoice deleted']);
    }

    public function store(Request $request)
    {
        $request->validate([
            'party_id' => 'required|exists:parties,id',
            'date' => 'required|date',
            'due_date' => 'required|date',
            'notes' => 'nullable|string',
            'challan_ids' => 'required|array|min:1',
            'challan_ids.*' => 'exists:challans,id',
        ]);

        $challanIds = $request->challan_ids;
        $challans = Challan::with(['product', 'product.party', 'items.productMeal.product'])
            ->whereIn('id', $challanIds)
            ->get();

        if ($challans->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No valid challans found'], 422);
        }

        $subtotal = 0;
        $totalVat = 0;
        $invItems = [];

        foreach ($challans as $challan) {
            foreach ($challan->items as $ci) {
                $productId = $ci->productMeal->product->id ?? null;
                if (! $productId) {
                    continue;
                }

                $mealType = $ci->productMeal->meal_type ?? null;
                $unitPrice = (float) $ci->unit_price;
                $vatRate = (float) ($ci->productMeal->product->vat_rate ?? 10);
                $quantity = (int) $ci->quantity;

                $lineSubtotal = $quantity * $unitPrice;
                $vatAmount = round($lineSubtotal * $vatRate / 100, 2);
                $lineTotal = $lineSubtotal + $vatAmount;
                $subtotal += $lineSubtotal;
                $totalVat += $vatAmount;

                $invItems[] = [
                    'product_id' => $productId,
                    'meal_type' => $mealType,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'vat_rate' => $vatRate,
                    'vat_amount' => $vatAmount,
                    'total' => $lineTotal,
                ];
            }
        }

        $totalAmount = $subtotal + $totalVat;

        $invoice = Invoice::create([
            'party_id' => $request->party_id,
            'user_id' => $request->user()->id ?? 1,
            'date' => $request->date,
            'due_date' => $request->due_date,
            'subtotal' => round($subtotal, 2),
            'total_vat' => round($totalVat, 2),
            'total_amount' => round($totalAmount, 2),
            'amount_paid' => 0,
            'amount_due' => round($totalAmount, 2),
            'notes' => $request->notes,
        ]);

        foreach ($invItems as $item) {
            $invoice->items()->create($item);
        }

        $invoice->challans()->attach($challanIds);

        return response()->json(['success' => true, 'message' => 'Invoice created']);
    }

    public function updateStatus(Request $request, $id)
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
        ]);

        $invoice = Invoice::findOrFail($id);
        $status = $request->status;
        $amountPaid = (float) $invoice->amount_paid;
        $amountDue = (float) $invoice->amount_due;

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('payment-attachments', 'public');
        }

        $commonFields = [
            'payment_status' => $request->payment_status,
            'customer_bank_name' => $request->customer_bank_name,
            'user_bank_name' => $request->user_bank_name,
            'attachment' => $attachmentPath,
        ];

        if ($status === 'paid') {
            $paymentAmount = (float) $invoice->amount_due;
            $amountPaid = (float) $invoice->total_amount;
            $amountDue = 0;

            PaymentHistory::create(array_merge([
                'invoice_id' => $invoice->id,
                'amount' => $paymentAmount,
                'payment_date' => $request->payment_date ?? now()->format('Y-m-d'),
                'payment_method' => $request->payment_method,
                'reference_number' => $request->reference_number,
                'notes' => $request->notes,
            ], $commonFields));
        } elseif ($status === 'partial') {
            $paymentAmount = (float) ($request->amount_paid ?? 0);
            if ($paymentAmount <= 0) {
                return response()->json(['success' => false, 'message' => 'Payment amount must be greater than 0'], 422);
            }
            $amountPaid = (float) $invoice->amount_paid + $paymentAmount;
            $amountDue = (float) $invoice->total_amount - $amountPaid;

            if ($amountPaid >= (float) $invoice->total_amount) {
                $amountPaid = (float) $invoice->total_amount;
                $amountDue = 0;
                $status = 'paid';
            } else {
                $status = 'partial';
            }

            PaymentHistory::create(array_merge([
                'invoice_id' => $invoice->id,
                'amount' => $paymentAmount,
                'payment_date' => $request->payment_date ?? now()->format('Y-m-d'),
                'payment_method' => $request->payment_method,
                'reference_number' => $request->reference_number,
                'notes' => $request->notes,
            ], $commonFields));
        } elseif ($status === 'pending') {
            $amountPaid = 0;
            $amountDue = (float) $invoice->total_amount;
        }

        $invoice->update([
            'status' => $status,
            'amount_paid' => round($amountPaid, 2),
            'amount_due' => round($amountDue, 2),
        ]);

        return response()->json(['success' => true, 'message' => 'Payment status updated']);
    }

    public function paymentHistory($id)
    {
        $invoice = Invoice::with(['party', 'paymentHistory'])->findOrFail($id);

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
                    ];
                }),
            ],
        ]);
    }

    public function report(Request $request)
    {
        $partyId = $request->get('party_id');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');
        $status = $request->get('status');

        $query = Invoice::with(['party', 'paymentHistory'])
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
        $invoice = Invoice::with([
            'party',
            'items.product',
            'challans.product',
            'challans.items.productMeal.product',
        ])->findOrFail($id);

        $descMap = [];
        foreach ($invoice->challans as $challan) {
            foreach ($challan->items as $ci) {
                $pm = $ci->productMeal;
                if (! $pm) {
                    continue;
                }
                $dKey = ($pm->product_id ?? '').'_'.$pm->meal_type.'_'.rtrim(rtrim(number_format((float) $ci->unit_price, 2, '.', ''), '0'), '.');
                if (! isset($descMap[$dKey])) {
                    $descMap[$dKey] = $pm->description ?? $pm->product->name ?? '-';
                }
            }
        }

        $grouped = [];
        foreach ($invoice->items as $item) {
            $key = $item->product_id.'_'.$item->meal_type.'_'.rtrim(rtrim(number_format((float) $item->unit_price, 2, '.', ''), '0'), '.');

            if (! isset($grouped[$key])) {
                $description = $descMap[$key] ?? ($item->product->name ?? '-');
                $grouped[$key] = [
                    'product_name' => $item->product->name ?? '-',
                    'description' => $description,
                    'meal_type' => $item->meal_type,
                    'quantity' => 0,
                    'unit_price' => (float) $item->unit_price,
                    'vat_rate' => (float) $item->vat_rate,
                    'vat_amount' => 0,
                    'total' => 0,
                ];
            }

            $grouped[$key]['quantity'] += (int) $item->quantity;
            $grouped[$key]['vat_amount'] += (float) $item->vat_amount;
            $grouped[$key]['total'] += (float) $item->total;
        }

        $items = array_values($grouped);

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
                'date' => Carbon::parse($ch->date)->format('d/m/Y'),
                'items' => $challanItems,
            ];
        });

        $totalInWords = $this->numberToWords($invoice->total_amount);

        $customerPoNumber = $invoice->items->first()?->product->customer_po_number ?? '-';

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

            return $pdf->download(str_replace('/', '-', $invoice->invoice_number).'.pdf');
        }

        $pdf = Pdf::loadView('pdf.invoice', $data);
        $pdf->setPaper('a4');

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
