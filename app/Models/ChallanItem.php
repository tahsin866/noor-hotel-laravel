<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChallanItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'challan_id',
        'product_meal_id',
        'quantity',
        'unit_price',
    ];

    public function challan()
    {
        return $this->belongsTo(Challan::class);
    }

    public function productMeal()
    {
        return $this->belongsTo(ProductMeal::class);
    }
}
