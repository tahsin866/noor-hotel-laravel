<?php

use App\Models\Invoice;
use App\Models\Party;
use App\Models\PaymentHistory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
});

function createPayableInvoice(string $partyName = 'Alpha Traders'): Invoice
{
    $party = Party::factory()->create(['party_name' => $partyName]);

    return Invoice::factory()->create([
        'party_id' => $party->id,
        'total_amount' => 1000,
        'amount_paid' => 0,
        'amount_due' => 1000,
        'status' => 'pending',
    ]);
}

test('each payment gets its own sequential payment serial number', function () {
    $year = now()->year;

    $first = PaymentHistory::factory()->create();
    $second = PaymentHistory::factory()->create();

    expect($first->payment_number)->toBe("Noor/{$year}/PAY/0001");
    expect($second->payment_number)->toBe("Noor/{$year}/PAY/0002");
});

test('payment serial keeps counting after a payment is soft deleted', function () {
    $year = now()->year;

    PaymentHistory::factory()->create();
    PaymentHistory::factory()->create()->delete();

    expect(PaymentHistory::factory()->create()->payment_number)->toBe("Noor/{$year}/PAY/0003");
});

test('recording a payment with an attachment exposes a working attachment link', function () {
    $invoice = createPayableInvoice();

    $this->patch("/api/invoices/{$invoice->id}/status", [
        'status' => 'paid',
        'amount_paid' => 1000,
        'payment_method' => 'cash',
        'payment_date' => '2026-03-01',
        'attachment' => UploadedFile::fake()->create('receipt.pdf', 20, 'application/pdf'),
    ])->assertOk();

    $payment = PaymentHistory::query()->sole();
    expect($payment->payment_number)->not->toBeNull();

    $listed = $this->getJson('/api/payments')->assertOk()->json('data.items.0');

    expect($listed['payment_number'])->toBe($payment->payment_number);
    expect($listed['invoice_number'])->toBe($invoice->invoice_number);
    expect($listed['attachment'])->toBe(route('attachments.payment', ['path' => basename($payment->attachment)]));

    $this->get($listed['attachment'])->assertOk();

    $invoiceAttachments = collect($this->getJson('/api/invoices')->json('data.items'))
        ->firstWhere('id', $invoice->id)['attachments'];
    expect($invoiceAttachments)->toBe([$listed['attachment']]);

    $history = $this->getJson("/api/invoices/{$invoice->id}/payment-history")->json('data.payments.0');
    expect($history['attachment'])->toBe($listed['attachment']);
    expect($history['payment_number'])->toBe($payment->payment_number);
});

test('payments list only contains recorded payments, not unpaid invoices', function () {
    createPayableInvoice('Unpaid Party');
    $paidInvoice = createPayableInvoice('Paid Party');
    PaymentHistory::factory()->create(['invoice_id' => $paidInvoice->id, 'amount' => 400]);

    $response = $this->getJson('/api/payments')->assertOk();

    expect($response->json('data.total'))->toBe(1);
    expect($response->json('data.items.0.party_name'))->toBe('Paid Party');
    expect($response->json('data.items.0.amount'))->toBeNumeric()->not->toBeString();
});

test('payments list filters by party, payment number and date range', function () {
    $alpha = createPayableInvoice('Alpha Traders');
    $beta = createPayableInvoice('Beta Supplies');

    $march = PaymentHistory::factory()->create(['invoice_id' => $alpha->id, 'payment_date' => '2026-03-05']);
    PaymentHistory::factory()->create(['invoice_id' => $beta->id, 'payment_date' => '2026-04-10']);

    expect($this->getJson("/api/payments?party_id={$alpha->party_id}")->json('data.items.*.id'))->toBe([$march->id]);
    expect($this->getJson('/api/payments?search='.urlencode($march->payment_number))->json('data.items.*.id'))->toBe([$march->id]);
    expect($this->getJson('/api/payments?date_from=2026-03-01&date_to=2026-03-31')->json('data.items.*.id'))->toBe([$march->id]);
});

test('payment report rows carry the payment serial number', function () {
    $invoice = createPayableInvoice();
    $payment = PaymentHistory::factory()->create(['invoice_id' => $invoice->id]);

    $row = collect($this->getJson('/api/reports/payment')->json('data.rows'))
        ->firstWhere('is_unpaid', false);

    expect($row['payment_number'])->toBe($payment->payment_number);
});

test('payments list shows the most recently recorded payment first', function () {
    $invoice = createPayableInvoice();

    $olderEntry = PaymentHistory::factory()->create([
        'invoice_id' => $invoice->id,
        'payment_date' => '2026-05-20',
        'created_at' => now()->subDay(),
    ]);
    $latestEntry = PaymentHistory::factory()->create([
        'invoice_id' => $invoice->id,
        'payment_date' => '2026-01-01',
        'created_at' => now(),
    ]);

    expect($this->getJson('/api/payments')->json('data.items.*.id'))->toBe([$latestEntry->id, $olderEntry->id]);
});

test('invoice list on the payments page filters by a from and to date', function () {
    $party = Party::factory()->create();
    $inRange = Invoice::factory()->create(['party_id' => $party->id, 'date' => '2026-03-15']);
    Invoice::factory()->create(['party_id' => $party->id, 'date' => '2026-02-01']);
    Invoice::factory()->create(['party_id' => $party->id, 'date' => '2026-04-20']);

    $ids = collect($this->getJson('/api/invoices?date_from=2026-03-01&date_to=2026-03-31')->json('data.items'))
        ->pluck('id')
        ->all();

    expect($ids)->toBe([$inRange->id]);
});

test('invoice list shows the most recently created invoice first', function () {
    $older = Invoice::factory()->create(['created_at' => now()->subDays(2)]);
    $latest = Invoice::factory()->create(['created_at' => now()]);

    expect(collect($this->getJson('/api/invoices')->json('data.items'))->pluck('id')->all())
        ->toBe([$latest->id, $older->id]);
});
