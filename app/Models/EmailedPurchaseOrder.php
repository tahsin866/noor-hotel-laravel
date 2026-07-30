<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailedPurchaseOrder extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'email_date' => 'datetime',
            'po_date' => 'date',
            'deadline' => 'datetime',
            'total_amount' => 'decimal:2',
            'raw_analysis' => 'array',
            'imported_at' => 'datetime',
        ];
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeOfStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeNew($query)
    {
        return $query->where('status', 'new');
    }
}
