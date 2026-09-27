<?php

namespace App\Console\Commands;

use App\Models\Challan;
use App\Models\ChallanItem;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ReconstructChallanItems extends Command
{
    protected $signature = 'challans:reconstruct-items {--po= : Only reconstruct for this PO code} {--force : Overwrite existing challan items}';
    protected $description = 'Reconstruct missing challan_items from invoice data for a purchase order';

    public function handle(): int
    {
        $force = (bool) $this->option('force');
        $query = Product::query();
        if ($code = $this->option('po')) {
            $query->where('code', $code);
        }

        $products = $query->get();

        foreach ($products as $product) {
            $this->line("Processing {$product->code}...");

            $challans = $product->challans()
                ->where('status', '!=', 'cancelled')
                ->orderBy('id')
                ->get();

            if ($challans->isEmpty()) {
                $this->line("  No challans found.");
                continue;
            }

            $existingItems = ChallanItem::whereIn('challan_id', $challans->pluck('id'))->count();
            if ($existingItems > 0 && !$force) {
                $this->line("  Challan items already exist ($existingItems). Use --force to overwrite.");
                continue;
            }

            if ($existingItems > 0 && $force) {
                ChallanItem::whereIn('challan_id', $challans->pluck('id'))->delete();
                $this->line("  Cleared $existingItems existing items.");
            }

            $meals = $product->meals;
            $itemsCreated = 0;

            foreach ($challans as $index => $challan) {
                foreach ($meals as $meal) {
                    $qty = (int) ($meal->delivered_quantity ?? 0);
                    if ($qty <= 0) {
                        $qty = (int) $meal->quantity;
                    }

                    if ($qty <= 0) {
                        continue;
                    }

                    $base = (int) floor($qty / $challans->count());
                    $remainder = $qty % $challans->count();

                    $perChallan = $base + ($index < $remainder ? 1 : 0);

                    if ($perChallan <= 0) {
                        continue;
                    }

                    ChallanItem::create([
                        'challan_id' => $challan->id,
                        'product_meal_id' => $meal->id,
                        'quantity' => $perChallan,
                        'unit_price' => $meal->unit_price,
                    ]);

                    $itemsCreated++;
                }
            }

            $this->line("  Created $itemsCreated challan items across {$challans->count()} challans.");
        }

        $this->info('Reconstruction complete.');

        return self::SUCCESS;
    }
}
