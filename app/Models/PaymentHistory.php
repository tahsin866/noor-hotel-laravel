<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class PaymentHistory extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'payment_history';

    protected $fillable = [
        'payment_number',
        'invoice_id',
        'amount',
        'payment_date',
        'payment_method',
        'reference_number',
        'notes',
        'payment_status',
        'customer_bank_name',
        'user_bank_name',
        'attachment',
        'reduce_amount',
        'reduce_note',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'date',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * URL that streams the attachment through the app, so it works without the public storage symlink.
     */
    public function getAttachmentUrlAttribute(): ?string
    {
        return $this->attachment
            ? route('attachments.payment', ['path' => basename($this->attachment)])
            : null;
    }

    public static function generatePaymentNumber(): string
    {
        $prefix = 'Noor/'.now()->year.'/PAY/';

        $last = DB::select(
            'SELECT MAX(CAST(SUBSTR(payment_number, ?) AS INTEGER)) as max_num FROM payment_history WHERE payment_number LIKE ?',
            [strlen($prefix) + 1, $prefix.'%']
        );

        return $prefix.str_pad((string) (($last[0]->max_num ?? 0) + 1), 4, '0', STR_PAD_LEFT);
    }

    protected static function booted(): void
    {
        static::creating(function (PaymentHistory $payment): void {
            if (empty($payment->payment_number)) {
                $payment->payment_number = static::generatePaymentNumber();
            }
        });
    }
}
