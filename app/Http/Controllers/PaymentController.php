<?php

namespace App\Http\Controllers;

use App\Models\PaymentHistory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /**
     * List recorded (completed) payments, most recently recorded first.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 25);
        $perPage = in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 25;

        $partyId = $request->integer('party_id');
        $search = trim((string) $request->get('search', ''));
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        $payments = PaymentHistory::query()
            ->with(['invoice.party'])
            ->when($partyId, fn (Builder $query) => $query->whereHas('invoice', fn (Builder $invoice) => $invoice->where('party_id', $partyId)))
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('payment_number', 'like', "%{$search}%")
                        ->orWhere('reference_number', 'like', "%{$search}%")
                        ->orWhereHas('invoice', function (Builder $invoice) use ($search): void {
                            $invoice->where('invoice_number', 'like', "%{$search}%")
                                ->orWhereHas('party', fn (Builder $party) => $party->where('party_name', 'like', "%{$search}%"));
                        });
                });
            })
            ->when($dateFrom, fn (Builder $query) => $query->where('payment_date', '>=', $dateFrom))
            ->when($dateTo, fn (Builder $query) => $query->where('payment_date', '<=', $dateTo))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'items' => collect($payments->items())->map(fn (PaymentHistory $payment): array => [
                    'id' => $payment->id,
                    'payment_number' => $payment->payment_number,
                    'invoice_id' => $payment->invoice_id,
                    'invoice_number' => $payment->invoice->invoice_number ?? '-',
                    'party_name' => $payment->invoice->party->party_name ?? '-',
                    'payment_date' => $payment->payment_date?->format('Y-m-d'),
                    'amount' => (float) $payment->amount,
                    'reduce_amount' => (float) $payment->reduce_amount,
                    'payment_method' => $payment->payment_method,
                    'payment_status' => $payment->payment_status,
                    'reference_number' => $payment->reference_number,
                    'customer_bank_name' => $payment->customer_bank_name,
                    'user_bank_name' => $payment->user_bank_name,
                    'notes' => $payment->notes,
                    'attachment' => $payment->attachment_url,
                ])->values(),
                'total' => $payments->total(),
            ],
        ]);
    }
}
