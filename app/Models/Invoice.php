<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'party_id',
        'user_id',
        'date',
        'due_date',
        'subtotal',
        'total_vat',
        'total_amount',
        'amount_paid',
        'amount_due',
        'status',
        'print_status',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'total_vat' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'amount_due' => 'decimal:2',
    ];

    public function party()
    {
        return $this->belongsTo(Party::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function challans()
    {
        return $this->belongsToMany(Challan::class, 'invoice_challans');
    }

    public function paymentHistory()
    {
        return $this->hasMany(PaymentHistory::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->invoice_number)) {
                $year = now()->year;
                $prefix = "Noor/{$year}/IN/";

                $last = DB::select(
                    'SELECT MAX(CAST(SUBSTR(invoice_number, ?) AS INTEGER)) as max_num FROM invoices WHERE invoice_number LIKE ?',
                    [strlen($prefix) + 1, $prefix.'%']
                );

                $next = max(($last[0]->max_num ?? 0) + 1, 450);
                $model->invoice_number = $prefix.str_pad($next, 4, '0', STR_PAD_LEFT);
            }
        });
    }
}
