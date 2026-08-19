<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'unit',
        'vat_rate',
        'unit_price',
        'party_id',
        'customer_po_number',
        'description',
        'attachment_path',
        'reminder_at',
        'reminder_notified_at',
    ];

    protected $appends = ['attachment_url'];

    protected function casts(): array
    {
        return [
            'reminder_at' => 'datetime',
            'reminder_notified_at' => 'datetime',
        ];
    }

    public function getAttachmentUrlAttribute(): ?string
    {
        return $this->attachment_path
            ? Storage::disk('public')->url($this->attachment_path)
            : null;
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function meals(): HasMany
    {
        return $this->hasMany(ProductMeal::class);
    }

    public function challans(): HasMany
    {
        return $this->hasMany(Challan::class);
    }

    public static function generateCode(): string
    {
        $maxNumber = static::withoutGlobalScopes()
            ->selectRaw('COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)), 0) AS max_num')
            ->where('code', 'like', 'PO-%')
            ->value('max_num') ?? 0;

        return 'PO-'.str_pad($maxNumber + 1, 4, '0', STR_PAD_LEFT);
    }
}
