<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'unit',
        'vat_rate',
        'unit_price',
        'party_id',
        'customer_po_number',
        'description',
    ];

    public function party(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function meals(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ProductMeal::class);
    }
}
