<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'unit' => $this->unit,
            'vat_rate' => $this->vat_rate,
            'party_id' => $this->party_id,
            'party_name' => $this->party_name,
            'customer_po_number' => $this->customer_po_number,
            'description' => $this->description,
            'attachment_url' => $this->attachment_url,
            'reminder_at' => $this->reminder_at,
            'total_ordered' => (int) $this->total_ordered,
            'total_delivered' => (int) $this->total_delivered,
            'total_remaining' => $this->relationLoaded('meals')
                ? $this->totalRemaining()
                : null,
            'total_over_delivered' => $this->relationLoaded('meals')
                ? $this->totalOverDelivered()
                : null,
            'net_remaining' => $this->relationLoaded('meals')
                ? (int) ($this->totalRemaining() - $this->totalOverDelivered())
                : null,
            'meals_subtotal' => $this->meals_subtotal !== null
                ? (float) $this->meals_subtotal
                : null,
            'meals_total' => $this->meals_total !== null
                ? (float) $this->meals_total
                : null,
            'challans_count' => $this->challans_count,
            'invoiced_challans_count' => $this->invoiced_challans_count,
            'meals' => ProductMealResource::collection($this->whenLoaded('meals')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
