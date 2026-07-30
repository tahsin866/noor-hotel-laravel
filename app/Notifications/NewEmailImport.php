<?php

namespace App\Notifications;

use App\Models\EmailedPurchaseOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewEmailImport extends Notification
{
    use Queueable;

    public function __construct(
        public EmailedPurchaseOrder $emailRecord,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'emailed_purchase_order_id' => $this->emailRecord->id,
            'type' => $this->emailRecord->type,
            'subject' => $this->emailRecord->subject,
            'from_email' => $this->emailRecord->from_email,
            'supplier_name' => $this->emailRecord->supplier_name,
            'po_number' => $this->emailRecord->po_number,
            'total_amount' => $this->emailRecord->total_amount,
            'currency' => $this->emailRecord->currency,
            'deadline' => $this->emailRecord->deadline?->toIso8601String(),
        ];
    }
}
