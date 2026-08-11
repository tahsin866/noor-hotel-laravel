<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Challan extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'challan_number',
        'product_id',
        'user_id',
        'date',
        'address',
        'notes',
        'total_amount',
        'status',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(ChallanItem::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->challan_number)) {
                $year = now()->year;
                $prefix = "Noor/{$year}/CH/";

                $last = DB::select(
                    'SELECT MAX(CAST(SUBSTR(challan_number, ?) AS INTEGER)) as max_num FROM challans WHERE challan_number LIKE ?',
                    [strlen($prefix) + 1, $prefix.'%']
                );

                $next = max(($last[0]->max_num ?? 0) + 1, 650);
                $model->challan_number = $prefix.str_pad($next, 4, '0', STR_PAD_LEFT);
            }
        });
    }
}
