<?php

namespace App\Services;

use App\Contracts\ProductRepositoryInterface;
use App\DTOs\CreateProductDTO;
use App\Models\Product;
use App\Models\ProductMeal;
use Illuminate\Support\Facades\Storage;

class ProductService
{
    public function __construct(private ProductRepositoryInterface $products) {}

    public function create(CreateProductDTO $dto): Product
    {
        $data = [
            'code' => $dto->code,
            'name' => $dto->name,
            'unit' => $dto->unit,
            'vat_rate' => $dto->vatRate,
            'party_id' => $dto->partyId,
            'customer_po_number' => $dto->customerPoNumber,
            'description' => $dto->description,
            'attachment_path' => $dto->attachmentPath,
            'reminder_at' => $dto->reminderAt,
        ];

        $product = $this->products->create($data);

        foreach ($dto->meals as $meal) {
            if (($meal['quantity'] ?? 0) > 0 || ($meal['unit_price'] ?? 0) > 0) {
                $product->meals()->create($meal);
            }
        }

        return $product->load(['meals' => function ($q) {
            $q->withChallanDelivered();
        }, 'party:id,party_name']);
    }

    public function update(Product $product, array $data, array $meals, ?string $attachmentPath = null, bool $removeAttachment = false): Product
    {
        if ($removeAttachment) {
            $this->deleteAttachment($product);
            $data['attachment_path'] = null;
        } elseif ($attachmentPath !== null) {
            $this->deleteAttachment($product);
            $data['attachment_path'] = $attachmentPath;
        }

        $updated = $this->products->update($product, $data);

        $existingMeals = $product->meals()->get()->keyBy('id');
        $mealsToKeep = [];

        foreach ($meals as $meal) {
            if (($meal['quantity'] ?? 0) <= 0 && ($meal['unit_price'] ?? 0) <= 0) {
                continue;
            }

            $mealId = $meal['id'] ?? null;

            if ($mealId !== null && $existingMeals->has($mealId)) {
                $existing = $existingMeals->get($mealId);
                $existing->fill($meal)->save();
                $mealsToKeep[] = $existing->id;
            } else {
                $new = $product->meals()->create($meal);
                $mealsToKeep[] = $new->id;
            }
        }

        $product->meals()->whereNotIn('id', $mealsToKeep)->delete();

        return $updated->load(['meals' => function ($q) {
            $q->withChallanDelivered();
        }, 'party:id,party_name']);
    }

    public function search(array $filters = []): \Illuminate\Pagination\LengthAwarePaginator
    {
        return $this->products->search($filters);
    }

    public function delete(Product $product): void
    {
        $this->deleteAttachment($product);
        $product->meals()->delete();
        $this->products->delete($product);
    }

    private function deleteAttachment(Product $product): void
    {
        if ($product->attachment_path) {
            Storage::disk('public')->delete($product->attachment_path);
        }
    }
}
