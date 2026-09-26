<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductMealResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'meal_type' => $this->meal_type,
            'quantity' => (int) $this->quantity,
            'unit_price' => (float) $this->unit_price,
            'delivered_quantity' => (int) $this->delivered_quantity,
            'remaining' => (int) $this->remaining,
            'over_delivered' => (int) $this->over_delivered,
            'description' => $this->description,
        ];
    }
}
