<?php

namespace App\Services;

use App\Contracts\InvoiceRepositoryInterface;
use App\Exceptions\Domain\InvalidOperationException;
use App\Models\Challan;
use App\Models\Invoice;
use App\Models\PaymentHistory;
use App\ValueObjects\InvoiceNumber;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function __construct(
        private InvoiceRepositoryInterface $invoices,
        private ChallanService $challanService,
    ) {}

    public function createFromChallans(array $challanIds, int $partyId, int $userId, string $date, string $dueDate, ?string $notes): Invoice
    {
        $challans = Challan::with(['product', 'product.party', 'items.productMeal.product'])
            ->whereIn('id', $challanIds)
            ->get();

        if ($challans->isEmpty()) {
            throw new InvalidOperationException('No valid challans found.');
        }

        $built = $this->buildItemsFromChallans($challans);
        $totalAmount = $built['total_amount'];

        $invoice = $this->invoices->create([
            'invoice_number' => (string) InvoiceNumber::from($this->generateNumber()),
            'party_id' => $partyId,
            'user_id' => $userId,
            'date' => $date,
            'due_date' => $dueDate,
            'subtotal' => round($built['subtotal'], 2),
            'total_vat' => round($built['total_vat'], 2),
            'total_amount' => round($totalAmount, 2),
            'amount_paid' => 0,
            'amount_due' => round($totalAmount, 2),
            'notes' => $notes,
            'status' => 'pending',
        ]);

        foreach ($built['items'] as $item) {
            $invoice->items()->create($item);
        }

        $invoice->challans()->attach($challanIds);

        return $invoice->load(['party', 'items.product', 'challans', 'paymentHistory']);
    }

    public function updateFromChallans(Invoice $invoice, array $challanIds): Invoice
    {
        $challans = Challan::with(['product', 'product.party', 'items.productMeal.product'])
            ->whereIn('id', $challanIds)
            ->get();

        if ($challans->isEmpty()) {
            throw new InvalidOperationException('No valid challans found.');
        }

        $built = $this->buildItemsFromChallans($challans);
        $totalAmount = $built['total_amount'];

        $amountPaid = min((float) $invoice->amount_paid, $totalAmount);
        $amountDue = round(max(0, $totalAmount - $amountPaid), 2);

        if ($amountDue <= 0) {
            $status = 'paid';
        } elseif ($amountPaid > 0) {
            $status = 'partial';
        } else {
            $status = 'pending';
        }

        $updated = $this->invoices->update($invoice, [
            'subtotal' => round($built['subtotal'], 2),
            'total_vat' => round($built['total_vat'], 2),
            'total_amount' => round($totalAmount, 2),
            'amount_paid' => round($amountPaid, 2),
            'amount_due' => $amountDue,
            'status' => $status,
        ]);

        $updated->items()->delete();
        foreach ($built['items'] as $item) {
            $updated->items()->create($item);
        }

        $updated->challans()->sync($challanIds);

        return $updated;
    }

    public function rebuildFromChallans(Invoice $invoice): Invoice
    {
        $challans = $invoice->challans()
            ->with(['product', 'product.party', 'items.productMeal.product'])
            ->get();

        if ($challans->isEmpty()) {
            return $invoice;
        }

        $built = $this->buildItemsFromChallans($challans);
        $totalAmount = $built['total_amount'];

        $amountPaid = min((float) $invoice->amount_paid, $totalAmount);
        $amountDue = round(max(0, $totalAmount - $amountPaid), 2);

        if ($amountDue <= 0) {
            $status = 'paid';
        } elseif ($amountPaid > 0) {
            $status = 'partial';
        } else {
            $status = 'pending';
        }

        $updated = $this->invoices->update($invoice, [
            'subtotal' => round($built['subtotal'], 2),
            'total_vat' => round($built['total_vat'], 2),
            'total_amount' => round($totalAmount, 2),
            'amount_paid' => round($amountPaid, 2),
            'amount_due' => $amountDue,
            'status' => $status,
        ]);

        $updated->items()->delete();
        foreach ($built['items'] as $item) {
            $updated->items()->create($item);
        }

        return $updated;
    }

    public function recordPayment(Invoice $invoice, array $paymentData): PaymentHistory
    {
        $amount = (float) $paymentData['amount'];
        $reduceAmount = (float) ($paymentData['reduce_amount'] ?? 0);

        $paymentAmount = max(0, $amount - $reduceAmount);
        $newAmountPaid = (float) $invoice->amount_paid + $paymentAmount;
        $newAmountDue = round(max(0, (float) $invoice->total_amount - $newAmountPaid), 2);

        if ($newAmountDue <= 0) {
            $status = 'paid';
        } elseif ($newAmountPaid > 0) {
            $status = 'partial';
        } else {
            $status = 'pending';
        }

        $payment = PaymentHistory::create(array_merge([
            'invoice_id' => $invoice->id,
            'amount' => $paymentAmount,
            'payment_date' => $paymentData['payment_date'] ?? now()->format('Y-m-d'),
        ], $paymentData));

        $this->invoices->update($invoice, [
            'status' => $status,
            'amount_paid' => round($newAmountPaid, 2),
            'amount_due' => $newAmountDue,
        ]);

        return $payment;
    }

    private function buildItemsFromChallans($challans): array
    {
        $subtotal = 0;
        $totalVat = 0;
        $grouped = [];

        foreach ($challans as $challan) {
            foreach ($challan->items as $ci) {
                $productId = $ci->productMeal->product->id ?? null;
                if (!$productId) {
                    continue;
                }

                $unitPrice = (float) $ci->unit_price;
                $vatRate = (float) ($ci->productMeal->product->vat_rate ?? 10);
                $description = $ci->productMeal->description
                    ?? $ci->productMeal->product->name
                    ?? '-';
                $mealType = $ci->productMeal->meal_type ?? null;

                $key = implode('|', [$productId, $description, (string) $mealType, (string) $unitPrice, (string) $vatRate]);

                if (isset($grouped[$key])) {
                    $grouped[$key]['quantity'] += (int) $ci->quantity;
                    continue;
                }

                $grouped[$key] = [
                    'product_id' => $productId,
                    'description' => $description,
                    'meal_type' => $mealType,
                    'quantity' => (int) $ci->quantity,
                    'unit_price' => $unitPrice,
                    'vat_rate' => $vatRate,
                ];
            }
        }

        $items = [];
        foreach ($grouped as $g) {
            $lineSubtotal = $g['quantity'] * $g['unit_price'];
            $vatAmount = round($lineSubtotal * $g['vat_rate'] / 100, 2);

            $g['vat_amount'] = $vatAmount;
            $g['total'] = $lineSubtotal + $vatAmount;

            $items[] = $g;
            $subtotal += $lineSubtotal;
            $totalVat += $vatAmount;
        }

        return [
            'subtotal' => $subtotal,
            'total_vat' => $totalVat,
            'total_amount' => $subtotal + $totalVat,
            'items' => $items,
        ];
    }

    private function generateNumber(): string
    {
        $year = now()->year;
        $prefix = "Noor/{$year}/IN/";

        $last = DB::select(
            'SELECT MAX(CAST(SUBSTR(invoice_number, ?) AS INTEGER)) as max_num FROM invoices WHERE invoice_number LIKE ?',
            [strlen($prefix) + 1, $prefix.'%']
        );

        $next = max(($last[0]->max_num ?? 0) + 1, 450);

        return $prefix.str_pad($next, 4, '0', STR_PAD_LEFT);
    }
}
