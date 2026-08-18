import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
    Receipt,
    Printer,
    Search,
    RotateCcw,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    FileDown,
    Package,
    CheckCircle2,
    Clock,
    XCircle,
    Send,
    CreditCard,
    Link2,
    Utensils,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';

type Party = { id: number; party_name: string };

type Item = {
    id: number;
    product_name: string;
    meal_type: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    vat_amount: number;
    total: number;
};

type LinkedChallan = {
    id: number;
    challan_number: string;
    po_number: string;
    product_name: string;
    date: string;
    status: string;
};

type Row = {
    id: number;
    invoice_number: string;
    date: string;
    due_date: string;
    party_id: number;
    party_name: string;
    address: string;
    customer_po_number: string;
    notes: string;
    subtotal: number;
    total_vat: number;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    status: string;
    items: Item[];
    challans: LinkedChallan[];
};

type Summary = {
    total_invoices: number;
    total_amount: number;
    total_paid: number;
    total_due: number;
    paid_count: number;
    paid_amount: number;
    partial_count: number;
    partial_amount: number;
    pending_count: number;
    pending_amount: number;
    overdue_count: number;
    overdue_amount: number;
};

type Pagination = {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
};

const statusFilters = [
    { v: 'all', l: 'All' },
    { v: 'pending', l: 'Pending' },
    { v: 'partial', l: 'Partial' },
    { v: 'paid', l: 'Paid' },
    { v: 'overdue', l: 'Overdue' },
];

const statusMeta: Record<string, { label: string; dot: string; color: string; icon: typeof CheckCircle2 }> = {
    pending: { label: 'Pending', dot: 'bg-blue-500', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
    partial: { label: 'Partial', dot: 'bg-amber-500', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Send },
    paid: { label: 'Paid', dot: 'bg-emerald-500', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    overdue: { label: 'Overdue', dot: 'bg-red-500', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

function fmt$(n: number | string) {
    return Math.round(parseFloat(String(n || 0))).toLocaleString('en-US');
}

function fmtNum(n: number | string) {
    return Number(n || 0).toLocaleString('en-US');
}

function fmtDate(d: string) {
    if (!d) return '—';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString('en-GB');
}

const mealLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snacks',
    morning_snacks: 'Morning Snacks',
    evening_snacks: 'Evening Snacks',
    hot_meal: 'Hot Meal',
};

const mealBadge: Record<string, string> = {
    breakfast: 'bg-amber-100 text-amber-700',
    lunch: 'bg-green-100 text-green-700',
    dinner: 'bg-indigo-100 text-indigo-700',
    snacks: 'bg-pink-100 text-pink-700',
    morning_snacks: 'bg-orange-100 text-orange-700',
    evening_snacks: 'bg-purple-100 text-purple-700',
    hot_meal: 'bg-red-100 text-red-700',
};

function formatMealType(type: string) {
    return mealLabels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const challanStatusStyles: Record<string, string> = {
    pending: 'bg-blue-50 text-blue-700 border border-blue-200',
    dispatched: 'bg-amber-50 text-amber-700 border border-amber-200',
    delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

function challanStatusBadge(status: string) {
    return challanStatusStyles[status] || 'bg-muted text-muted-foreground';
}

export default function InvoiceReport({ parties }: { parties: Party[] }) {
    const [rows, setRows] = useState<Row[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [partyFilter, setPartyFilter] = useState('');
    const [partyFilterOpen, setPartyFilterOpen] = useState(false);
    const [partyFilterSearch, setPartyFilterSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [pagination, setPagination] = useState<Pagination>({ current_page: 1, per_page: 10, total: 0, last_page: 1 });

    const toggleExpand = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const filteredFilterParties = parties.filter((p) =>
        p.party_name.toLowerCase().includes(partyFilterSearch.toLowerCase())
    );

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('status', filter);
            if (partyFilter) params.set('party_id', partyFilter);
            if (search.trim()) params.set('search', search.trim());
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);
            params.set('page', String(page));
            params.set('per_page', String(perPage));
            const res = await fetch(`/api/reports/invoice?${params.toString()}`, {
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
    }, [filter, partyFilter, search, dateFrom, dateTo, page, perPage]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const buildRowHtml = (r: Row, i: number) => {
        const itemRows =
            r.items && r.items.length > 0
                ? r.items
                      .map(
                          (it) => `<tr>
                                    <td colspan="4" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f8fafc;font-weight:600;">${it.product_name} • ${formatMealType(it.meal_type)}</td>
                                    <td colspan="3" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f8fafc;text-align:right;">Qty ${fmtNum(it.quantity)} @ Tk ${fmt$(it.unit_price)}</td>
                                    <td colspan="2" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f8fafc;text-align:right;">VAT ${fmt$(it.vat_amount)}</td>
                                    <td colspan="2" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f8fafc;text-align:right;">Tk ${fmt$(it.total)}</td>
                                </tr>`
                      )
                      .join('')
                : '';
        const challanRows =
            r.challans && r.challans.length > 0
                ? r.challans
                      .map(
                          (ch) => `<tr>
                                    <td colspan="2" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f1f5f9;font-weight:600;">${ch.challan_number}</td>
                                    <td colspan="3" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f1f5f9;">PO ${ch.po_number}</td>
                                    <td colspan="3" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f1f5f9;">${ch.product_name}</td>
                                    <td colspan="2" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f1f5f9;text-align:center;">${fmtDate(ch.date)}</td>
                                    <td style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f1f5f9;text-align:center;text-transform:capitalize;">${ch.status}</td>
                                </tr>`
                      )
                      .join('')
                : '';
        return `<tr>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${i + 1}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;font-weight:600;">${r.invoice_number}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:center;">${fmtDate(r.date)}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:center;">${fmtDate(r.due_date)}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${r.party_name}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${r.address || '—'}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${r.customer_po_number || '—'}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;font-weight:bold;">Tk ${fmt$(r.total_amount)}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">Tk ${fmt$(r.amount_paid)}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">Tk ${fmt$(r.amount_due)}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:center;text-transform:capitalize;">${r.status}</td>
        </tr>${itemRows}${challanRows}`;
    };

    const buildPageHtml = (chunkRows: Row[], startIndex: number, isLast: boolean) => {
        const body = chunkRows.map((r, idx) => buildRowHtml(r, startIndex + idx)).join('');
        return `<table style="${isLast ? '' : 'page-break-after: always;'}">
            <thead>
                <tr>
                    <th colspan="11" style="padding:4px 6px;border:none;text-align:center;background:#fff;">
                        <div class="title">INVOICE REPORT</div>
                        <div class="sub-title">Generated by M/S Noor Hotel and Restaurant</div>
                    </th>
                </tr>
                <tr style="background:#f1f5f9;">
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:24px;">#</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Invoice No</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:62px;">Date</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:62px;">Due</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Party</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Address</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Customer PO</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:70px;">Total</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:64px;">Paid</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:64px;">Due</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:64px;">Status</th>
                </tr>
            </thead>
            <tbody>${body}</tbody>
        </table>`;
    };

    const printReport = async () => {
        if (!summary) {
            toast.error('No data to print');
            return;
        }
        let allRows: Row[] = [];
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('status', filter);
            if (partyFilter) params.set('party_id', partyFilter);
            if (search.trim()) params.set('search', search.trim());
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);
            params.set('per_page', '1000');
            const res = await fetch(`/api/reports/invoice?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            if (data.success) {
                allRows = data.data.rows || [];
            } else {
                toast.error(data.message || 'Failed to load report');
                return;
            }
        } catch {
            toast.error('Failed to load print data');
            return;
        }
        if (allRows.length === 0) {
            toast.error('No data to print');
            return;
        }

        const pagesHtml = [];
        for (let start = 0; start < allRows.length; start += 10) {
            const chunk = allRows.slice(start, start + 10);
            const isLast = start + 10 >= allRows.length;
            pagesHtml.push(buildPageHtml(chunk, start, isLast));
        }

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice Report</title>
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
                        <div>Total Invoices: <strong>${summary.total_invoices}</strong></div>
                        <div>Total Amount: <strong>Tk ${fmt$(summary.total_amount)}</strong></div>
                        <div>Total Paid: <strong>Tk ${fmt$(summary.total_paid)}</strong></div>
                        <div>Total Due: <strong>Tk ${fmt$(summary.total_due)}</strong></div>
                    </div>
                </td>
                <td style="padding:4px 6px;border:1px solid #000;width:50%;vertical-align:top;">
                    <div class="section-title" style="margin-bottom:4px;">Section-wise Total Value</div>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">All Invoices (${summary.total_invoices})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">Tk ${fmt$(summary.total_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#dcfce7;">Paid (${summary.paid_count})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#dcfce7;">Tk ${fmt$(summary.paid_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#fef9c3;">Partial (${summary.partial_count})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#fef9c3;">Tk ${fmt$(summary.partial_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#eff6ff;">Pending (${summary.pending_count})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#eff6ff;">Tk ${fmt$(summary.pending_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#fee2e2;">Overdue (${summary.overdue_count})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#fee2e2;">Tk ${fmt$(summary.overdue_amount)}</td>
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
        let allRows: Row[] = [];
        let exportSummary: Summary = summary;
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('status', filter);
            if (partyFilter) params.set('party_id', partyFilter);
            if (search.trim()) params.set('search', search.trim());
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);
            params.set('per_page', '1000');
            const res = await fetch(`/api/reports/invoice?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            if (data.success) {
                allRows = data.data.rows || [];
                exportSummary = data.data.summary || exportSummary;
            } else {
                toast.error(data.message || 'Failed to load report');
                return;
            }
        } catch {
            toast.error('Failed to load export data');
            return;
        }
        if (allRows.length === 0) {
            toast.error('No data to export');
            return;
        }

        const invoiceRows = allRows.map((r, i) => ({
            '#': i + 1,
            'Invoice No': r.invoice_number,
            Date: fmtDate(r.date),
            'Due Date': fmtDate(r.due_date),
            Party: r.party_name,
            Address: r.address || '',
            'Customer PO': r.customer_po_number || '',
            Subtotal: r.subtotal,
            VAT: r.total_vat,
            Total: r.total_amount,
            Paid: r.amount_paid,
            Due: r.amount_due,
            Status: r.status,
        }));

        const itemRows = allRows.flatMap((r) =>
            (r.items || []).map((it) => ({
                'Invoice No': r.invoice_number,
                Date: fmtDate(r.date),
                Party: r.party_name,
                Product: it.product_name,
                Meal: formatMealType(it.meal_type),
                Qty: it.quantity,
                'Unit Price': it.unit_price,
                'VAT Rate': `${it.vat_rate}%`,
                'VAT Amount': it.vat_amount,
                Amount: it.total,
            }))
        );

        const challanRows = allRows.flatMap((r) =>
            (r.challans || []).map((ch) => ({
                'Invoice No': r.invoice_number,
                Date: fmtDate(r.date),
                'Challan No': ch.challan_number,
                'PO Code': ch.po_number,
                Product: ch.product_name,
                'Challan Date': fmtDate(ch.date),
                Status: ch.status,
            }))
        );

        const summaryRows = [
            { Metric: 'Total Invoices', Value: exportSummary.total_invoices },
            { Metric: 'Total Amount', Value: exportSummary.total_amount },
            { Metric: 'Total Paid', Value: exportSummary.total_paid },
            { Metric: 'Total Due', Value: exportSummary.total_due },
            { Metric: 'Paid', Value: `${exportSummary.paid_count} / Tk ${fmt$(exportSummary.paid_amount)}` },
            { Metric: 'Partial', Value: `${exportSummary.partial_count} / Tk ${fmt$(exportSummary.partial_amount)}` },
            { Metric: 'Pending', Value: `${exportSummary.pending_count} / Tk ${fmt$(exportSummary.pending_amount)}` },
            { Metric: 'Overdue', Value: `${exportSummary.overdue_count} / Tk ${fmt$(exportSummary.overdue_amount)}` },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), 'Invoices');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), 'Items');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(challanRows), 'Challans');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
        XLSX.writeFile(wb, 'invoice_report.xlsx');
    };

    const hasFilters = filter !== 'all' || partyFilter !== '' || search !== '' || dateFrom !== '' || dateTo !== '';

    const pageNumbers: number[] = [];
    const windowSize = 5;
    const pagesStart = Math.max(1, pagination.current_page - Math.floor(windowSize / 2));
    const pagesEnd = Math.min(pagination.last_page, pagesStart + windowSize - 1);
    for (let p = Math.max(1, pagesEnd - windowSize + 1); p <= pagesEnd; p += 1) {
        pageNumbers.push(p);
    }

    return (
        <>
            <Head title="Invoice Report" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <Receipt className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Invoice Report" description="View invoices, items and linked challans" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!summary || pagination.total === 0}>
                            <FileDown className="mr-1.5 size-4" />
                            Export Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={printReport} disabled={!summary || pagination.total === 0}>
                            <Printer className="mr-1.5 size-4" />
                            Print Report
                        </Button>
                    </div>
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
                            placeholder="Search invoice, PO, name or party..."
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
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setFilter('all'); setPartyFilter(''); setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}>
                            <RotateCcw className="mr-1.5 size-3.5" />
                            Reset
                        </Button>
                    )}
                </div>

                {summary && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                        {[
                            { label: 'Invoices', value: summary.total_invoices, icon: Receipt, color: 'text-foreground' },
                            { label: 'Total Amount', value: `Tk ${fmt$(summary.total_amount)}`, icon: Package, color: 'text-foreground font-bold' },
                            { label: 'Paid', value: `${summary.paid_count} / Tk ${fmt$(summary.paid_amount)}`, icon: CheckCircle2, color: 'text-emerald-600' },
                            { label: 'Partial', value: `${summary.partial_count} / Tk ${fmt$(summary.partial_amount)}`, icon: Send, color: 'text-amber-600' },
                            { label: 'Pending', value: `${summary.pending_count} / Tk ${fmt$(summary.pending_amount)}`, icon: Clock, color: 'text-blue-600' },
                            { label: 'Overdue', value: `${summary.overdue_count} / Tk ${fmt$(summary.overdue_amount)}`, icon: XCircle, color: 'text-red-600' },
                            { label: 'Total Paid', value: `Tk ${fmt$(summary.total_paid)}`, icon: CreditCard, color: 'text-emerald-600' },
                            { label: 'Total Due', value: `Tk ${fmt$(summary.total_due)}`, icon: Package, color: 'text-red-600' },
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
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Invoice No</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Due Date</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Party</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Address</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer PO</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Paid</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Due</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Receipt className="size-8 opacity-40" />
                                                <p className="text-sm font-medium">No invoices found</p>
                                                <p className="text-xs">Try adjusting the filter.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((r) => {
                                        const meta = statusMeta[r.status] || statusMeta.pending;
                                        const Icon = meta.icon;
                                        const isOpen = expanded.has(r.id);
                                        return (
                                            <Fragment key={r.id}>
                                                <tr className="border-b border-sidebar-border/70 transition-colors hover:bg-muted/30 dark:border-sidebar-border">
                                                    <td className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(r.id)}
                                                            className="inline-flex items-center gap-1.5 rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-accent"
                                                        >
                                                            {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                                                            {r.invoice_number}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs tabular-nums">{fmtDate(r.date)}</td>
                                                    <td className="px-4 py-3 text-center text-xs tabular-nums">{fmtDate(r.due_date)}</td>
                                                    <td className="px-4 py-3 text-xs text-foreground/90">{r.party_name}</td>
                                                    <td className="max-w-48 truncate px-4 py-3 text-xs text-muted-foreground">{r.address || '—'}</td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.customer_po_number || '—'}</td>
                                                    <td className="px-4 py-3 text-right text-xs font-bold tabular-nums">Tk {fmt$(r.total_amount)}</td>
                                                    <td className="px-4 py-3 text-right text-xs tabular-nums">Tk {fmt$(r.amount_paid)}</td>
                                                    <td className="px-4 py-3 text-right text-xs tabular-nums">Tk {fmt$(r.amount_due)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
                                                            <Icon className="size-3" />
                                                            {meta.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                                {isOpen && (
                                                    <tr className="border-b border-sidebar-border/70 bg-muted/20 dark:border-sidebar-border">
                                                        <td colSpan={10} className="px-6 py-3">
                                                            <div className="flex flex-col gap-3">
                                                                <div className="overflow-hidden rounded-lg border border-border">
                                                                    <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                                        <Utensils className="size-3.5" />
                                                                        Items
                                                                    </div>
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="border-b border-border bg-muted/50">
                                                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                                                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Meal</th>
                                                                                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Qty</th>
                                                                                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unit Price</th>
                                                                                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">VAT</th>
                                                                                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {r.items && r.items.length > 0 ? (
                                                                                r.items.map((it) => (
                                                                                    <tr key={it.id} className="border-b border-border last:border-0">
                                                                                        <td className="px-3 py-2 font-medium">{it.product_name}</td>
                                                                                        <td className="px-3 py-2">
                                                                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${mealBadge[it.meal_type] || 'bg-muted text-muted-foreground'}`}>
                                                                                                {formatMealType(it.meal_type)}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(it.quantity)}</td>
                                                                                        <td className="px-3 py-2 text-right tabular-nums">Tk {fmt$(it.unit_price)}</td>
                                                                                        <td className="px-3 py-2 text-right tabular-nums">Tk {fmt$(it.vat_amount)}</td>
                                                                                        <td className="px-3 py-2 text-right font-semibold tabular-nums">Tk {fmt$(it.total)}</td>
                                                                                    </tr>
                                                                                ))
                                                                            ) : (
                                                                                <tr>
                                                                                    <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                                                                                        No items
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                                <div className="overflow-hidden rounded-lg border border-border">
                                                                    <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                                        <Link2 className="size-3.5" />
                                                                        Linked Challans ({r.challans ? r.challans.length : 0})
                                                                    </div>
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="border-b border-border bg-muted/50">
                                                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Challan No</th>
                                                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">PO Code</th>
                                                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                                                                                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                                                                                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {r.challans && r.challans.length > 0 ? (
                                                                                r.challans.map((ch) => (
                                                                                    <tr key={ch.id} className="border-b border-border last:border-0">
                                                                                        <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{ch.challan_number}</td>
                                                                                        <td className="px-3 py-2 font-medium">{ch.po_number}</td>
                                                                                        <td className="px-3 py-2 text-muted-foreground">{ch.product_name}</td>
                                                                                        <td className="px-3 py-2 text-center tabular-nums">{fmtDate(ch.date)}</td>
                                                                                        <td className="px-3 py-2 text-center">
                                                                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${challanStatusBadge(ch.status)}`}>
                                                                                                {ch.status}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))
                                                                            ) : (
                                                                                <tr>
                                                                                    <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                                                                                        No linked challans
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })
                                )}
                            </tbody>
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
