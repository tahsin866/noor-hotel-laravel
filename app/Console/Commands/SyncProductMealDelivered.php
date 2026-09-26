<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

class SyncProductMealDelivered extends Command
{
    protected $signature = 'products:sync-delivered {--po= : Only sync this PO code}';
    protected $description = 'Sync product_meals.delivered_quantity with actual non-cancelled challan item quantities';

    public function handle(): int
    {
        $query = Product::query();
        if ($code = $this->option('po')) {
            $query->where('code', $code);
        }

        $products = $query->get();
        $updated = 0;

        foreach ($products as $product) {
            foreach ($product->meals as $meal) {
                $expected = (int) $meal->getAttributes()['delivered_quantity'] ?? 0;
                $actual = (int) \App\Models\ChallanItem::query()
                    ->join('challans', 'challans.id', '=', 'challan_items.challan_id')
                    ->where('challan_items.product_meal_id', $meal->id)
                    ->where('challans.status', '!=', 'cancelled')
                    ->sum('challan_items.quantity');

                if ($expected !== $actual) {
                    $meal->forceFill(['delivered_quantity' => $actual])->save();
                    $this->line("{$product->code} meal {$meal->id}: {$expected} -> {$actual}");
                    $updated++;
                }
            }
        }

        $this->info("Updated {$updated} meal(s).");

        return self::SUCCESS;
    }
}
