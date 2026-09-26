<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'party_id' => $this->party_id,
            'party_name' => $this->party->party_name ?? '-',
            'party_address' => $this->party->address ?? '',
            'date' => $this->date,
            'due_date' => $this->due_date,
            'subtotal' => $this->subtotal,
            'total_vat' => $this->total_vat,
            'total_amount' => $this->total_amount,
            'amount_paid' => $this->amount_paid,
            'amount_due' => $this->amount_due,
            'status' => $this->status,
            'print_status' => $this->print_status,
            'notes' => $this->notes,
            'customer_po_number' => $this->items->first()?->product->customer_po_number,
            'items' => InvoiceItemResource::collection($this->whenLoaded('items')),
            'challans' => ChallanResource::collection($this->whenLoaded('challans')),
            'payment_history' => PaymentHistoryResource::collection($this->whenLoaded('paymentHistory')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
