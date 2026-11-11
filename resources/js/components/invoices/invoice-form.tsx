import { ClipboardList, FileText } from 'lucide-react';
import { INVOICE_TERMS_TEXT } from '@/components/invoices/invoice-print';
import type { ChallanMealItem, Party } from '@/components/invoices/types';
import type { InvoiceFormState } from '@/components/invoices/use-invoice-form';
import PartyCombobox from '@/components/shared/party-combobox';
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

const fieldLabelClass = 'text-xs font-medium text-muted-foreground';
const checkboxClass =
    'data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600';

function mealBreakdown(items?: ChallanMealItem[]): string {
    if (!items || items.length === 0) {
        return '—';
    }

    return items.map((item) => `${item.meal_type}/${item.quantity}`).join(', ');
}

type InvoiceFormProps = {
    isEditing: boolean;
    form: InvoiceFormState;
    parties: Party[];
    processing: boolean;
    onSubmit: () => void;
    onCancel: () => void;
};

/**
 * Body of the create / edit invoice dialog. Rendered inside DialogContent.
 */
export default function InvoiceForm({
    isEditing,
    form,
    parties,
    processing,
    onSubmit,
    onCancel,
}: InvoiceFormProps) {
    return (
        <>
            <DialogHeader className="space-y-1 border-b border-border pb-4">
                <DialogTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-4.5 text-muted-foreground" />
                    {isEditing ? 'Edit Invoice' : 'New Invoice'}
                </DialogTitle>
                <DialogDescription className="text-xs">
                    Fields marked with * are required.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className={fieldLabelClass}>Party *</Label>
                        <PartyCombobox
                            parties={parties}
                            value={form.partyId}
                            onChange={form.setPartyId}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className={fieldLabelClass}>Date *</Label>
                        <Input
                            type="date"
                            value={form.date}
                            onChange={(e) => form.setDate(e.target.value)}
                        />
                    </div>
                </div>

                <PartyRequirements requirements={form.partyRequirements} />

                <div className="grid gap-1.5">
                    <Label className={fieldLabelClass}>Due Date *</Label>
                    <Input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => form.setDueDate(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label className={fieldLabelClass}>PO (Product)</Label>
                    {form.partyId ? (
                        <select
                            value={form.productId}
                            onChange={(e) => form.setProductId(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                            <option value="">All POs for this party</option>
                            {form.partyProducts.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.customer_po_number || product.code}{' '}
                                    - {product.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <p className="py-2 text-xs text-muted-foreground">
                            Select a party first
                        </p>
                    )}
                </div>

                <ChallanPicker form={form} />

                <div className="grid gap-1.5">
                    <Label className={fieldLabelClass}>Notes</Label>
                    <textarea
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        rows={2}
                        placeholder="Additional notes..."
                        value={form.notes}
                        onChange={(e) => form.setNotes(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox
                        id="show_print_date"
                        checked={form.showPrintDate}
                        onCheckedChange={(checked) =>
                            form.setShowPrintDate(checked === true)
                        }
                        className={checkboxClass}
                    />
                    <Label
                        htmlFor="show_print_date"
                        className="cursor-pointer text-sm font-medium"
                    >
                        Show date on print
                    </Label>
                </div>
                <div className="flex items-start gap-2">
                    <Checkbox
                        id="show_terms"
                        checked={form.showTerms}
                        onCheckedChange={(checked) =>
                            form.setShowTerms(checked === true)
                        }
                        className={`mt-0.5 ${checkboxClass}`}
                    />
                    <Label
                        htmlFor="show_terms"
                        className="cursor-pointer text-sm leading-snug font-medium"
                    >
                        Show terms &amp; conditions on invoice
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                            {INVOICE_TERMS_TEXT}
                        </span>
                    </Label>
                </div>
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
                    {processing
                        ? 'Saving…'
                        : isEditing
                          ? 'Save Changes'
                          : 'Create Invoice'}
                </Button>
            </DialogFooter>
        </>
    );
}

function PartyRequirements({ requirements }: { requirements: string[] }) {
    if (requirements.length === 0) {
        return null;
    }

    return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <ClipboardList className="size-4" />
                Bill submission requirements for this party
            </p>
            <ol className="mt-2 list-decimal space-y-0.5 pl-6 text-sm text-amber-900 dark:text-amber-200">
                {requirements.map((requirement, index) => (
                    <li key={index}>{requirement}</li>
                ))}
            </ol>
        </div>
    );
}

function ChallanPicker({ form }: { form: InvoiceFormState }) {
    return (
        <div className="grid gap-1.5">
            <Label className={fieldLabelClass}>Challans *</Label>
            {!form.partyId ? (
                <p className="py-2 text-xs text-muted-foreground">
                    Select a party to view challans
                </p>
            ) : (
                <>
                    <Input
                        type="text"
                        placeholder="Search by challan, product, PO..."
                        value={form.challanSearch}
                        onChange={(e) => form.setChallanSearch(e.target.value)}
                        className="text-xs"
                    />
                    <div className="flex items-center justify-between">
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                            <input
                                type="checkbox"
                                checked={form.allVisibleSelected}
                                onChange={form.toggleAllVisible}
                                className="rounded"
                            />
                            Select all
                        </label>
                        <span className="text-[10px] text-muted-foreground">
                            {form.challanIds.length} selected
                        </span>
                    </div>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                        {form.visibleChallans.length === 0 ? (
                            <p className="py-2 text-xs text-muted-foreground">
                                No challans for this party
                                {form.productId ? ' and PO' : ''}
                            </p>
                        ) : (
                            form.visibleChallans.map((challan) => (
                                <label
                                    key={challan.id}
                                    className="flex cursor-pointer items-center gap-2 rounded-md bg-muted/30 p-2 text-sm hover:bg-muted/60"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.challanIds.includes(
                                            challan.id,
                                        )}
                                        onChange={() =>
                                            form.toggleChallan(challan.id)
                                        }
                                        className="rounded"
                                    />
                                    <span className="font-mono text-xs">
                                        {challan.challan_number}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        —{' '}
                                        {challan.product_name ||
                                            challan.po_number ||
                                            '—'}
                                    </span>
                                    {challan.items &&
                                        challan.items.length > 0 && (
                                            <span className="ml-auto text-[10px] text-muted-foreground">
                                                {mealBreakdown(challan.items)}
                                            </span>
                                        )}
                                </label>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
