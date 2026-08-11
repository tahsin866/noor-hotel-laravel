<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Notifications\PurchaseOrderReminder;
use App\Support\NotifyAdmins;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('purchase-orders:process-reminders')]
#[Description('Notify admins when purchase order reminders are due')]
class ProcessPurchaseOrderReminders extends Command
{
    public function handle(): int
    {
        $due = Product::query()
            ->whereNotNull('reminder_at')
            ->where('reminder_at', '<=', now())
            ->whereNull('reminder_notified_at')
            ->with('party:id,party_name')
            ->get();

        if ($due->isEmpty()) {
            $this->info('No purchase order reminders due.');

            return self::SUCCESS;
        }

        foreach ($due as $product) {
            NotifyAdmins::notify(new PurchaseOrderReminder($product));
            $product->update(['reminder_notified_at' => now()]);
        }

        $this->info("Processed {$due->count()} purchase order reminder(s).");

        return self::SUCCESS;
    }
}
