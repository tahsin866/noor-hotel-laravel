import { Package, Plus, X } from 'lucide-react';
import type { WheelEvent } from 'react';
import { poMealTypeOptions } from '@/components/po/po-meals';
import type { PoFormState } from '@/components/po/use-po-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const blurOnWheel = (e: WheelEvent<HTMLInputElement>) => e.currentTarget.blur();

type PoMealFieldsProps = {
    form: Pick<
        PoFormState,
        'meals' | 'vatRate' | 'addMeal' | 'removeMeal' | 'updateMeal'
    >;
};

/**
 * Editable order lines with subtotal / VAT / total summary.
 */
export default function PoMealFields({ form }: PoMealFieldsProps) {
    const { meals, vatRate, addMeal, removeMeal, updateMeal } = form;

    const subtotal = meals.reduce(
        (sum, meal) => sum + meal.quantity * meal.unit_price,
        0,
    );
    const vat =
        Math.round(((subtotal * parseFloat(vatRate || '0')) / 100) * 100) / 100;
    const total = subtotal + vat;

    return (
        <div className="grid gap-2.5">
            <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <Package className="size-3.5" />
                    Order Items
                </Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMeal}
                    className="h-7 gap-1 text-xs"
                >
                    <Plus className="size-3.5" />
                    Add Item
                </Button>
            </div>
            <div className="space-y-2 rounded-lg border border-border">
                {meals.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                        No order items yet. Click &quot;Add Item&quot; to add
                        one.
                    </p>
                ) : (
                    meals.map((meal, idx) => (
                        <div
                            key={idx}
                            className={`space-y-2 p-3 ${idx !== 0 ? 'border-t border-border' : ''}`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground tabular-nums">
                                    {idx + 1}
                                </span>
                                <div className="w-32 shrink-0">
                                    <Select
                                        value={meal.meal_type}
                                        onValueChange={(value) =>
                                            updateMeal(idx, 'meal_type', value)
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Select meal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {poMealTypeOptions.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    placeholder="Qty"
                                    value={meal.quantity || ''}
                                    onChange={(e) =>
                                        updateMeal(
                                            idx,
                                            'quantity',
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                    onWheel={blurOnWheel}
                                />
                                <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    placeholder="Unit Price"
                                    step="0.01"
                                    value={meal.unit_price || ''}
                                    onChange={(e) =>
                                        updateMeal(
                                            idx,
                                            'unit_price',
                                            parseFloat(e.target.value) || 0,
                                        )
                                    }
                                    onWheel={blurOnWheel}
                                />
                                <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums">
                                    Tk{' '}
                                    {(meal.quantity * meal.unit_price).toFixed(
                                        2,
                                    )}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeMeal(idx)}
                                >
                                    <X className="size-3.5" />
                                </Button>
                            </div>
                            <textarea
                                className="ml-8 flex w-[calc(100%-2rem)] rounded-md border border-input bg-transparent px-2 py-1.5 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                rows={2}
                                placeholder="Description (optional)"
                                value={meal.description}
                                onChange={(e) =>
                                    updateMeal(
                                        idx,
                                        'description',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                    ))
                )}
            </div>
            <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">
                        Tk {subtotal.toFixed(2)}
                    </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>VAT ({vatRate || 0}%)</span>
                    <span className="tabular-nums">Tk {vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 text-sm font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">Tk {total.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}
