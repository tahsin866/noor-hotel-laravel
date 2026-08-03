import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
    AlertCircle,
    Banknote,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    CreditCard,
    FileDown,
    FileStack,
    FileText,
    Landmark,
    Paperclip,
    Percent,
    Printer,
    Receipt,
    RotateCcw,
    Scale,
    Search,
    Smartphone,
    Wallet,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Party = { id: number; party_name: string };

type Row = {
    id: number;
    invoice_id: number;
    invoice_number: string;
    party_id: number | null;
    party_name: string;
    payment_date: string;
    amount: number;
    payment_method: string | null;
    reference_number: string | null;
    notes: string | null;
    payment_status: string | null;
    customer_bank_name: string | null;
    user_bank_name: string | null;
    reduce_amount: number | null;
    reduce_note: string | null;
    attachment: string | null;
    invoice_status: string | null;
    is_unpaid: boolean;
};

type Summary = {
    total_payments: number;
    total_amount: number;
    total_reduce: number;
    chalan_total: number;
    paid_total: number;
    due_total: number;
    unpaid_count: number;
    unpaid_amount: number;
    total_receivable: number;
    cash_count: number;
    cash_amount: number;
    bank_transfer_count: number;
    bank_transfer_amount: number;
    cheque_count: number;
    cheque_amount: number;
    mobile_count: number;
    mobile_amount: number;
    paid_count: number;
    paid_amount: number;
    partial_count: number;
    partial_amount: number;
    due_count: number;
    due_amount: number;
};

type Pagination = {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
};

const statusFilters = [
    { v: 'all', l: 'All' },
    { v: 'paid', l: 'Paid' },
    { v: 'partial', l: 'Partial' },
    { v: 'due', l: 'Due' },
    { v: 'unpaid', l: 'Unpaid' },
];

const methodFilters = [
    { v: 'all', l: 'All Methods' },
    { v: 'cash', l: 'Cash' },
    { v: 'bank_transfer', l: 'Bank Transfer' },
    { v: 'cheque', l: 'Cheque' },
    { v: 'mobile', l: 'Mobile' },
];

const methodLabels: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    mobile: 'Mobile',
};

const methodBadge: Record<string, string> = {
    cash: 'bg-emerald-100 text-emerald-700',
    bank_transfer: 'bg-blue-100 text-blue-700',
    cheque: 'bg-purple-100 text-purple-700',
    mobile: 'bg-amber-100 text-amber-700',
};

const statusMeta: Record<string, { label: string; dot: string; color: string; icon: typeof CheckCircle2 }> = {
    paid: { label: 'Paid', dot: 'bg-emerald-500', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    partial: { label: 'Partial', dot: 'bg-amber-500', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    due: { label: 'Due', dot: 'bg-red-500', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
    unpaid: { label: 'Unpaid', dot: 'bg-rose-500', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
};

function fmt$(n: number | string) {
    return Math.round(parseFloat(String(n || 0))).toLocaleString('en-US');
}

function fmtNum(n: number | string) {
    return Number(n || 0).toLocaleString('en-US');
}

function fmtDate(d: string) {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return day && m && y ? `${day}/${m}/${y}` : d;
}

function formatMethod(m: string | null) {
    return m ? methodLabels[m] || m.replace(/_/g, ' ') : '—';
}

export default function PaymentReport({ parties }: { parties: Party[] }) {
    const [rows, setRows] = useState<Row[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [filter, setFilter] = useState('all');
    const [method, setMethod] = useState('all');
    const [search, setSearch] = useState('');
    const [partyFilter, setPartyFilter] = useState('');
    const [partyFilterOpen, setPartyFilterOpen] = useState(false);
    const [partyFilterSearch, setPartyFilterSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [pagination, setPagination] = useState<Pagination>({ current_page: 1, per_page: 10, total: 0, last_page: 1 });

    const filteredFilterParties = parties.filter((p) =>
        p.party_name.toLowerCase().includes(partyFilterSearch.toLowerCase())
    );

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('status', filter);
            if (method !== 'all') params.set('method', method);
            if (partyFilter) params.set('party_id', partyFilter);
            if (search.trim()) params.set('search', search.trim());
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);
            params.set('page', String(page));
            params.set('per_page', String(perPage));
            const res = await fetch(`/api/reports/payment?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            if (data.success) {
                setRows(data.data.rows || []);
                setSummary(data.data.summary || null);
                setPagination(data.data.pagination || { current_page: 1, per_page: 10, total: 0, last_page: 1 });
            } else {
                toast.error(data.message || 'Failed to load report');
            }
        } catch {
            toast.error('Failed to load report');
        } finally {
            setLoading(false);
        }
    }, [filter, method, partyFilter, search, dateFrom, dateTo, page, perPage]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const buildRowHtml = (r: Row, i: number) => {
        return `<tr>
            <td style="padding:4px 6px;border:1px solid #000;font-size:10px;text-align:center;">${i + 1}</td>
            <td style="padding:4px 6px;border:1px solid #000;font-size:10px;text-align:center;">${fmtDate(r.payment_date)}</td>
            <td style="padding:4px 6px;border:1px solid #000;font-size:10px;font-weight:600;">${r.invoice_number}</td>
            <td style="padding:4px 6px;border:1px solid #000;font-size:10px;">${r.party_name || '—'}</td>
            <td style="padding:4px 6px;border:1px solid #000;font-size:10px;text-align:center;">${formatMethod(r.payment_method)}</td>
            <td style="padding:4px 6px;border:1px solid #000;font-size:10px;">${r.reference_number || '—'}</td>
            <td style="padding:4px 6px;border:1px solid #000;font-size:10px;text-align:right;font-weight:bold;">Tk ${fmt$(r.amount)}</td>
            <td style="padding:4px 6px;border:1px solid #000;font-size:10px;text-align:right;color:#dc2626;">${r.reduce_amount ? 'Tk '.concat(fmt$(r.reduce_amount)) : '—'}</td>
            <td style="padding:4px 6px;border:1px solid #000;font-size:10px;text-align:center;text-transform:capitalize;">${r.payment_status || '—'}</td>
        </tr>`;
    };

    const buildPageHtml = (chunkRows: Row[], startIndex: number, isLast: boolean) => {
        const body = chunkRows.map((r, idx) => buildRowHtml(r, startIndex + idx)).join('');
        return `<table style="${isLast ? '' : 'page-break-after: always;'}">
            <thead>
                <tr>
                    <th colspan="9" style="padding:4px 6px;border:none;text-align:center;background:#fff;">
                        <div class="title">PAYMENT REPORT</div>
                        <div class="sub-title">Generated by M/S Noor Hotel and Restaurant</div>
                    </th>
                </tr>
                <tr style="background:#f1f5f9;">
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:24px;">#</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:68px;">Date</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Invoice</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Party</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:90px;">Method</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Reference</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:80px;">Amount</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:70px;">Reduce</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:70px;">Status</th>
                </tr>
            </thead>
            <tbody>${body}</tbody>
        </table>`;
    };

    const fetchAllRows = async (): Promise<Row[] | null> => {
        try {
            const all: Row[] = [];
            let currentPage = 1;
            while (true) {
                const params = new URLSearchParams();
                if (filter !== 'all') params.set('status', filter);
                if (method !== 'all') params.set('method', method);
                if (partyFilter) params.set('party_id', partyFilter);
                if (search.trim()) params.set('search', search.trim());
                if (dateFrom) params.set('date_from', dateFrom);
                if (dateTo) params.set('date_to', dateTo);
                params.set('page', String(currentPage));
                params.set('per_page', '1000');
                const res = await fetch(`/api/reports/payment?${params.toString()}`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                });
                const data = await res.json();
                if (!data.success) {
                    toast.error(data.message || 'Failed to load report');
                    return null;
                }
                const pageRows: Row[] = data.data.rows || [];
                if (pageRows.length === 0) {
                    break;
                }
                all.push(...pageRows);
                if (all.length >= (data.data.pagination?.total ?? all.length)) {
                    break;
                }
                currentPage += 1;
                if (currentPage > 100) {
                    break;
                }
            }
            return all;
        } catch {
            toast.error('Failed to load report data');
            return null;
        }
    };

    const printReport = async () => {
        if (!summary) {
            toast.error('No data to print');
            return;
        }
        const allRows = await fetchAllRows();
        if (!allRows || allRows.length === 0) {
            toast.error('No data to print');
            return;
        }

        const pagesHtml = [];
        for (let start = 0; start < allRows.length; start += 10) {
            const chunk = allRows.slice(start, start + 10);
            const isLast = start + 10 >= allRows.length;
            pagesHtml.push(buildPageHtml(chunk, start, isLast));
        }

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Payment Report</title>
        <style>
            @page{size:A4 landscape;margin:6mm;}
            *{box-sizing:border-box;}
            body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:0;font-size:10px;}
            table{width:100%;border-collapse:collapse;}
            th,td{border:1px solid #000;}
            thead{display:table-header-group;}
            tr{page-break-inside:avoid;}
            .title{font-size:18px;margin:0;color:#0f172a;text-transform:uppercase;letter-spacing:1.5px;}
            .sub-title{font-size:10px;color:#64748b;margin:2px 0 0;}
            .section-title{margin:0;font-size:10px;text-transform:uppercase;color:#475569;letter-spacing:0.5px;}
            .footer{margin-top:8px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:4px;}
        </style></head><body>
        ${pagesHtml.join('')}
        <table style="page-break-before: always;">
            <tr>
                <td style="padding:4px 6px;border:1px solid #000;width:50%;vertical-align:top;">
                    <div class="section-title" style="margin-bottom:4px;">Summary</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 12px;">
                        <div>Total Payments: <strong>${summary.total_payments}</strong></div>
                        <div>Unpaid Invoices: <strong>${summary.unpaid_count}</strong></div>
                        <div>Total Chalan Amount: <strong>Tk ${fmt$(summary.chalan_total)}</strong></div>
                        <div>Total Paid: <strong>Tk ${fmt$(summary.paid_total)}</strong></div>
                        <div>Balance (Due): <strong>Tk ${fmt$(summary.due_total)}</strong></div>
                        <div>Total Amount: <strong>Tk ${fmt$(summary.total_amount)}</strong></div>
                        <div>Unpaid Amount: <strong>Tk ${fmt$(summary.unpaid_amount)}</strong></div>
                        <div>Total Reduce: <strong>Tk ${fmt$(summary.total_reduce)}</strong></div>
                        <div>Total Receivable: <strong>Tk ${fmt$(summary.total_receivable)}</strong></div>
                    </div>
                </td>
                <td style="padding:4px 6px;border:1px solid #000;width:50%;vertical-align:top;">
                    <div class="section-title" style="margin-bottom:4px;">Method-wise Total Value</div>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#dcfce7;">Cash (${summary.cash_count})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#dcfce7;">Tk ${fmt$(summary.cash_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#dbeafe;">Bank Transfer (${summary.bank_transfer_count})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#dbeafe;">Tk ${fmt$(summary.bank_transfer_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#f3e8ff;">Cheque (${summary.cheque_count})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#f3e8ff;">Tk ${fmt$(summary.cheque_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#fef3c7;">Mobile (${summary.mobile_count})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#fef3c7;">Tk ${fmt$(summary.mobile_amount)}</td>
                        </tr>
                    </table>
                    <div class="section-title" style="margin:8px 0 4px;">Payment Status</div>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">Paid (${summary.paid_count})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">Tk ${fmt$(summary.paid_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">Partial (${summary.partial_count})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">Tk ${fmt$(summary.partial_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">Due (${summary.due_count})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">Tk ${fmt$(summary.due_amount)}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <div class="footer">Generated by M/S Noor Hotel and Restaurant</div>
        </body></html>`;

        const win = window.open('', '_blank', 'width=1100,height=600');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 500);
        }
    };

    const exportToExcel = async () => {
        if (!summary) {
            toast.error('No data to export');
            return;
        }
        const allRows = await fetchAllRows();
        if (!allRows || allRows.length === 0) {
            toast.error('No data to export');
            return;
        }

        const paymentRows = allRows.map((r, i) => ({
            '#': i + 1,
            Type: r.is_unpaid ? 'Unpaid' : 'Payment',
            Date: fmtDate(r.payment_date),
            Invoice: r.invoice_number,
            Party: r.party_name || '',
            Method: formatMethod(r.payment_method),
            Reference: r.reference_number || '',
            Amount: r.amount,
            Reduce: r.reduce_amount ?? 0,
            Status: r.payment_status || '',
            Notes: r.notes || '',
        }));

        const summaryRows = [
            { Metric: 'Total Payments', Value: summary.total_payments },
            { Metric: 'Total Amount', Value: summary.total_amount },
            { Metric: 'Total Reduce', Value: summary.total_reduce },
            { Metric: 'Total Chalan Amount', Value: summary.chalan_total },
            { Metric: 'Total Paid', Value: summary.paid_total },
            { Metric: 'Balance (Due)', Value: summary.due_total },
            { Metric: 'Unpaid Invoices', Value: summary.unpaid_count },
            { Metric: 'Unpaid Amount', Value: summary.unpaid_amount },
            { Metric: 'Total Receivable', Value: summary.total_receivable },
            { Metric: 'Cash', Value: `${summary.cash_count} / Tk ${fmt$(summary.cash_amount)}` },
            { Metric: 'Bank Transfer', Value: `${summary.bank_transfer_count} / Tk ${fmt$(summary.bank_transfer_amount)}` },
            { Metric: 'Cheque', Value: `${summary.cheque_count} / Tk ${fmt$(summary.cheque_amount)}` },
            { Metric: 'Mobile', Value: `${summary.mobile_count} / Tk ${fmt$(summary.mobile_amount)}` },
            { Metric: 'Paid', Value: `${summary.paid_count} / Tk ${fmt$(summary.paid_amount)}` },
            { Metric: 'Partial', Value: `${summary.partial_count} / Tk ${fmt$(summary.partial_amount)}` },
            { Metric: 'Due', Value: `${summary.due_count} / Tk ${fmt$(summary.due_amount)}` },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), 'Payments');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
        XLSX.writeFile(wb, 'payment_report.xlsx');
    };

    const hasFilters = filter !== 'all' || method !== 'all' || partyFilter !== '' || search !== '' || dateFrom !== '' || dateTo !== '';

    const pageCollected = rows.filter((r) => !r.is_unpaid).reduce((s, r) => s + Number(r.amount || 0), 0);
    const pageUnpaid = rows.filter((r) => r.is_unpaid).reduce((s, r) => s + Number(r.amount || 0), 0);
    const pageReduce = rows.reduce((s, r) => s + Number(r.reduce_amount || 0), 0);

    const pageNumbers: number[] = [];
    const windowSize = 5;
    const pagesStart = Math.max(1, pagination.current_page - Math.floor(windowSize / 2));
    const pagesEnd = Math.min(pagination.last_page, pagesStart + windowSize - 1);
    for (let p = Math.max(1, pagesEnd - windowSize + 1); p <= pagesEnd; p += 1) {
        pageNumbers.push(p);
    }

    return (
        <>
            <Head title="Payments Report" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <CreditCard className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Payments Report" description="View payment history and collections" />
                    </div>
                    <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!summary || pagination.total === 0}>
                        <FileDown className="mr-1.5 size-4" />
                        Export Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={printReport} disabled={!summary || pagination.total === 0}>
                        <Printer className="mr-1.5 size-4" />
                        Print Report
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                        {statusFilters.map((f) => (
                            <button
                                key={f.v}
                                onClick={() => { setFilter(f.v); setPage(1); }}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.v ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {f.l}
                            </button>
                        ))}
                    </div>
                    <select
                        value={method}
                        onChange={(e) => { setMethod(e.target.value); setPage(1); }}
                        className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                    >
                        {methodFilters.map((f) => (
                            <option key={f.v} value={f.v}>
                                {f.l}
                            </option>
                        ))}
                    </select>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setPartyFilterOpen((v) => !v)}
                            className="flex h-8 w-48 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                        >
                            <span className="whitespace-nowrap">
                                {partyFilter ? parties.find((p) => p.id === Number(partyFilter))?.party_name || 'All Parties' : 'All Parties'}
                            </span>
                            <ChevronDown className="size-3.5 shrink-0 opacity-50" />
                        </button>
                        {partyFilterOpen && (
                            <>
                                <div className="absolute z-50 mt-1 w-full min-w-56 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md">
                                    <Input
                                        autoFocus
                                        placeholder="Search party..."
                                        value={partyFilterSearch}
                                        onChange={(e) => setPartyFilterSearch(e.target.value)}
                                        className="h-7 text-xs"
                                    />
                                    <div className="mt-1 max-h-60 overflow-auto">
                                        <button
                                            type="button"
                                            className={`w-full rounded-sm px-3 py-2 text-left text-xs transition-colors hover:bg-accent ${partyFilter === '' ? 'bg-accent font-medium' : ''}`}
                                            onClick={() => {
                                                setPartyFilter('');
                                                setPartyFilterOpen(false);
                                                setPartyFilterSearch('');
                                                setPage(1);
                                            }}
                                        >
                                            All Parties
                                        </button>
                                        {filteredFilterParties.length === 0 ? (
                                            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No parties found</div>
                                        ) : (
                                            filteredFilterParties.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className={`w-full rounded-sm px-3 py-2 text-left text-xs transition-colors hover:bg-accent ${partyFilter === String(p.id) ? 'bg-accent font-medium' : ''}`}
                                                    onClick={() => {
                                                        setPartyFilter(String(p.id));
                                                        setPartyFilterOpen(false);
                                                        setPartyFilterSearch('');
                                                        setPage(1);
                                                    }}
                                                >
                                                    {p.party_name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => {
                                        setPartyFilterOpen(false);
                                        setPartyFilterSearch('');
                                    }}
                                />
                            </>
                        )}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search invoice, party or reference..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="h-8 w-56 pl-8 text-xs"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="h-8 w-40 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="h-8 w-40 text-xs"
                        />
                    </div>
                    {hasFilters && (
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setFilter('all'); setMethod('all'); setPartyFilter(''); setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}>
                            <RotateCcw className="mr-1.5 size-3.5" />
                            Reset
                        </Button>
                    )}
                </div>

                {summary && (
                    <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {[
                                { label: 'Total Chalan Amount', value: `Tk ${fmt$(summary.chalan_total)}`, icon: FileStack, color: 'text-indigo-600' },
                                { label: 'Total Paid', value: `Tk ${fmt$(summary.paid_total)}`, icon: Banknote, color: 'text-emerald-600' },
                                { label: 'Balance (Due)', value: `Tk ${fmt$(summary.due_total)}`, icon: Scale, color: 'text-red-600' },
                            ].map((s) => (
                                <div key={s.label} className="rounded-lg border border-sidebar-border/70 bg-muted/30 p-4 dark:border-sidebar-border">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <s.icon className="size-4" />
                                        {s.label}
                                    </div>
                                    <div className={`mt-1 text-xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
                                </div>
                            ))}
                        </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-9">
                        {[
                            { label: 'Payments', value: summary.total_payments, icon: Receipt, color: 'text-foreground' },
                            { label: 'Unpaid Invoices', value: `${summary.unpaid_count} / Tk ${fmt$(summary.unpaid_amount)}`, icon: AlertCircle, color: 'text-rose-600' },
                            { label: 'Total Amount', value: `Tk ${fmt$(summary.total_amount)}`, icon: Banknote, color: 'text-emerald-600' },
                            { label: 'Total Receivable', value: `Tk ${fmt$(summary.total_receivable)}`, icon: CreditCard, color: 'text-foreground font-bold' },
                            { label: 'Total Reduce', value: `Tk ${fmt$(summary.total_reduce)}`, icon: Percent, color: 'text-red-600' },
                            { label: 'Cash', value: `${summary.cash_count} / Tk ${fmt$(summary.cash_amount)}`, icon: Wallet, color: 'text-emerald-600' },
                            { label: 'Bank Transfer', value: `${summary.bank_transfer_count} / Tk ${fmt$(summary.bank_transfer_amount)}`, icon: Landmark, color: 'text-blue-600' },
                            { label: 'Cheque', value: `${summary.cheque_count} / Tk ${fmt$(summary.cheque_amount)}`, icon: FileText, color: 'text-purple-600' },
                            { label: 'Mobile', value: `${summary.mobile_count} / Tk ${fmt$(summary.mobile_amount)}`, icon: Smartphone, color: 'text-amber-600' },
                        ].map((s) => (
                            <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <s.icon className="size-3.5" />
                                    {s.label}
                                </div>
                                <div className={`mt-1 text-sm font-semibold tabular-nums ${s.color}`}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                    </>
                )}

                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
                        </div>
                    ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Invoice</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Party</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Method</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reference</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reduce</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Attach</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <CreditCard className="size-8 opacity-40" />
                                                <p className="text-sm font-medium">No payments found</p>
                                                <p className="text-xs">Try adjusting the filter.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((r) => {
                                        const meta = statusMeta[r.payment_status || ''] || statusMeta.unpaid;
                                        const Icon = meta.icon;
                                        return (
                                            <tr key={`${r.is_unpaid ? 'u' : 'p'}-${r.id}`} className={`border-b border-sidebar-border/70 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border ${r.is_unpaid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}`}>
                                                <td className="px-4 py-3 text-center text-xs tabular-nums">{fmtDate(r.payment_date)}</td>
                                                <td className="px-4 py-3 font-mono text-xs font-semibold">{r.invoice_number}</td>
                                                <td className="px-4 py-3 text-xs text-foreground/90">{r.party_name || '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${methodBadge[r.payment_method || ''] || 'bg-muted text-muted-foreground'}`}>
                                                        {formatMethod(r.payment_method)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">{r.reference_number || '—'}</td>
                                                <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${r.is_unpaid ? 'text-rose-600' : 'text-green-600'}`}>Tk {fmt$(r.amount)}</td>
                                                <td className="px-4 py-3 text-right text-xs text-red-600 tabular-nums">
                                                    {r.reduce_amount ? `Tk ${fmt$(r.reduce_amount)}` : '—'}
                                                    {r.reduce_note && (
                                                        <span className="block max-w-32 truncate text-[10px] font-normal text-muted-foreground" title={r.reduce_note}>
                                                            {r.reduce_note}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
                                                        <Icon className="size-3" />
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {r.attachment ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 px-0"
                                                            title="Open attachment"
                                                            onClick={() => window.open(r.attachment!, '_blank')}
                                                        >
                                                            <Paperclip className="size-3.5" />
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {rows.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-sidebar-border/70 bg-muted/30 dark:border-sidebar-border">
                                        <td colSpan={5} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Page Total</td>
                                        <td className="px-4 py-3 text-right text-xs font-bold text-green-600 tabular-nums">Collected: Tk {fmt$(pageCollected)}</td>
                                        <td className="px-4 py-3 text-right text-xs font-bold text-red-600 tabular-nums">Reduce: Tk {fmt$(pageReduce)}</td>
                                        <td colSpan={2} className="px-4 py-3 text-right text-xs font-bold text-rose-600 tabular-nums">Unpaid: Tk {fmt$(pageUnpaid)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                    )}
                </div>

                {pagination.total > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="tabular-nums">
                                Showing {(pagination.current_page - 1) * pagination.per_page + 1}–
                                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}
                            </span>
                            <select
                                value={perPage}
                                onChange={(e) => {
                                    setPerPage(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none"
                            >
                                {[10, 20, 30, 50, 100].map((n) => (
                                    <option key={n} value={n}>
                                        {n} / page
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={pagination.current_page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="flex h-7 items-center gap-1 rounded-md border border-input px-2.5 text-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft className="size-3.5" />
                                Prev
                            </button>
                            {pageNumbers.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPage(p)}
                                    className={`flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-xs transition-colors ${p === pagination.current_page ? 'border-transparent bg-foreground font-semibold text-background' : 'border-input hover:bg-accent'}`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                type="button"
                                disabled={pagination.current_page >= pagination.last_page}
                                onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                                className="flex h-7 items-center gap-1 rounded-md border border-input px-2.5 text-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                                <ChevronRight className="size-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
