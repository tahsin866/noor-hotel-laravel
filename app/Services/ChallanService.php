<?php

namespace App\Services;

use App\Contracts\ChallanRepositoryInterface;
use App\DTOs\CreateChallanDTO;
use App\Models\Challan;
use App\Models\ProductMeal;
use App\ValueObjects\ChallanNumber;
use Illuminate\Support\Facades\DB;

class ChallanService
{
    public function __construct(private ChallanRepositoryInterface $challans) {}

    public function create(CreateChallanDTO $dto): Challan
    {
        $total = $this->calculateTotal($dto->items);

        $challan = $this->challans->create([
            'challan_number' => (string) ChallanNumber::from($this->generateNumber()),
            'product_id' => $dto->productId,
            'user_id' => $dto->userId,
            'date' => $dto->date,
            'address' => $dto->address,
            'notes' => $dto->notes,
            'total_amount' => $total,
            'status' => 'pending',
            'show_print_date' => $dto->showPrintDate,
        ]);

        foreach ($dto->items as $item) {
            $meal = ProductMeal::find($item['product_meal_id']);
            $challan->items()->create([
                'product_meal_id' => $item['product_meal_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $meal->unit_price ?? 0,
            ]);
        }

        return $challan->load(['product', 'product.party', 'user', 'items.productMeal']);
    }

    public function update(Challan $challan, CreateChallanDTO $dto): Challan
    {
        $total = $this->calculateTotal($dto->items);

        $wasCounted = in_array($challan->status, ['dispatched', 'delivered'], true);

        if ($wasCounted) {
            foreach ($challan->items as $oldItem) {
                \App\Models\ProductMeal::where('id', $oldItem->product_meal_id)
                    ->decrement('delivered_quantity', $oldItem->quantity);
            }
        }

        $updated = $this->challans->update($challan, [
            'product_id' => $dto->productId,
            'date' => $dto->date,
            'address' => $dto->address,
            'notes' => $dto->notes,
            'total_amount' => $total,
            'show_print_date' => $dto->showPrintDate,
        ]);

        $updated->items()->delete();

        foreach ($dto->items as $item) {
            $meal = ProductMeal::find($item['product_meal_id']);
            $updated->items()->create([
                'product_meal_id' => $item['product_meal_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $meal->unit_price ?? 0,
            ]);
        }

        if ($wasCounted) {
            foreach ($dto->items as $item) {
                \App\Models\ProductMeal::where('id', $item['product_meal_id'])
                    ->increment('delivered_quantity', $item['quantity']);
            }
        }

        return $updated->load(['product', 'product.party', 'user', 'items.productMeal']);
    }

    private function calculateTotal(array $items): float
    {
        $total = 0;
        foreach ($items as $item) {
            $meal = ProductMeal::find($item['product_meal_id']);
            $total += ($item['quantity'] * ($meal->unit_price ?? 0));
        }

        return $total;
    }

    private function generateNumber(): string
    {
        $year = now()->year;
        $prefix = "Noor/{$year}/CH/";

        $last = DB::select(
            'SELECT MAX(CAST(SUBSTR(challan_number, ?) AS INTEGER)) as max_num FROM challans WHERE challan_number LIKE ?',
            [strlen($prefix) + 1, $prefix.'%']
        );

        $next = max(($last[0]->max_num ?? 0) + 1, 650);

        return $prefix.str_pad($next, 4, '0', STR_PAD_LEFT);
    }
}
