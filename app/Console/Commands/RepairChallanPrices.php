<?php

namespace App\Console\Commands;

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Invoice;
use App\Models\ProductMeal;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

#[Signature('challans:repair-prices {--dry-run : Show changes without writing anything} {--apply : Persist the repaired prices and totals} {--restore= : Restore from a previously created snapshot file}')]
#[Description('Repair challan item prices to match current purchase order meal prices')]
class RepairChallanPrices extends Command
{
    public function handle(): int
    {
        $restore = $this->option('restore');
        $apply = (bool) $this->option('apply');

        if ($restore) {
            return $this->restoreFromSnapshot($restore);
        }

        $dryRun = ! $apply;

        $mismatched = ChallanItem::query()
            ->join('product_meals', 'product_meals.id', '=', 'challan_items.product_meal_id')
            ->where('challan_items.quantity', '>', 0)
            ->whereRaw('ABS(challan_items.unit_price - product_meals.unit_price) > 0.01')
            ->select('challan_items.*', 'product_meals.unit_price as po_unit_price')
            ->orderBy('challan_items.challan_id')
            ->get();

        if ($mismatched->isEmpty()) {
            $this->info('No mismatched challan item prices found.');

            return self::SUCCESS;
        }

        $affectedChallanIds = $mismatched->pluck('challan_id')->unique()->values()->all();
        $challans = Challan::query()->whereIn('id', $affectedChallanIds)->get()->keyBy('id');

        $affectedInvoiceIds = Invoice::query()
            ->whereHas('challans', fn ($q) => $q->whereIn('challans.id', $affectedChallanIds))
            ->pluck('id')
            ->unique()
            ->values()
            ->all();

        $invoices = Invoice::query()->whereIn('id', $affectedInvoiceIds)->get()->keyBy('id');

        $snapshot = [
            'generated_at' => now()->toIso8601String(),
            'mode' => $dryRun ? 'dry-run' : 'apply',
            'items' => [],
            'challan_totals' => [],
            'invoice_states' => [],
        ];

        $challanDeltas = [];
        $invoiceDeltas = [];

        foreach ($mismatched as $row) {
            $challan = $challans[$row->challan_id] ?? null;
            if (! $challan) {
                continue;
            }

            $oldLineTotal = round((float) $row->quantity * (float) $row->unit_price, 2);
            $newLineTotal = round((float) $row->quantity * (float) $row->po_unit_price, 2);
            $lineDelta = round($newLineTotal - $oldLineTotal, 2);

            $snapshot['items'][] = [
                'challan_item_id' => $row->id,
                'challan_id' => $row->challan_id,
                'challan_number' => $challan->challan_number,
                'product_meal_id' => $row->product_meal_id,
                'quantity' => (float) $row->quantity,
                'old_unit_price' => (float) $row->unit_price,
                'new_unit_price' => (float) $row->po_unit_price,
                'old_line_total' => $oldLineTotal,
                'new_line_total' => $newLineTotal,
                'delta' => $lineDelta,
            ];

            $challanDeltas[$row->challan_id] = ($challanDeltas[$row->challan_id] ?? 0) + $lineDelta;
        }

        foreach ($challanDeltas as $challanId => $delta) {
            $challan = $challans[$challanId] ?? null;
            if (! $challan) {
                continue;
            }

            $oldTotal = round((float) $challan->total_amount, 2);
            $newTotal = round($oldTotal + $delta, 2);

            $snapshot['challan_totals'][] = [
                'challan_id' => $challan->id,
                'challan_number' => $challan->challan_number,
                'old_total' => $oldTotal,
                'new_total' => $newTotal,
                'delta' => round($delta, 2),
            ];
        }

        foreach ($affectedInvoiceIds as $invoiceId) {
            $invoice = $invoices[$invoiceId] ?? null;
            if (! $invoice) {
                continue;
            }

            $relatedChallans = $invoice->challans()->get();
            $preview = app(\App\Services\InvoiceService::class)->buildItemsPreview($relatedChallans);

            $oldTotal = round((float) $invoice->total_amount, 2);
            $newTotal = round((float) $preview['total_amount'], 2);
            $delta = round($newTotal - $oldTotal, 2);

            $snapshot['invoice_states'][] = [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'old_total' => $oldTotal,
                'new_total' => $newTotal,
                'old_amount_paid' => round((float) $invoice->amount_paid, 2),
                'old_amount_due' => round((float) $invoice->amount_due, 2),
                'old_status' => $invoice->status,
                'delta' => $delta,
            ];

            $invoiceDeltas[$invoice->id] = [
                'invoice' => $invoice,
                'preview' => $preview,
                'old_total' => $oldTotal,
                'new_total' => $newTotal,
                'delta' => $delta,
            ];
        }

        if ($dryRun) {
            $this->line('');
            $this->line('<comment>Dry run — no data will be written.</comment>');
            $this->line('');

            foreach ($snapshot['items'] as $item) {
                $this->line(sprintf(
                    '<comment>%s</comment>  item %d  qty %s  %s -> %s  line %s -> %s  (+%s)',
                    $item['challan_number'],
                    $item['challan_item_id'],
                    number_format($item['quantity'], 2),
                    $this->money($item['old_unit_price']),
                    $this->money($item['new_unit_price']),
                    $this->money($item['old_line_total']),
                    $this->money($item['new_line_total']),
                    $this->money($item['delta']),
                ));
            }

            $this->line('');
            $this->line('<comment>Challan totals</comment>');
            foreach ($snapshot['challan_totals'] as $ct) {
                $this->line(sprintf(
                    '  %s  %s -> %s  (%s)',
                    $ct['challan_number'],
                    $this->money($ct['old_total']),
                    $this->money($ct['new_total']),
                    ($ct['delta'] >= 0 ? '+' : '').$this->money($ct['delta']),
                ));
            }

            $this->line('');
            $this->line('<comment>Invoice rebuilds</comment>');
            foreach ($snapshot['invoice_states'] as $inv) {
                $newAmountDue = max(0, $inv['new_total'] - $inv['old_amount_paid']);
                $newStatus = $newAmountDue <= 0 ? 'paid' : ($inv['old_amount_paid'] > 0 ? 'partial' : 'pending');
                $this->line(sprintf(
                    '  %s  %s -> %s  amount_paid %s  amount_due %s -> %s  status %s -> %s',
                    $inv['invoice_number'],
                    $this->money($inv['old_total']),
                    $this->money($inv['new_total']),
                    $this->money($inv['old_amount_paid']),
                    $this->money($inv['old_amount_due']),
                    $this->money($newAmountDue),
                    $inv['old_status'],
                    $newStatus,
                ));
            }

            $this->line('');
            $this->line(sprintf(
                '%d item row(s) across %d challan(s) would be repaired. %d invoice(s) would be rebuilt.',
                count($snapshot['items']),
                count($snapshot['challan_totals']),
                count($snapshot['invoice_states']),
            ));
            $this->line('Re-run with <comment>--apply</comment> to persist these changes.');

            return self::SUCCESS;
        }

        $snapshotPath = storage_path('app/repair-prices-'.now()->format('Ymd-His').'.json');
        file_put_contents($snapshotPath, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $this->line("Snapshot written to {$snapshotPath}");

        DB::transaction(function () use ($mismatched, $challanDeltas, $invoiceDeltas) {
            foreach ($mismatched as $row) {
                $row->forceFill([
                    'unit_price' => $row->po_unit_price,
                ])->save();
            }

            foreach ($challanDeltas as $challanId => $delta) {
                $challan = Challan::query()->find($challanId);
                if ($challan) {
                    $challan->forceFill([
                        'total_amount' => round((float) $challan->total_amount + $delta, 2),
                    ])->save();
                }
            }

            foreach ($invoiceDeltas as $data) {
                /** @var Invoice $invoice */
                $invoice = $data['invoice'];
                $preview = $data['preview'];
                $oldTotal = $data['old_total'];
                $newTotal = $data['new_total'];
                $delta = $data['delta'];

                $amountPaid = (float) $invoice->amount_paid;
                $amountDue = round(max(0, $newTotal - $amountPaid), 2);

                if ($amountDue <= 0) {
                    $status = 'paid';
                } elseif ($amountPaid > 0) {
                    $status = 'partial';
                } else {
                    $status = 'pending';
                }

                if ($invoice->status === 'paid' && $status !== 'paid') {
                    Log::channel('single')->info('repair-prices: invoice paid-state preserved', [
                        'invoice_id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'old_total' => $oldTotal,
                        'new_total' => $newTotal,
                        'delta' => $delta,
                        'amount_paid' => $amountPaid,
                    ]);

                    $status = 'paid';
                    $amountDue = max(0, $newTotal - $amountPaid);
                }

                $invoice->forceFill([
                    'subtotal' => round($preview['subtotal'], 2),
                    'total_vat' => round($preview['total_vat'], 2),
                    'total_amount' => $newTotal,
                    'amount_paid' => round($amountPaid, 2),
                    'amount_due' => $amountDue,
                    'status' => $status,
                ])->save();

                $invoice->items()->delete();
                foreach ($preview['items'] as $item) {
                    $invoice->items()->create($item);
                }
            }
        });

        $this->line('');
        $this->line(sprintf(
            'Repaired %d item row(s) across %d challan(s). Rebuilt %d invoice(s).',
            count($snapshot['items']),
            count($snapshot['challan_totals']),
            count($snapshot['invoice_states']),
        ));

        return self::SUCCESS;
    }

    private function restoreFromSnapshot(string $path): int
    {
        if (! file_exists($path)) {
            $this->error("Snapshot file not found: {$path}");

            return self::FAILURE;
        }

        $snapshot = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($snapshot) || empty($snapshot['items'])) {
            $this->error('Invalid snapshot file.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($snapshot) {
            foreach ($snapshot['items'] as $item) {
                ChallanItem::query()->where('id', $item['challan_item_id'])->update([
                    'unit_price' => $item['old_unit_price'],
                ]);
            }

            foreach ($snapshot['challan_totals'] as $ct) {
                Challan::query()->where('id', $ct['challan_id'])->update([
                    'total_amount' => $ct['old_total'],
                ]);
            }

            foreach ($snapshot['invoice_states'] as $inv) {
                $invoice = Invoice::query()->find($inv['invoice_id']);
                if (! $invoice) {
                    continue;
                }

                $challans = $invoice->challans()->get();
                $preview = app(\App\Services\InvoiceService::class)->buildItemsPreview($challans);

                $amountPaid = (float) $inv['old_amount_paid'];
                $amountDue = round(max(0, (float) $inv['old_total'] - $amountPaid), 2);

                if ($amountDue <= 0) {
                    $status = 'paid';
                } elseif ($amountPaid > 0) {
                    $status = 'partial';
                } else {
                    $status = 'pending';
                }

                $invoice->forceFill([
                    'subtotal' => round($preview['subtotal'], 2),
                    'total_vat' => round($preview['total_vat'], 2),
                    'total_amount' => (float) $inv['old_total'],
                    'amount_paid' => round($amountPaid, 2),
                    'amount_due' => $amountDue,
                    'status' => $status,
                ])->save();

                $invoice->items()->delete();
                foreach ($preview['items'] as $item) {
                    $invoice->items()->create($item);
                }
            }
        });

        $this->info('Restored from snapshot: '.$path);

        return self::SUCCESS;
    }

    private function money(float $value): string
    {
        return '৳'.number_format($value, 2);
    }
}
