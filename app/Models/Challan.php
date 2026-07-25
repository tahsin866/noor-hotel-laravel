<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Challan extends Model
{
    use HasFactory;

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
        return $this->belongsTo(\App\Models\User::class);
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
                $last = DB::select("SELECT MAX(CAST(SUBSTR(challan_number, 5) AS INTEGER)) as max_num FROM challans");
                $next = ($last[0]->max_num ?? 0) + 1;
                $model->challan_number = 'CH-' . str_pad($next, 4, '0', STR_PAD_LEFT);
            }
        });
    }
}
