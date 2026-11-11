<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
            ? route('attachments.product', ['path' => basename($this->attachment_path)])
            : null;
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function meals(): HasMany
    {
        return $this->hasMany(ProductMeal::class)->orderBy('sort_order')->orderBy('id');
    }

    public function challans(): HasMany
    {
        return $this->hasMany(Challan::class);
    }

    /**
     * Relations needed by invoiceLinks(); kept lean because the PO list loads them for every row.
     */
    public const INVOICE_LINKS_RELATIONS = [
        'challans:id,product_id',
        'challans.invoices:invoices.id,invoices.invoice_number',
    ];

    /**
     * Invoices raised from this PO's challans, oldest first.
     *
     * @return array<int, array{id: int, invoice_number: string}>
     */
    public function invoiceLinks(): array
    {
        if (! $this->relationLoaded('challans')) {
            return [];
        }

        return $this->challans
            ->flatMap(fn (Challan $challan) => $challan->invoices)
            ->unique('id')
            ->sortBy('id')
            ->map(fn (Invoice $invoice): array => ['id' => (int) $invoice->id, 'invoice_number' => $invoice->invoice_number])
            ->values()
            ->all();
    }

    public function scopeWithDeliveredTotals(Builder $query): Builder
    {
        return $query
            ->withSum('meals as total_ordered', 'quantity')
            ->with(['meals' => function (HasMany $meals): void {
                $meals->withChallanDelivered();
            }])
            ->with(self::INVOICE_LINKS_RELATIONS)
            ->addSelect([
                'total_delivered' => ChallanItem::query()
                    ->join('challans', 'challans.id', '=', 'challan_items.challan_id')
                    ->whereColumn('challans.product_id', 'products.id')
                    ->where('challans.status', '!=', 'cancelled')
                    ->whereNull('challans.deleted_at')
                    ->selectRaw('COALESCE(SUM(challan_items.quantity), 0)'),
            ]);
    }

    /**
     * Populate the aggregate attributes the list query adds through
     * withDeliveredTotals(), so store/update responses carry the same
     * ordered/delivered/challan totals as the table does.
     */
    public function loadDeliveryTotals(): static
    {
        $this->loadMissing(['meals' => function (HasMany $meals): void {
            $meals->withChallanDelivered();
        }]);
        $this->loadMissing(self::INVOICE_LINKS_RELATIONS);

        $this->setAttribute('total_ordered', (int) $this->meals->sum('quantity'));
        $this->setAttribute('total_delivered', (int) $this->meals->sum('delivered_quantity'));
        $this->setAttribute('challans_count', $this->challans()->where('status', '!=', 'cancelled')->count());
        $this->setAttribute('invoiced_challans_count', $this->challans()->where('status', '!=', 'cancelled')->whereHas('invoices')->count());

        return $this;
    }

    public static function generateCode(): string
    {
        $maxNumber = static::withoutGlobalScopes()
            ->selectRaw('COALESCE(MAX(CAST(SUBSTR(code, 4) AS INTEGER)), 0) AS max_num')
            ->where('code', 'like', 'PO-%')
            ->value('max_num') ?? 0;

        return 'PO-'.str_pad($maxNumber + 1, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Units still undelivered, summed per meal so a short row is never
     * hidden by an over-delivery on another row.
     */
    public function totalRemaining(): int
    {
        return (int) $this->meals->sum(fn (ProductMeal $meal): int => $meal->remaining);
    }

    /**
     * Units delivered beyond the ordered quantity, summed per meal.
     */
    public function totalOverDelivered(): int
    {
        return (int) $this->meals->sum(fn (ProductMeal $meal): int => $meal->over_delivered);
    }
}
