<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChallanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'challan_number' => $this->challan_number,
            'product_id' => $this->product_id,
            'product_name' => $this->product->name ?? '-',
            'po_number' => $this->product->code ?? '-',
            'customer_po_number' => $this->product->customer_po_number ?? '-',
            'party_name' => $this->product->party->party_name ?? '-',
            'date' => $this->date,
            'address' => $this->address,
            'notes' => $this->notes,
            'total_amount' => $this->total_amount,
            'total_qty' => $this->items->sum('quantity'),
            'status' => $this->status,
            'show_print_date' => $this->show_print_date,
            'items' => ChallanItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
