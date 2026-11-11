import { FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { challanStatusColors } from '@/components/challans/challan-status';
import type { Challan } from '@/components/challans/types';
import StatusBadge from '@/components/shared/status-badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatAmount, formatDate } from '@/lib/format';
import { formatMealType, mealBadgeClass } from '@/lib/meals';

const fieldLabelClass =
    'block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase';
const headCellClass =
    'px-3 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase';

type ChallanViewDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    challan: Challan | null;
};

export default function ChallanViewDialog({
    open,
    onOpenChange,
    challan,
}: ChallanViewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader className="space-y-1 border-b border-border pb-4">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <FileText className="size-4.5 text-muted-foreground" />
                        {challan?.challan_number || 'Challan Details'}
                    </DialogTitle>
                </DialogHeader>
                {challan && <ChallanDetails challan={challan} />}
            </DialogContent>
        </Dialog>
    );
}

function ChallanDetails({ challan }: { challan: Challan }) {
    return (
        <div className="max-h-[65vh] space-y-5 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Challan No">
                    <span className="font-mono text-xs font-semibold">
                        {challan.challan_number || '—'}
                    </span>
                </Field>
                <Field label="Product">{challan.product_name || '—'}</Field>
                <Field label="PO">{challan.po_number || '—'}</Field>
                <Field label="Customer PO">
                    {challan.customer_po_number || '—'}
                </Field>
                <Field label="Party">{challan.party_name || '—'}</Field>
                <Field label="Date">{formatDate(challan.date)}</Field>
                <Field label="Total Qty">
                    <span className="tabular-nums">
                        {challan.total_qty ?? 0}
                    </span>
                </Field>
                <div>
                    <span className={`mb-1 ${fieldLabelClass}`}>Status</span>
                    <StatusBadge
                        status={challan.status}
                        colors={challanStatusColors}
                    />
                </div>
            </div>

            {challan.address && (
                <TextBlock label="Delivery Address">
                    {challan.address}
                </TextBlock>
            )}
            {challan.notes && (
                <TextBlock label="Notes">{challan.notes}</TextBlock>
            )}

            <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/50">
                            <th className={`${headCellClass} text-left`}>
                                Item
                            </th>
                            <th className={`${headCellClass} text-center`}>
                                Qty
                            </th>
                            <th className={`${headCellClass} text-right`}>
                                Unit Price
                            </th>
                            <th className={`${headCellClass} text-right`}>
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {challan.items
                            .filter((item) => item.quantity > 0)
                            .map((item, index) => (
                                <tr
                                    key={index}
                                    className="border-t border-border first:border-t-0"
                                >
                                    <td className="px-3 py-2 text-xs">
                                        <span className="font-medium">
                                            {item.product_name}
                                        </span>
                                        <span
                                            className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${mealBadgeClass(item.meal_type)}`}
                                        >
                                            {formatMealType(item.meal_type)}
                                        </span>
                                        {item.description &&
                                            item.description !== '-' && (
                                                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                                    {item.description}
                                                </span>
                                            )}
                                    </td>
                                    <td className="px-3 py-2 text-center text-xs tabular-nums">
                                        {item.quantity}
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                                        ৳{formatAmount(item.unit_price || 0)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">
                                        ৳
                                        {formatAmount(
                                            item.quantity *
                                                (item.unit_price || 0),
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                    <span>{challan.total_qty ?? 0} total qty</span>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                        Total: ৳{formatAmount(challan.total_amount || 0)}
                    </span>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <span className={fieldLabelClass}>{label}</span>
            <span>{children}</span>
        </div>
    );
}

function TextBlock({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <span className={`mb-1 ${fieldLabelClass}`}>{label}</span>
            <p className="text-foreground/90">{children}</p>
        </div>
    );
}
