<?php

namespace App\Http\Controllers\reports;

use App\Http\Controllers\Controller;
use App\Models\Challan;
use App\Models\Invoice;
use App\Models\PaymentHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PaymentReportController extends Controller
{
    public function index(Request $request)
    {
        $partyId = $request->get('party_id');
        $method = $request->get('method');
        $status = $request->get('status');
        $search = $request->get('search');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        $perPage = (int) $request->get('per_page', 10);
        $perPage = in_array($perPage, [10, 20, 30, 50, 100, 1000]) ? $perPage : 10;

        $includePayments = $status !== 'unpaid';
        $includeUnpaid = in_array($status, [null, '', 'all', 'unpaid'], true)
            && in_array($method, [null, '', 'all'], true);

        $paymentRows = collect();
        if ($includePayments) {
            $paymentQuery = PaymentHistory::query()
                ->with(['invoice.party'])
                ->orderByDesc('payment_date')
                ->orderByDesc('id');

            if ($partyId) {
                $paymentQuery->whereHas('invoice', fn ($q) => $q->where('party_id', $partyId));
            }

            if ($method && $method !== 'all') {
                $paymentQuery->where('payment_method', $method);
            }

            if ($status && $status !== 'all') {
                $paymentQuery->where('payment_status', $status);
            }

            if ($search) {
                $paymentQuery->where(function ($q) use ($search) {
                    $q->where('payment_history.reference_number', 'like', "%{$search}%")
                        ->orWhere('payment_history.notes', 'like', "%{$search}%")
                        ->orWhereHas('invoice', function ($iq) use ($search) {
                            $iq->where('invoices.invoice_number', 'like', "%{$search}%")
                                ->orWhereHas('party', function ($pq) use ($search) {
                                    $pq->where('party_name', 'like', "%{$search}%");
                                });
                        });
                });
            }

            if ($dateFrom) {
                $paymentQuery->where('payment_date', '>=', $dateFrom);
            }

            if ($dateTo) {
                $paymentQuery->where('payment_date', '<=', $dateTo);
            }

            $paymentRows = $paymentQuery->get()
                ->map(fn ($payment) => $this->mapPaymentRow($payment));
        }

        $unpaidRows = collect();
        if ($includeUnpaid) {
            $unpaidQuery = Invoice::query()
                ->with(['party'])
                ->whereDoesntHave('paymentHistory')
                ->orderByDesc('date')
                ->orderByDesc('id');

            if ($partyId) {
                $unpaidQuery->where('party_id', $partyId);
            }

            if ($search) {
                $unpaidQuery->where(function ($q) use ($search) {
                    $q->where('invoices.invoice_number', 'like', "%{$search}%")
                        ->orWhereHas('party', function ($pq) use ($search) {
                            $pq->where('party_name', 'like', "%{$search}%");
                        });
                });
            }

            if ($dateFrom) {
                $unpaidQuery->where('date', '>=', $dateFrom);
            }

            if ($dateTo) {
                $unpaidQuery->where('date', '<=', $dateTo);
            }

            $unpaidRows = $unpaidQuery->get()
                ->map(fn ($invoice) => $this->mapUnpaidRow($invoice));
        }

        $allRows = $paymentRows
            ->concat($unpaidRows)
            ->sort(fn ($a, $b) => [($b['payment_date'] ?? ''), $b['id']] <=> [($a['payment_date'] ?? ''), $a['id']])
            ->values();

        $chalanTotal = round((float) Challan::query()
            ->when($partyId, fn ($q) => $q->whereHas('product', fn ($pq) => $pq->where('party_id', $partyId)))
            ->sum('total_amount'), 2);

        $paidTotal = round((float) PaymentHistory::query()
            ->when($partyId, fn ($q) => $q->whereHas('invoice', fn ($iq) => $iq->where('party_id', $partyId)))
            ->sum('amount'), 2);

        $summary = $this->buildSummary($paymentRows, $unpaidRows, $chalanTotal, $paidTotal);

        $currentPage = max(1, (int) $request->get('page', 1));
        $pageItems = $allRows->forPage($currentPage, $perPage)->values();
        $lastPage = max(1, (int) ceil($allRows->count() / $perPage));

        return response()->json([
            'success' => true,
            'data' => [
                'rows' => $pageItems,
                'summary' => $summary,
                'pagination' => [
                    'current_page' => $currentPage,
                    'per_page' => $perPage,
                    'total' => $allRows->count(),
                    'last_page' => $lastPage,
                ],
            ],
        ]);
    }

    private function mapPaymentRow(PaymentHistory $payment): array
    {
        return [
            'id' => $payment->id,
            'invoice_id' => $payment->invoice_id,
            'invoice_number' => $payment->invoice->invoice_number ?? '-',
            'party_id' => $payment->invoice->party_id ?? null,
            'party_name' => $payment->invoice->party->party_name ?? '-',
            'payment_date' => $payment->payment_date?->format('Y-m-d'),
            'amount' => $payment->amount,
            'payment_method' => $payment->payment_method,
            'reference_number' => $payment->reference_number,
            'notes' => $payment->notes,
            'payment_status' => $payment->payment_status,
            'invoice_status' => $payment->invoice->status ?? null,
            'customer_bank_name' => $payment->customer_bank_name,
            'user_bank_name' => $payment->user_bank_name,
            'reduce_amount' => $payment->reduce_amount,
            'reduce_note' => $payment->reduce_note,
            'attachment' => $payment->attachment
                ? Storage::disk('public')->url($payment->attachment)
                : null,
            'is_unpaid' => false,
        ];
    }

    private function mapUnpaidRow(Invoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'party_id' => $invoice->party_id,
            'party_name' => $invoice->party->party_name ?? '-',
            'payment_date' => $invoice->date?->format('Y-m-d'),
            'amount' => round((float) $invoice->total_amount - (float) $invoice->amount_paid, 2),
            'payment_method' => null,
            'reference_number' => null,
            'notes' => $invoice->notes,
            'payment_status' => 'unpaid',
            'invoice_status' => $invoice->status,
            'customer_bank_name' => null,
            'user_bank_name' => null,
            'reduce_amount' => null,
            'reduce_note' => null,
            'attachment' => null,
            'is_unpaid' => true,
        ];
    }

    private function buildSummary($payments, $unpaid, float $chalanTotal = 0, float $paidTotal = 0): array
    {
        $unpaidAmount = round($unpaid->sum('amount'), 2);
        $paymentAmount = round($payments->sum('amount'), 2);

        return [
            'total_payments' => $payments->count(),
            'total_amount' => $paymentAmount,
            'total_reduce' => round($payments->sum('reduce_amount'), 2),
            'chalan_total' => $chalanTotal,
            'paid_total' => $paidTotal,
            'due_total' => round($chalanTotal - $paidTotal, 2),
            'unpaid_count' => $unpaid->count(),
            'unpaid_amount' => $unpaidAmount,
            'total_receivable' => round($paymentAmount + $unpaidAmount, 2),
            'cash_count' => $payments->where('payment_method', 'cash')->count(),
            'cash_amount' => round($payments->where('payment_method', 'cash')->sum('amount'), 2),
            'bank_transfer_count' => $payments->where('payment_method', 'bank_transfer')->count(),
            'bank_transfer_amount' => round($payments->where('payment_method', 'bank_transfer')->sum('amount'), 2),
            'cheque_count' => $payments->where('payment_method', 'cheque')->count(),
            'cheque_amount' => round($payments->where('payment_method', 'cheque')->sum('amount'), 2),
            'mobile_count' => $payments->where('payment_method', 'mobile')->count(),
            'mobile_amount' => round($payments->where('payment_method', 'mobile')->sum('amount'), 2),
            'paid_count' => $payments->where('payment_status', 'paid')->count(),
            'paid_amount' => round($payments->where('payment_status', 'paid')->sum('amount'), 2),
            'partial_count' => $payments->where('payment_status', 'partial')->count(),
            'partial_amount' => round($payments->where('payment_status', 'partial')->sum('amount'), 2),
            'due_count' => $payments->where('payment_status', 'due')->count(),
            'due_amount' => round($payments->where('payment_status', 'due')->sum('amount'), 2),
        ];
    }
}
