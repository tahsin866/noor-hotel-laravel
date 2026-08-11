<?php

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Invoice;
use App\Models\Party;
use App\Models\PaymentHistory;
use App\Models\Product;
use App\Models\ProductMeal;

function createBulkInvoiceChallan(Party $party, int $quantity = 10, float $unitPrice = 100, float $vatRate = 10): Challan
{
    $product = Product::factory()->create([
        'party_id' => $party->id,
        'vat_rate' => $vatRate,
    ]);
    $meal = ProductMeal::factory()->create([
        'product_id' => $product->id,
        'meal_type' => 'lunch',
        'unit_price' => $unitPrice,
    ]);
    $challan = Challan::factory()->create([
        'product_id' => $product->id,
        'status' => 'delivered',
    ]);
    ChallanItem::factory()->create([
        'challan_id' => $challan->id,
        'product_meal_id' => $meal->id,
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
    ]);

    return $challan;
}

test('bulk payment pays multiple invoices in full', function () {
    $party = Party::factory()->create();
    $challan1 = createBulkInvoiceChallan($party, quantity: 10, unitPrice: 100, vatRate: 10);
    $challan2 = createBulkInvoiceChallan($party, quantity: 5, unitPrice: 200, vatRate: 0);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => null,
        'challan_ids' => [$challan1->id],
    ])->assertOk();
    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-11',
        'due_date' => '2026-02-11',
        'notes' => null,
        'challan_ids' => [$challan2->id],
    ])->assertOk();

    $invoices = Invoice::query()->orderBy('id')->get();
    expect($invoices)->toHaveCount(2);

    $response = $this->post('/api/payments/bulk', [
        'invoice_ids' => $invoices->pluck('id')->all(),
        'payment_method' => 'bank_transfer',
        'reference_number' => 'BATCH-001',
        'payment_date' => '2026-03-01',
        'notes' => 'monthly settlement',
        'payment_status' => 'paid',
    ]);

    $response->assertOk();
    expect($response->json('success'))->toBeTrue();
    expect($response->json('message'))->toBe('Payment recorded for 2 invoices');

    foreach ($invoices as $invoice) {
        $invoice->refresh();
        expect($invoice->status)->toBe('paid');
        expect($invoice->amount_paid)->toEqual((float) $invoice->total_amount);
        expect($invoice->amount_due)->toEqual(0.0);
    }

    expect(PaymentHistory::count())->toBe(2);
    PaymentHistory::query()->get()->each(function ($payment) {
        expect($payment->payment_method)->toBe('bank_transfer');
        expect($payment->reference_number)->toBe('BATCH-001');
        expect($payment->payment_date->format('Y-m-d'))->toBe('2026-03-01');
        expect($payment->reduce_amount)->toBeNull();
    });
});

test('bulk payment distributes reduce amount across invoices', function () {
    $party = Party::factory()->create();
    $challan1 = createBulkInvoiceChallan($party, quantity: 10, unitPrice: 100, vatRate: 10);
    $challan2 = createBulkInvoiceChallan($party, quantity: 5, unitPrice: 200, vatRate: 0);

    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-10',
        'due_date' => '2026-02-10',
        'notes' => null,
        'challan_ids' => [$challan1->id],
    ])->assertOk();
    $this->post('/api/invoices', [
        'party_id' => $party->id,
        'date' => '2026-01-11',
        'due_date' => '2026-02-11',
        'notes' => null,
        'challan_ids' => [$challan2->id],
    ])->assertOk();

    $invoices = Invoice::query()->orderBy('id')->get();
    $totalDue = $invoices->sum('amount_due');

    $response = $this->post('/api/payments/bulk', [
        'invoice_ids' => $invoices->pluck('id')->all(),
        'payment_date' => '2026-03-01',
        'reduce_amount' => 100,
        'reduce_note' => 'VAT & Tax',
    ]);

    $response->assertOk();

    $totalPaid = 0;
    $totalReduced = 0;
    foreach ($invoices as $invoice) {
        $invoice->refresh();
        expect($invoice->status)->toBe('paid');
        $totalPaid += (float) $invoice->amount_paid;
        $totalReduced += (float) $invoice->paymentHistory->sum('reduce_amount');
    }

    expect(round($totalPaid + $totalReduced, 2))->toEqual(round($totalDue, 2));
    expect($totalReduced)->toEqual(100.0);
});

test('bulk payment requires at least one invoice', function () {
    $response = $this->post('/api/payments/bulk', [
        'invoice_ids' => [],
        'payment_date' => '2026-03-01',
    ]);

    $response->assertStatus(422);
});

test('bulk payment rejects invoices with no outstanding balance', function () {
    $invoice = Invoice::factory()->create([
        'status' => 'paid',
        'amount_paid' => 100,
        'amount_due' => 0,
    ]);

    $response = $this->post('/api/payments/bulk', [
        'invoice_ids' => [$invoice->id],
        'payment_date' => '2026-03-01',
    ]);

    $response->assertStatus(422);
    expect($response->json('message'))->toBe('Selected invoices have no outstanding balance');
});
