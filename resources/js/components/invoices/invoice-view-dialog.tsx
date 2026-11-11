import { FileText, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    formatTaka,
    invoiceStatusColors,
    invoiceStatusLabel,
} from '@/components/invoices/invoice-status';
import type { Invoice } from '@/components/invoices/types';
import StatusBadge from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/format';

const fieldLabelClass =
    'block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase';
const headCellClass =
    'px-3 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase';

type InvoiceViewDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoice: Invoice | null;
    onPrint: (invoice: Invoice) => void;
};

export default function InvoiceViewDialog({
    open,
    onOpenChange,
    invoice,
    onPrint,
}: InvoiceViewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
                <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <FileText className="size-4.5 text-muted-foreground" />
                        {invoice?.invoice_number || 'Invoice Details'}
                    </DialogTitle>
                </DialogHeader>
                {invoice && (
                    <InvoiceDetails invoice={invoice} onPrint={onPrint} />
                )}
            </DialogContent>
        </Dialog>
    );
}

function InvoiceDetails({
    invoice,
    onPrint,
}: {
    invoice: Invoice;
    onPrint: (invoice: Invoice) => void;
}) {
    const items = (invoice.items || []).filter((item) => item.quantity > 0);

    return (
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="break-words">
                    <span className={fieldLabelClass}>Party</span>
                    <span className="font-medium">
                        {invoice.party_name || '—'}
                    </span>
                    {invoice.party_address && (
                        <span className="block text-xs break-words text-muted-foreground">
                            {invoice.party_address}
                        </span>
                    )}
                </div>
                <div>
                    <span className={`mb-1 ${fieldLabelClass}`}>Status</span>
                    <StatusBadge
                        status={invoice.status}
                        label={invoiceStatusLabel(invoice.status)}
                        colors={invoiceStatusColors}
                    />
                </div>
                <Field label="Date">{formatDate(invoice.date)}</Field>
                <Field label="Due Date">{formatDate(invoice.due_date)}</Field>
                <Field label="Customer PO">
                    <span className="font-medium">
                        {invoice.customer_po_number || '—'}
                    </span>
                </Field>
            </div>

            {invoice.challans && invoice.challans.length > 0 && (
                <div>
                    <span className={`mb-2 ${fieldLabelClass}`}>Challans</span>
                    <div className="space-y-1">
                        {invoice.challans.map((challan) => (
                            <div
                                key={challan.id}
                                className="rounded-lg border border-border bg-muted/30 p-2"
                            >
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="font-mono font-semibold text-foreground">
                                        {challan.challan_number}
                                    </span>
                                    <span>|</span>
                                    <span>
                                        {challan.product_name ||
                                            challan.po_number ||
                                            '—'}
                                    </span>
                                    <span>|</span>
                                    <span>
                                        {formatDate(challan.challan_date)}
                                    </span>
                                    <StatusBadge
                                        status={challan.challan_status}
                                        colors={invoiceStatusColors}
                                        bordered={false}
                                        className="ml-auto"
                                    />
                                </div>
                                {challan.items && challan.items.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {challan.items.map((item, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                            >
                                                {item.meal_type}{' '}
                                                <strong className="text-foreground">
                                                    {item.quantity}
                                                </strong>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {items.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className={`${headCellClass} text-left`}>
                                    PO
                                </th>
                                <th className={`${headCellClass} text-left`}>
                                    Item Description
                                </th>
                                <th className={`${headCellClass} text-left`}>
                                    Meal
                                </th>
                                <th className={`${headCellClass} text-right`}>
                                    Qty
                                </th>
                                <th className={`${headCellClass} text-right`}>
                                    Price
                                </th>
                                <th className={`${headCellClass} text-right`}>
                                    VAT
                                </th>
                                <th className={`${headCellClass} text-right`}>
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr
                                    key={item.id}
                                    className="border-t border-border align-top first:border-t-0"
                                >
                                    <td className="px-3 py-2 text-xs break-words">
                                        {item.product_name}
                                    </td>
                                    <td className="px-3 py-2 text-xs break-words whitespace-pre-line text-muted-foreground">
                                        {item.description || '—'}
                                    </td>
                                    <td className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">
                                        {item.meal_type || '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                                        {item.quantity}
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                                        Tk {formatTaka(item.unit_price)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                                        {item.vat_rate}% (Tk{' '}
                                        {formatTaka(item.vat_amount)})
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs font-semibold whitespace-nowrap tabular-nums">
                                        Tk {formatTaka(item.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex items-center justify-between gap-4 border-t border-border pt-4 text-sm">
                {(invoice.total_vat ?? 0) > 0 ? (
                    <>
                        <Amount label="Subtotal">
                            Tk {formatTaka(invoice.subtotal || 0)}
                        </Amount>
                        <Amount label="VAT">
                            Tk {formatTaka(invoice.total_vat ?? 0)}
                        </Amount>
                        <Amount label="Total" large>
                            Tk {formatTaka(invoice.total_amount)}
                        </Amount>
                    </>
                ) : (
                    <div className="ml-auto">
                        <Amount label="Total Amount" large>
                            Tk {formatTaka(invoice.total_amount)}
                        </Amount>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-green-600">
                    <Amount label="Paid">
                        Tk {formatTaka(invoice.amount_paid)}
                    </Amount>
                </div>
                <div className="text-red-600">
                    <Amount label="Due">
                        Tk {formatTaka(invoice.amount_due)}
                    </Amount>
                </div>
            </div>
            <div className="flex justify-end">
                <Button
                    onClick={() => onPrint(invoice)}
                    className="bg-purple-500 hover:bg-purple-600"
                >
                    <Printer className="mr-1.5 size-4" />
                    Print Invoice
                </Button>
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

function Amount({
    label,
    large = false,
    children,
}: {
    label: string;
    large?: boolean;
    children: ReactNode;
}) {
    return (
        <div>
            <span className="text-muted-foreground">{label}:</span>{' '}
            <strong className={large ? 'text-lg' : undefined}>
                {children}
            </strong>
        </div>
    );
}
