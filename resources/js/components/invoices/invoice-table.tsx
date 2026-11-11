import { Link } from '@inertiajs/react';
import {
    Eye,
    FileText,
    MoreHorizontal,
    Pencil,
    Printer,
    Trash2,
} from 'lucide-react';
import {
    formatTaka,
    invoiceStatusColors,
    invoiceStatusLabel,
    printStatusColors,
} from '@/components/invoices/invoice-status';
import type { Invoice } from '@/components/invoices/types';
import StatusBadge from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/format';
import { po as purchaseOrdersPage } from '@/routes';

type InvoiceTableProps = {
    invoices: Invoice[];
    selectedIds: number[];
    onToggleSelect: (id: number) => void;
    onToggleSelectAll: () => void;
    onView: (invoice: Invoice) => void;
    onEdit: (invoice: Invoice) => void;
    onPrint: (invoice: Invoice) => void;
    onDelete: (invoice: Invoice) => void;
};

const headCellClass =
    'px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase';

export default function InvoiceTable({
    invoices,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onView,
    onEdit,
    onPrint,
    onDelete,
}: InvoiceTableProps) {
    const allSelected =
        selectedIds.length > 0 && selectedIds.length === invoices.length;

    return (
        <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                            <th className="px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={onToggleSelectAll}
                                    className="rounded"
                                />
                            </th>
                            <th className={`${headCellClass} text-left`}>
                                Number
                            </th>
                            <th className={`${headCellClass} text-left`}>
                                Party
                            </th>
                            <th className={`${headCellClass} text-left`}>PO</th>
                            <th className={`${headCellClass} text-left`}>
                                Date
                            </th>
                            <th className={`${headCellClass} text-left`}>
                                System PO
                            </th>
                            <th className={`${headCellClass} text-right`}>
                                Amount
                            </th>
                            <th className={`${headCellClass} text-right`}>
                                Paid
                            </th>
                            <th className={`${headCellClass} text-right`}>
                                Due
                            </th>
                            <th className={`${headCellClass} text-center`}>
                                Status
                            </th>
                            <th className={`${headCellClass} text-center`}>
                                Print
                            </th>
                            <th className={`${headCellClass} text-center`}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={12}
                                    className="px-4 py-16 text-center"
                                >
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <FileText className="size-8 opacity-40" />
                                        <p className="text-sm font-medium">
                                            No invoices found
                                        </p>
                                        <p className="text-xs">
                                            Create a new invoice to get started.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            invoices.map((invoice) => (
                                <tr
                                    key={invoice.id}
                                    className="border-b border-sidebar-border/70 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border"
                                >
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(
                                                invoice.id,
                                            )}
                                            onChange={() =>
                                                onToggleSelect(invoice.id)
                                            }
                                            className="rounded"
                                        />
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                                        {invoice.invoice_number}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-medium">
                                        {invoice.party_name || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        {invoice.customer_po_number || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        {formatDate(invoice.date)}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        <SystemPoLinks invoice={invoice} />
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">
                                        Tk {formatTaka(invoice.total_amount)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-green-600 tabular-nums">
                                        Tk {formatTaka(invoice.amount_paid)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-red-600 tabular-nums">
                                        Tk {formatTaka(invoice.amount_due)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <StatusBadge
                                            status={invoice.status}
                                            label={invoiceStatusLabel(
                                                invoice.status,
                                            )}
                                            colors={invoiceStatusColors}
                                            bordered={false}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <StatusBadge
                                            status={invoice.print_status}
                                            label={
                                                invoice.print_status ===
                                                'printed'
                                                    ? 'Printed'
                                                    : 'Unprinted'
                                            }
                                            colors={printStatusColors}
                                            bordered={false}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        <MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="w-36"
                                                >
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            onView(invoice)
                                                        }
                                                        className="text-xs"
                                                    >
                                                        <Eye className="mr-2 size-3.5" />
                                                        View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            onEdit(invoice)
                                                        }
                                                        className="text-xs"
                                                    >
                                                        <Pencil className="mr-2 size-3.5" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            onPrint(invoice)
                                                        }
                                                        className="text-xs"
                                                    >
                                                        <Printer className="mr-2 size-3.5" />
                                                        Print
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            onDelete(invoice)
                                                        }
                                                        className="text-xs text-red-600 focus:text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 size-3.5" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SystemPoLinks({ invoice }: { invoice: Invoice }) {
    if (!invoice.system_pos || invoice.system_pos.length === 0) {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {invoice.system_pos.map((systemPo) => (
                <Link
                    key={systemPo.id}
                    href={
                        purchaseOrdersPage({ query: { po: systemPo.id } }).url
                    }
                    className="font-mono font-medium text-primary underline-offset-2 hover:underline"
                    title={`Open ${systemPo.code}`}
                >
                    {systemPo.code}
                </Link>
            ))}
        </div>
    );
}
