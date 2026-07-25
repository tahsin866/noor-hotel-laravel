<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductMeal extends Model
{
    use HasFactory;

    protected $table = 'product_meals';

    protected $fillable = [
        'product_id',
        'meal_type',
        'quantity',
        'unit_price',
        'delivered_quantity',
        'description',
    ];

    public function product(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
