<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function scopeWithChallanDelivered(Builder $query): Builder
    {
        return $query->addSelect([
            'delivered_quantity' => ChallanItem::query()
                ->join('challans', 'challans.id', '=', 'challan_items.challan_id')
                ->whereColumn('challan_items.product_meal_id', 'product_meals.id')
                ->where('challans.status', '!=', 'cancelled')
                ->whereNull('challans.deleted_at')
                ->selectRaw('COALESCE(SUM(challan_items.quantity), 0)'),
        ]);
    }
}
