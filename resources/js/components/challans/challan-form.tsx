import { FileText } from 'lucide-react';
import type { Party } from '@/components/challans/types';
import type { ChallanFormState } from '@/components/challans/use-challan-form';
import { remainingOf } from '@/components/challans/use-challan-form';
import InputError from '@/components/input-error';
import PartyCombobox from '@/components/shared/party-combobox';
import SearchableSelect from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatAmount } from '@/lib/format';
import { formatMealType, mealBadgeClass } from '@/lib/meals';

const textareaClass =
    'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

type ChallanFormProps = {
    title: string;
    submitLabel: string;
    form: ChallanFormState;
    parties: Party[];
    processing: boolean;
    onSubmit: () => void;
    onCancel: () => void;
};

/**
 * Body of the create / edit challan dialog. Rendered inside DialogContent.
 */
export default function ChallanForm({
    title,
    submitLabel,
    form,
    parties,
    processing,
    onSubmit,
    onCancel,
}: ChallanFormProps) {
    const { poInfo, items, errors } = form;

    return (
        <>
            <DialogHeader className="space-y-1 border-b border-border pb-4">
                <DialogTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-4.5 text-muted-foreground" />
                    {title}
                </DialogTitle>
                <DialogDescription className="text-xs">
                    Fields marked with * are required.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Party *
                        </Label>
                        <PartyCombobox
                            parties={parties}
                            value={form.partyId}
                            onChange={form.setPartyId}
                            placeholder="All Parties"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Date *
                        </Label>
                        <Input
                            type="date"
                            required
                            value={form.date}
                            onChange={(e) => form.setDate(e.target.value)}
                        />
                        <InputError message={errors.date} />
                    </div>
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        PO (Product) *
                    </Label>
                    <SearchableSelect
                        options={form.availableProducts.map((product) => ({
                            value: String(product.id),
                            label: `${product.code} - ${product.name}`,
                            description: `[${remainingOf(product)} remaining]`,
                        }))}
                        value={form.productId}
                        onChange={(id) => form.selectPo(id)}
                        placeholder="Select PO (Product)"
                        searchPlaceholder="Search by code or name..."
                        emptyText="No products found"
                    />
                </div>

                {poInfo && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <PoInfoField label="PO Code" mono>
                                {poInfo.code}
                            </PoInfoField>
                            <PoInfoField label="Name">
                                {poInfo.name}
                            </PoInfoField>
                            <PoInfoField label="Party">
                                {poInfo.party?.party_name || '—'}
                            </PoInfoField>
                            <PoInfoField label="Unit">
                                {poInfo.unit}
                            </PoInfoField>
                        </div>
                    </div>
                )}

                <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        Delivery Address *
                    </Label>
                    <textarea
                        className={textareaClass}
                        rows={2}
                        placeholder="Enter delivery address..."
                        value={form.address}
                        onChange={(e) => form.setAddress(e.target.value)}
                    />
                    <InputError message={errors.address} />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        Notes
                    </Label>
                    <textarea
                        className={textareaClass}
                        rows={2}
                        placeholder="Additional notes..."
                        value={form.notes}
                        onChange={(e) => form.setNotes(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        Items *
                    </Label>
                    {items.length === 0 ? (
                        <p className="py-2 text-xs text-muted-foreground">
                            Select a PO to load items
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {items.map((item, index) => (
                                <div
                                    key={item.product_meal_id}
                                    className="rounded-lg border border-border bg-muted/30 p-3"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${mealBadgeClass(item.meal_type)}`}
                                            >
                                                {formatMealType(item.meal_type)}
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
                                                form.updateItemQty(
                                                    index,
                                                    parseInt(e.target.value) ||
                                                        0,
                                                )
                                            }
                                            onWheel={(e) =>
                                                (
                                                    e.target as HTMLInputElement
                                                ).blur()
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
                                        ৳{formatAmount(form.grandTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox
                    id="show_print_date"
                    checked={form.showPrintDate}
                    onCheckedChange={(checked) =>
                        form.setShowPrintDate(checked === true)
                    }
                    className="data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                />
                <Label
                    htmlFor="show_print_date"
                    className="cursor-pointer text-sm font-medium"
                >
                    Show date on print
                </Label>
            </div>
            <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    disabled={processing}
                    onClick={onSubmit}
                    className="min-w-28"
                >
                    {processing ? 'Saving…' : submitLabel}
                </Button>
            </DialogFooter>
        </>
    );
}

function PoInfoField({
    label,
    mono = false,
    children,
}: {
    label: string;
    mono?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <span className="text-[10px] font-semibold text-blue-400 uppercase">
                {label}
            </span>
            <p className={mono ? 'font-mono text-blue-800' : 'text-blue-800'}>
                {children}
            </p>
        </div>
    );
}
