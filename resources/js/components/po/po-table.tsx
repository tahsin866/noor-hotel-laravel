import { Link } from '@inertiajs/react';
import {
    CalendarClock,
    ClipboardList,
    Eye,
    Mail,
    MoreVertical,
    Package,
    Paperclip,
    Pencil,
    Printer,
    Trash2,
    Truck,
} from 'lucide-react';
import { useState } from 'react';
import { reminderStatus } from '@/components/po/po-reminder';
import { getDeliveryStatus } from '@/components/po/po-status';
import type { Product } from '@/components/po/types';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { invoices as invoicesPage } from '@/routes';

const headClass =
    'px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase';

const columns: { label: string; align: 'left' | 'right' }[] = [
    { label: 'Code', align: 'left' },
    { label: 'Name', align: 'left' },
    { label: 'Customer PO', align: 'left' },
    { label: 'Party', align: 'left' },
    { label: 'Ordered', align: 'right' },
    { label: 'Delivered', align: 'right' },
    { label: 'Remaining', align: 'right' },
    { label: 'Over', align: 'right' },
    { label: 'Status', align: 'left' },
    { label: 'Invoice', align: 'left' },
    { label: 'Reminder', align: 'left' },
    { label: 'Actions', align: 'right' },
];

const emptyCell = <span className="text-muted-foreground/40">—</span>;

function partyInitials(name?: string): string {
    if (!name) {
        return '—';
    }

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

export type PoRowActions = {
    onView: (product: Product) => void;
    onEdit: (product: Product) => void;
    onPrint: (product: Product) => void;
    onEmail: (product: Product) => void;
    onCreateChallan: (product: Product) => void;
    onSummaryChallans: (product: Product) => void;
    onDelete: (product: Product) => void;
};

function PoRow({
    product,
    now,
    actions,
}: {
    product: Product;
    now: number;
    actions: PoRowActions;
}) {
    const ordered = product.total_ordered || 0;
    const delivered = product.total_delivered || 0;
    const remaining =
        product.total_remaining ?? Math.max(0, ordered - delivered);
    const overDelivered = product.total_over_delivered ?? 0;
    const status = getDeliveryStatus(product);
    const progress = ordered > 0 ? Math.round((delivered / ordered) * 100) : 0;
    const reminder = product.reminder_at ? reminderStatus(product, now) : null;

    return (
        <tr className="border-b border-sidebar-border/70 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border">
            <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                    <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {product.code}
                    </span>
                    {product.attachment_url && (
                        <a
                            href={product.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            title="Open attachment"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <Paperclip className="size-3" />
                        </a>
                    )}
                </div>
            </td>
            <td className="px-4 py-3 font-medium text-foreground">
                {product.name}
            </td>
            <td className="px-4 py-3 text-xs text-muted-foreground">
                {product.customer_po_number || '—'}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                        {partyInitials(product.party_name)}
                    </span>
                    <span className="text-xs text-foreground/90">
                        {product.party_name || '—'}
                    </span>
                </div>
            </td>
            <td className="px-4 py-3 text-right text-xs tabular-nums">
                {ordered}
            </td>
            <td className="px-4 py-3 text-right text-xs font-medium text-emerald-600 tabular-nums">
                {delivered}
            </td>
            <td
                className={`px-4 py-3 text-right text-xs tabular-nums ${remaining > 0 ? 'font-medium text-red-600' : 'text-muted-foreground'}`}
            >
                {remaining}
            </td>
            <td
                className={`px-4 py-3 text-right text-xs tabular-nums ${overDelivered > 0 ? 'font-medium text-amber-600' : 'text-muted-foreground'}`}
                title={
                    overDelivered > 0
                        ? 'Delivered more than ordered'
                        : undefined
                }
            >
                {overDelivered > 0 ? overDelivered : '—'}
            </td>
            <td className="px-4 py-3">
                <div className="flex flex-col gap-1.5">
                    <span
                        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.color}`}
                    >
                        <span
                            className={`size-1.5 rounded-full ${status.dot}`}
                        />
                        {status.label}
                    </span>
                    {ordered > 0 && (
                        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-1 rounded-full ${status.dot}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>
            </td>
            <td className="px-4 py-3 text-xs">
                {product.invoices && product.invoices.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                        {product.invoices.map((invoice) => (
                            <Link
                                key={invoice.id}
                                href={
                                    invoicesPage({
                                        query: { invoice: invoice.id },
                                    }).url
                                }
                                className="font-mono font-medium whitespace-nowrap text-primary underline-offset-2 hover:underline"
                                title={`Open ${invoice.invoice_number}`}
                            >
                                {invoice.invoice_number}
                            </Link>
                        ))}
                    </div>
                ) : (
                    emptyCell
                )}
            </td>
            <td className="px-4 py-3">
                {reminder ? (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${reminder.className}`}
                    >
                        <CalendarClock className="size-3" />
                        {reminder.label}
                    </span>
                ) : (
                    emptyCell
                )}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center justify-end">
                    <PoRowMenu product={product} actions={actions} />
                </div>
            </td>
        </tr>
    );
}

function PoRowMenu({
    product,
    actions,
}: {
    product: Product;
    actions: PoRowActions;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                >
                    <MoreVertical className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => actions.onView(product)}>
                    <Eye className="size-3.5" />
                    View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onEdit(product)}>
                    <Pencil className="size-3.5" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onPrint(product)}>
                    <Printer className="size-3.5" />
                    Print PO
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onEmail(product)}>
                    <Mail className="size-3.5" />
                    Email
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => actions.onCreateChallan(product)}
                >
                    <Truck className="size-3.5" />
                    Create Challan
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => actions.onSummaryChallans(product)}
                >
                    <ClipboardList className="size-3.5" />
                    Summary Challans
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    onClick={() => actions.onDelete(product)}
                >
                    <Trash2 className="size-3.5" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

type PoTableProps = PoRowActions & {
    products: Product[];
};

/**
 * Purchase order list with delivery progress, linked invoices and row actions.
 */
export default function PoTable({ products, ...actions }: PoTableProps) {
    /** Captured once so "Overdue" badges stay stable while the page is open. */
    const [now] = useState(() => Date.now());

    return (
        <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                            {columns.map((column) => (
                                <th
                                    key={column.label}
                                    className={`${headClass} ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                                >
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {products.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-16 text-center"
                                >
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Package className="size-8 opacity-40" />
                                        <p className="text-sm font-medium">
                                            No purchase orders found
                                        </p>
                                        <p className="text-xs">
                                            Try adjusting the filter or create a
                                            new order.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => (
                                <PoRow
                                    key={product.id}
                                    product={product}
                                    now={now}
                                    actions={actions}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
