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
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'delivered_quantity' => $this->delivered_quantity,
            'description' => $this->description,
        ];
    }
}
