<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChallanItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_meal_id' => $this->product_meal_id,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'product_name' => $this->productMeal->product->name ?? '-',
            'meal_type' => $this->productMeal->meal_type ?? '-',
            'description' => $this->productMeal->description ?? '-',
        ];
    }
}
