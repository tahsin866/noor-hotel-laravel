<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

class MakeAllDelivered extends Command
{
    protected $signature = 'products:make-all-delivered {--po= : Only update this PO code}';
    protected $description = 'Set each product meal ordered quantity to its actual delivered quantity so no meal shows remaining or over-delivered';

    public function handle(): int
    {
        $query = Product::query();
        if ($code = $this->option('po')) {
            $query->where('code', $code);
        }

        $products = $query->get();
        $updated = 0;

        foreach ($products as $product) {
            $product->load('meals');

            foreach ($product->meals as $meal) {
                $actualDelivered = (int) \App\Models\ChallanItem::query()
                    ->join('challans', 'challans.id', '=', 'challan_items.challan_id')
                    ->where('challan_items.product_meal_id', $meal->id)
                    ->where('challans.status', '!=', 'cancelled')
                    ->sum('challan_items.quantity');

                if ($actualDelivered <= 0) {
                    continue;
                }

                if ((int) $meal->quantity !== $actualDelivered) {
                    $meal->forceFill(['quantity' => $actualDelivered])->save();
                    $this->line("{$product->code} meal {$meal->id}: ordered {$meal->quantity} -> {$actualDelivered}");
                    $updated++;
                }
            }
        }

        $this->info("Updated {$updated} meal(s).");

        return self::SUCCESS;
    }
}
