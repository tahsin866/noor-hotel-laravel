import { Link } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Paperclip,
    RotateCcw,
    Search,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { invoices as invoicesPage } from '@/routes';

type Party = { id: number; party_name: string };

type ReceivedPayment = {
    id: number;
    payment_number: string | null;
    invoice_id: number;
    invoice_number: string;
    party_name: string;
    payment_date: string | null;
    amount: number;
    reduce_amount: number;
    payment_method: string | null;
    payment_status: string | null;
    reference_number: string | null;
    customer_bank_name: string | null;
    user_bank_name: string | null;
    notes: string | null;
    attachment: string | null;
};

const methodLabels: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    mobile: 'Mobile Banking',
};

const headerCell =
    'px-4 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase';

function formatAmount(value: number): string {
    return Math.round(value || 0).toLocaleString('en-US');
}

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('en-GB');
}

function formatMethod(value: string | null): string {
    if (!value) {
        return '—';
    }

    return methodLabels[value] ?? value.replace(/_/g, ' ');
}

export default function ReceivedPaymentsTable({
    parties,
}: {
    parties: Party[];
}) {
    const [payments, setPayments] = useState<ReceivedPayment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [partyId, setPartyId] = useState('');
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchPayments = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('per_page', String(perPage));

            if (partyId) {
                params.set('party_id', partyId);
            }

            if (search.trim()) {
                params.set('search', search.trim());
            }

            if (dateFrom) {
                params.set('date_from', dateFrom);
            }

            if (dateTo) {
                params.set('date_to', dateTo);
            }

            const res = await fetch(`/api/payments?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();

            setPayments(data.data?.items || []);
            setTotal(data.data?.total || 0);
        } catch {
            toast.error('Failed to load payments');
        } finally {
            setLoading(false);
        }
    }, [page, perPage, partyId, search, dateFrom, dateTo]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const from = total === 0 ? 0 : (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);
    const pageTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const hasFilters = partyId || search || dateFrom || dateTo;

    return (
        <>
            <div className="flex flex-wrap items-end gap-3">
                <select
                    value={partyId}
                    onChange={(e) => {
                        setPartyId(e.target.value);
                        setPage(1);
                    }}
                    aria-label="Filter by party"
                    className="flex h-8 w-56 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs"
                >
                    <option value="">All Parties</option>
                    {parties.map((party) => (
                        <option key={party.id} value={party.id}>
                            {party.party_name}
                        </option>
                    ))}
                </select>
                <div className="relative">
                    <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Payment #, invoice #, party, ref..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="h-8 w-64 pl-8 text-xs"
                    />
                </div>
                <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPage(1);
                    }}
                    aria-label="From date"
                    className="h-8 w-36 text-xs"
                />
                <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                        setDateTo(e.target.value);
                        setPage(1);
                    }}
                    aria-label="To date"
                    className="h-8 w-36 text-xs"
                />
                {hasFilters && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                            setPartyId('');
                            setSearch('');
                            setDateFrom('');
                            setDateTo('');
                            setPage(1);
                        }}
                    >
                        <RotateCcw className="mr-1.5 size-3.5" />
                        Reset
                    </Button>
                )}
                <span className="ml-auto text-xs font-medium text-muted-foreground">
                    {from}–{to} of {total} payment{total === 1 ? '' : 's'}
                </span>
                <select
                    value={perPage}
                    onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setPage(1);
                    }}
                    aria-label="Payments per page"
                    className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs"
                >
                    {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                            {n} / page
                        </option>
                    ))}
                </select>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                                <th className={`${headerCell} text-left`}>
                                    Payment No
                                </th>
                                <th className={`${headerCell} text-left`}>
                                    Invoice No
                                </th>
                                <th className={`${headerCell} text-left`}>
                                    Party
                                </th>
                                <th className={`${headerCell} text-left`}>
                                    Date
                                </th>
                                <th className={`${headerCell} text-left`}>
                                    Method
                                </th>
                                <th className={`${headerCell} text-left`}>
                                    Reference / Bank
                                </th>
                                <th className={`${headerCell} text-right`}>
                                    Amount
                                </th>
                                <th className={`${headerCell} text-center`}>
                                    Attachment
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                                    >
                                        {loading
                                            ? 'Loading payments...'
                                            : 'No payments recorded yet'}
                                    </td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr
                                        key={payment.id}
                                        className="border-b border-sidebar-border/50 last:border-0 hover:bg-muted/30 dark:border-sidebar-border"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap">
                                            {payment.payment_number || '—'}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                                            <Link
                                                href={
                                                    invoicesPage({
                                                        query: {
                                                            invoice:
                                                                payment.invoice_id,
                                                        },
                                                    }).url
                                                }
                                                className="text-primary underline-offset-2 hover:underline"
                                                title={`Open ${payment.invoice_number}`}
                                            >
                                                {payment.invoice_number}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {payment.party_name}
                                        </td>
                                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                                            {formatDate(payment.payment_date)}
                                        </td>
                                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                                            {formatMethod(
                                                payment.payment_method,
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {[
                                                payment.reference_number,
                                                payment.customer_bank_name,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ') || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap tabular-nums">
                                            Tk {formatAmount(payment.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {payment.attachment ? (
                                                <a
                                                    href={payment.attachment}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="Open attachment"
                                                    className="inline-flex size-7 items-center justify-center rounded-md hover:bg-accent"
                                                >
                                                    <Paperclip className="size-3.5" />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {payments.length > 0 && (
                            <tfoot>
                                <tr className="border-t border-sidebar-border/70 bg-muted/30 dark:border-sidebar-border">
                                    <td
                                        colSpan={6}
                                        className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground"
                                    >
                                        Total on this page
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-bold whitespace-nowrap tabular-nums">
                                        Tk {formatAmount(pageTotal)}
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {total > 0 && (
                <div className="flex items-center justify-between gap-2 border-t border-sidebar-border/70 pt-4 dark:border-sidebar-border">
                    <span className="text-xs text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                        >
                            <ChevronLeft className="mr-1 size-3.5" /> Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                        >
                            Next <ChevronRight className="ml-1 size-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
