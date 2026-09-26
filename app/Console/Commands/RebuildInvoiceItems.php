<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Services\InvoiceService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('invoices:rebuild-items {--invoice= : Only rebuild this invoice number} {--apply : Persist the rebuilt items and totals}')]
#[Description('Rebuild invoice items from their challans using the current purchase order prices')]
class RebuildInvoiceItems extends Command
{
    public function __construct(private InvoiceService $invoiceService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $query = Invoice::query()->whereNull('deleted_at')->whereHas('challans');

        if ($invoiceNumber = $this->option('invoice')) {
            $query->where('invoice_number', $invoiceNumber);
        }

        $changed = 0;
        $moneyChanged = 0;
        $netDelta = 0.0;

        foreach ($query->orderBy('id')->cursor() as $invoice) {
            $invoice->load(['items', 'challans.items.productMeal']);

            $rebuilt = $this->invoiceService->buildItemsPreview($invoice->challans);

            if ($this->isUnchanged($invoice, $rebuilt)) {
                continue;
            }

            $changed++;

            $currentTotal = round((float) $invoice->total_amount, 2);
            $rebuiltTotal = round((float) $rebuilt['total_amount'], 2);

            if ($currentTotal !== $rebuiltTotal) {
                $moneyChanged++;
                $netDelta += $rebuiltTotal - $currentTotal;
            }

            $this->line("<comment>{$invoice->invoice_number}</comment>");
            $this->line(sprintf(
                '  total: %s -> %s (amount due %s -> %s)',
                $this->money($currentTotal),
                $this->money($rebuiltTotal),
                $this->money((float) $invoice->amount_due),
                $this->money(max(0, $rebuiltTotal - (float) $invoice->amount_paid)),
            ));
            $this->line(sprintf('  items: %d -> %d', $invoice->items->count(), count($rebuilt['items'])));

            foreach ($this->itemDiffs($invoice, $rebuilt['items']) as $diff) {
                $this->line('  '.$diff);
            }

            if ($apply) {
                $this->invoiceService->rebuildFromChallans($invoice);
            }
        }

        if ($changed === 0) {
            $this->info('All invoices already match their purchase order prices.');

            return self::SUCCESS;
        }

        $this->newLine();
        $this->line(sprintf(
            '%d invoice(s) affected: %d with a total change, net %s.',
            $changed,
            $moneyChanged,
            $netDelta >= 0 ? '+'.$this->money($netDelta) : '-'.$this->money(abs($netDelta)),
        ));
        $this->info($apply
            ? "Rebuilt {$changed} invoice(s)."
            : "{$changed} invoice(s) would change. Re-run with --apply to persist.");

        return self::SUCCESS;
    }

    /**
     * @param  array{items: array<int, array<string, mixed>>, subtotal: float, total_vat: float, total_amount: float}  $rebuilt
     * @return array<int, string>
     */
    private function itemDiffs(Invoice $invoice, array $rebuiltItems): array
    {
        $current = [];

        foreach ($invoice->items as $item) {
            $current[$this->key($item->description, $item->meal_type)] = $item;
        }

        $diffs = [];

        foreach ($rebuiltItems as $item) {
            $key = $this->key($item['description'], $item['meal_type']);
            $existing = $current[$key] ?? null;

            if ($existing === null) {
                $diffs[] = sprintf(
                    '+ %s (%s) qty %d @ %s = %s',
                    $item['description'],
                    $item['meal_type'] ?? '-',
                    $item['quantity'],
                    $this->money((float) $item['unit_price']),
                    $this->money((float) $item['total']),
                );

                continue;
            }

            if ((float) $existing->unit_price !== (float) $item['unit_price'] || (int) $existing->quantity !== (int) $item['quantity']) {
                $diffs[] = sprintf(
                    '~ %s (%s) %s x %s -> %s x %s',
                    $item['description'],
                    $item['meal_type'] ?? '-',
                    $existing->quantity,
                    $this->money((float) $existing->unit_price),
                    $item['quantity'],
                    $this->money((float) $item['unit_price']),
                );
            }

            unset($current[$key]);
        }

        foreach ($current as $item) {
            $diffs[] = sprintf('- %s (%s) %s x %s', $item->description, $item->meal_type ?? '-', $item->quantity, $this->money((float) $item->unit_price));
        }

        return $diffs;
    }

    /**
     * @param  array{items: array<int, array<string, mixed>>, subtotal: float, total_vat: float, total_amount: float}  $rebuilt
     */
    private function isUnchanged(Invoice $invoice, array $rebuilt): bool
    {
        if (count($invoice->items) !== count($rebuilt['items'])) {
            return false;
        }

        if (round((float) $invoice->total_amount, 2) !== round((float) $rebuilt['total_amount'], 2)) {
            return false;
        }

        $current = [];

        foreach ($invoice->items as $item) {
            $current[$this->key($item->description, $item->meal_type)] = $item;
        }

        foreach ($rebuilt['items'] as $item) {
            $existing = $current[$this->key($item['description'], $item['meal_type'])] ?? null;

            if ($existing === null) {
                return false;
            }

            if ((float) $existing->unit_price !== (float) $item['unit_price']
                || (int) $existing->quantity !== (int) $item['quantity']
                || round((float) $existing->total, 2) !== round((float) $item['total'], 2)) {
                return false;
            }
        }

        return true;
    }

    private function key(?string $description, ?string $mealType): string
    {
        return trim((string) $description).'|'.trim((string) $mealType);
    }

    private function money(float $value): string
    {
        return 'Tk '.number_format($value, 2);
    }
}
