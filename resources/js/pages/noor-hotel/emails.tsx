import { Head, Link } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Inbox, MailOpen, ShoppingCart, CalendarClock, AlertCircle } from 'lucide-react';

type EmailRecord = {
    id: number;
    message_id: string;
    from_email: string;
    from_name: string | null;
    subject: string;
    body: string | null;
    html_body: string | null;
    email_date: string;
    type: string;
    status: string;
    po_number: string | null;
    po_date: string | null;
    deadline: string | null;
    supplier_name: string | null;
    total_amount: number | null;
    currency: string | null;
    notes: string | null;
    imported_at: string;
};

const typeIcons: Record<string, typeof Inbox> = {
    purchase_order: ShoppingCart,
    deadline: CalendarClock,
    general: Inbox,
};

const typeColors: Record<string, string> = {
    purchase_order: 'bg-blue-100 text-blue-700',
    deadline: 'bg-amber-100 text-amber-700',
    general: 'bg-slate-100 text-slate-600',
};

const statusColors: Record<string, string> = {
    new: 'bg-green-100 text-green-700',
    read: 'bg-slate-100 text-slate-600',
    archived: 'bg-red-100 text-red-700',
};

const typeFilters = [
    { v: '', l: 'All' },
    { v: 'purchase_order', l: 'Purchase Orders' },
    { v: 'deadline', l: 'Deadlines' },
    { v: 'general', l: 'General' },
];

const statusFilters = [
    { v: '', l: 'All' },
    { v: 'new', l: 'New' },
    { v: 'read', l: 'Read' },
    { v: 'archived', l: 'Archived' },
];

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB');
}

function fmtDateTime(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB');
}

function fmtAmount(n: number | null, currency: string | null) {
    if (n === null) return '—';
    const sym = currency === 'BDT' ? 'Tk ' : currency ? `${currency} ` : '';
    return sym + Math.round(n).toLocaleString('en-US');
}

export default function EmailedPurchaseOrders({
    emails,
    filters,
}: {
    emails: EmailRecord[];
    filters: { type: string; status: string };
}) {
    const [selected, setSelected] = useState<EmailRecord | null>(null);

    return (
        <>
            <Head title="Emailed POs & Deadlines" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex items-center gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                        <Inbox className="size-5 text-foreground/80" />
                    </div>
                    <Heading
                        variant="small"
                        title="Emailed POs & Deadlines"
                        description="Purchase orders and deadlines detected from email"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                        {typeFilters.map((f) => (
                            <Link
                                key={f.v}
                                href={filters.type === f.v && !filters.status ? '/emails' : `/emails?type=${f.v}${filters.status ? `&status=${filters.status}` : ''}`}
                                preserveState
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filters.type === f.v ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {f.l}
                            </Link>
                        ))}
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                        {statusFilters.map((f) => (
                            <Link
                                key={f.v}
                                href={filters.status === f.v && !filters.type ? '/emails' : `/emails?status=${f.v}${filters.type ? `&type=${filters.type}` : ''}`}
                                preserveState
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filters.status === f.v ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {f.l}
                            </Link>
                        ))}
                    </div>
                    <span className="ml-auto text-xs font-medium text-muted-foreground">
                        {emails.length} email{emails.length === 1 ? '' : 's'}
                    </span>
                </div>

                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">From</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Subject</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">PO #</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Supplier</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Deadline</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {emails.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Inbox className="size-8 opacity-40" />
                                                <p className="text-sm font-medium">No emails imported yet</p>
                                                <p className="text-xs text-muted-foreground/60">Run <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">php artisan emails:import</code> to import emails</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    emails.map((email) => {
                                        const TypeIcon = typeIcons[email.type] || Inbox;
                                        return (
                                            <tr
                                                key={email.id}
                                                className="cursor-pointer border-b border-sidebar-border/70 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border"
                                                onClick={() => setSelected(email)}
                                            >
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColors[email.type] || 'bg-slate-100 text-slate-600'}`}>
                                                        <TypeIcon className="size-3" />
                                                        {email.type === 'purchase_order' ? 'PO' : email.type === 'deadline' ? 'Deadline' : 'General'}
                                                    </span>
                                                </td>
                                                <td className="max-w-32 truncate px-4 py-3 text-xs font-medium" title={email.from_email}>
                                                    {email.from_name || email.from_email}
                                                </td>
                                                <td className="max-w-48 truncate px-4 py-3 text-xs font-medium" title={email.subject}>
                                                    {email.subject}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs font-semibold">{email.po_number || '—'}</td>
                                                <td className="max-w-28 truncate px-4 py-3 text-xs text-muted-foreground" title={email.supplier_name ?? ''}>
                                                    {email.supplier_name || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">{fmtAmount(email.total_amount, email.currency)}</td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    {email.deadline ? (
                                                        <span className="flex items-center gap-1">
                                                            <AlertCircle className="size-3 text-amber-500" />
                                                            {fmtDate(email.deadline)}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(email.email_date)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[email.status] || 'bg-slate-100 text-slate-600'}`}>
                                                        {email.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="space-y-1 border-b border-border pb-4 shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColors[selected?.type || 'general'] || 'bg-slate-100 text-slate-600'}`}>
                                {selected?.type === 'purchase_order' ? 'PO' : selected?.type === 'deadline' ? 'Deadline' : 'General'}
                            </span>
                            <span className="truncate text-sm font-semibold">{selected?.subject}</span>
                        </DialogTitle>
                        {selected?.notes && (
                            <DialogDescription className="text-xs">{selected.notes}</DialogDescription>
                        )}
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-3 py-2 text-sm overflow-y-auto flex-1 min-h-0">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">From</span>
                                    <p className="text-xs font-medium">{selected.from_name || selected.from_email}</p>
                                    <p className="text-[11px] text-muted-foreground">{selected.from_email}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Email Date</span>
                                    <p className="text-xs">{fmtDateTime(selected.email_date)}</p>
                                </div>
                            </div>
                            {selected.po_number && (
                                <div>
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">PO Number</span>
                                    <p className="text-xs font-mono font-semibold">{selected.po_number}</p>
                                </div>
                            )}
                            {selected.supplier_name && (
                                <div>
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Supplier</span>
                                    <p className="text-xs font-medium">{selected.supplier_name}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                {selected.po_date && (
                                    <div>
                                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">PO Date</span>
                                        <p className="text-xs">{fmtDate(selected.po_date)}</p>
                                    </div>
                                )}
                                {selected.deadline && (
                                    <div>
                                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Deadline</span>
                                        <p className="flex items-center gap-1 text-xs text-amber-600">
                                            <AlertCircle className="size-3" />
                                            {fmtDateTime(selected.deadline)}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {selected.total_amount !== null && (
                                <div>
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Total Amount</span>
                                    <p className="text-sm font-semibold">{fmtAmount(selected.total_amount, selected.currency)}</p>
                                </div>
                            )}
                            <div className="pt-2 border-t border-border">
                                <span className="text-[10px] font-semibold uppercase text-muted-foreground">Status</span>
                                <p>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[selected.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {selected.status}
                                    </span>
                                </p>
                            </div>
                            <div className="pt-2 border-t border-border">
                                <span className="text-[10px] font-semibold uppercase text-muted-foreground">Email Body</span>
                                {selected.html_body ? (
                                    <div
                                        className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-xs overflow-auto max-h-64 [&_img]:max-w-full [&_img]:h-auto"
                                        dangerouslySetInnerHTML={{ __html: selected.html_body }}
                                    />
                                ) : selected.body ? (
                                    <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-xs overflow-auto max-h-64 font-sans">
                                        {selected.body}
                                    </pre>
                                ) : (
                                    <p className="mt-2 text-xs text-muted-foreground italic">No body content available</p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

EmailedPurchaseOrders.layout = {
    breadcrumbs: [
        {
            title: 'Emails',
            href: '/emails',
        },
    ],
};
