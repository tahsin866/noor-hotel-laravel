import { Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { formatPoMealType, poMealBadgeClass } from '@/components/po/po-meals';
import type { ChallanFormItem, Product } from '@/components/po/types';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/api';
import { formatAmount } from '@/lib/format';

const SOMETHING_WENT_WRONG = 'Something went wrong.';

const labelClass = 'text-xs font-medium text-muted-foreground';

const textareaClass =
    'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * One dispatch row per PO line that still has units left, pre-filled
 * with everything remaining.
 */
function remainingItems(product: Product): ChallanFormItem[] {
    return (product.meals || []).flatMap((meal) => {
        const remaining = Math.max(
            0,
            meal.quantity - (meal.delivered_quantity || 0),
        );

        if (remaining <= 0) {
            return [];
        }

        return [
            {
                product_meal_id: meal.id,
                meal_type: meal.meal_type,
                unit_price: meal.unit_price,
                quantity: remaining,
                max: remaining,
                description: meal.description,
            },
        ];
    });
}

function PoSummaryCard({ product }: { product: Product }) {
    const fields = [
        { label: 'PO Code', value: product.code, mono: true },
        { label: 'Name', value: product.name },
        { label: 'Party', value: product.party_name || '—' },
        { label: 'Customer PO', value: product.customer_po_number || '—' },
    ];

    return (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                {fields.map((field) => (
                    <div key={field.label}>
                        <span className="text-[10px] font-semibold text-blue-400 uppercase">
                            {field.label}
                        </span>
                        <p
                            className={`text-blue-800 ${field.mono ? 'font-mono' : ''}`}
                        >
                            {field.value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

type ChallanFormBodyProps = {
    product: Product;
    onClose: () => void;
    onCreated: () => void;
};

/**
 * Form state lives here so it resets every time the dialog opens for a PO.
 */
function ChallanFormBody({
    product,
    onClose,
    onCreated,
}: ChallanFormBodyProps) {
    const [date, setDate] = useState(today);
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState(() => remainingItems(product));
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const grandTotal = items.reduce(
        (sum, item) =>
            sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0,
    );

    const updateQuantity = (index: number, quantity: number) =>
        setItems((prev) =>
            prev.map((item, i) =>
                i === index
                    ? { ...item, quantity: Math.min(quantity, item.max) }
                    : item,
            ),
        );

    const submit = async () => {
        if (!address.trim()) {
            toast.error('Delivery address is required');

            return;
        }

        if (items.length === 0) {
            toast.error('This PO has no remaining items to dispatch');

            return;
        }

        setProcessing(true);
        setErrors({});

        try {
            const { ok, status, body } = await apiRequest('/api/challans', {
                method: 'POST',
                body: {
                    product_id: product.id,
                    date,
                    address,
                    notes,
                    items: items.map((item) => ({
                        product_meal_id: item.product_meal_id,
                        quantity: item.quantity,
                    })),
                },
            });

            if (ok) {
                toast.success(body.message || 'Challan created');
                onClose();
                onCreated();
            } else if (status === 422) {
                setErrors(body.errors || {});
            } else {
                toast.error(body.message || SOMETHING_WENT_WRONG);
            }
        } catch {
            toast.error(SOMETHING_WENT_WRONG);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
                <PoSummaryCard product={product} />

                <div className="grid gap-1.5">
                    <Label className={labelClass}>Date *</Label>
                    <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                    <InputError message={errors.date} />
                </div>

                <div className="grid gap-1.5">
                    <Label className={labelClass}>Delivery Address *</Label>
                    <textarea
                        className={textareaClass}
                        rows={2}
                        placeholder="Enter delivery address..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                    <InputError message={errors.address} />
                </div>

                <div className="grid gap-1.5">
                    <Label className={labelClass}>Notes</Label>
                    <textarea
                        className={textareaClass}
                        rows={2}
                        placeholder="Additional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label className={labelClass}>Items *</Label>
                    {items.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                            This PO is fully delivered. No remaining items to
                            dispatch.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {items.map((item, idx) => (
                                <div
                                    key={item.product_meal_id}
                                    className="rounded-lg border border-border bg-muted/30 p-3"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${poMealBadgeClass(item.meal_type)}`}
                                            >
                                                {formatPoMealType(
                                                    item.meal_type,
                                                )}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                ৳{formatAmount(item.unit_price)}
                                                /unit
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Max: <strong>{item.max}</strong>
                                        </div>
                                    </div>
                                    {item.description && (
                                        <p className="mb-2 text-xs text-muted-foreground">
                                            {item.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Label className="w-20 text-xs text-muted-foreground">
                                            Dispatch Qty
                                        </Label>
                                        <Input
                                            type="number"
                                            className="h-8 flex-1 text-xs"
                                            value={item.quantity}
                                            min={0}
                                            max={item.max}
                                            onChange={(e) =>
                                                updateQuantity(
                                                    idx,
                                                    parseInt(e.target.value) ||
                                                        0,
                                                )
                                            }
                                            onWheel={(e) =>
                                                e.currentTarget.blur()
                                            }
                                        />
                                        <span className="w-24 text-right text-xs font-semibold tabular-nums">
                                            ৳
                                            {formatAmount(
                                                item.quantity * item.unit_price,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                <div className="flex justify-between text-sm font-bold text-emerald-800">
                                    <span>Total Delivery Amount:</span>
                                    <span className="tabular-nums">
                                        ৳{formatAmount(grandTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    <InputError message={errors.items} />
                </div>
            </div>
            <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    disabled={processing || items.length === 0}
                    onClick={submit}
                    className="min-w-28"
                >
                    {processing ? 'Saving…' : 'Create Challan'}
                </Button>
            </DialogFooter>
        </>
    );
}

type PoChallanDialogProps = {
    /** The PO to dispatch from; `null` closes the dialog. */
    product: Product | null;
    onClose: () => void;
    onCreated: () => void;
};

/**
 * Create a delivery challan straight from a purchase order.
 */
export default function PoChallanDialog({
    product,
    onClose,
    onCreated,
}: PoChallanDialogProps) {
    return (
        <Dialog
            open={product !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader className="space-y-1 border-b border-border pb-4">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Truck className="size-4.5 text-muted-foreground" />
                        Create Challan
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Create a delivery challan from this purchase order.
                    </DialogDescription>
                </DialogHeader>
                {product && (
                    <ChallanFormBody
                        key={product.id}
                        product={product}
                        onClose={onClose}
                        onCreated={onCreated}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
