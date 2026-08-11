<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PurchaseOrderReminder extends Notification
{
    use Queueable;

    public function __construct(
        public Product $product,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'code' => $this->product->code,
            'name' => $this->product->name,
            'party' => $this->product->party?->party_name,
            'reminder_at' => $this->product->reminder_at?->toIso8601String(),
        ];
    }
}
