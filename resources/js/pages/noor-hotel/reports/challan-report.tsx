import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
    Truck,
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
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';

type Party = { id: number; party_name: string };

type MealItem = {
    id: number;
    meal_type: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
};

type Row = {
    id: number;
    challan_number: string;
    date: string;
    product_id: number;
    po_number: string;
    product_name: string;
    customer_po_number: string;
    party_name: string;
    address: string;
    notes: string;
    total_qty: number;
    total_amount: number;
    status: string;
    items: MealItem[];
};

type Summary = {
    total_challans: number;
    total_qty: number;
    total_amount: number;
    delivered_count: number;
    delivered_amount: number;
    dispatched_count: number;
    dispatched_amount: number;
    pending_count: number;
    pending_amount: number;
    cancelled_count: number;
    cancelled_amount: number;
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
    { v: 'dispatched', l: 'Dispatched' },
    { v: 'delivered', l: 'Delivered' },
    { v: 'cancelled', l: 'Cancelled' },
];

const statusMeta: Record<string, { label: string; dot: string; color: string; icon: typeof CheckCircle2 }> = {
    pending: { label: 'Pending', dot: 'bg-blue-500', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
    dispatched: { label: 'Dispatched', dot: 'bg-amber-500', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Send },
    delivered: { label: 'Delivered', dot: 'bg-emerald-500', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', dot: 'bg-red-500', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
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

export default function ChallanReport({ parties }: { parties: Party[] }) {
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
            const res = await fetch(`/api/reports/challan?${params.toString()}`, {
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
                                    <td colspan="3" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f8fafc;"></td>
                                    <td colspan="2" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f8fafc;font-weight:600;">${formatMealType(it.meal_type)}</td>
                                    <td colspan="3" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f8fafc;">${it.description || '—'}</td>
                                    <td colspan="2" style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f8fafc;text-align:right;">Qty ${fmtNum(it.quantity)} @ Tk ${fmt$(it.unit_price)}</td>
                                    <td style="padding:2px 6px;border:1px solid #000;font-size:9px;background:#f8fafc;text-align:right;">Tk ${fmt$(it.total)}</td>
                                </tr>`
                      )
                      .join('')
                : '';
        return `<tr>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${i + 1}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;font-weight:600;">${r.challan_number}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:center;">${fmtDate(r.date)}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${r.po_number}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${r.product_name}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${r.customer_po_number || '—'}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${r.party_name}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${r.address || '—'}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">${fmtNum(r.total_qty)}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;font-weight:bold;">Tk ${fmt$(r.total_amount)}</td>
            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:center;text-transform:capitalize;">${r.status}</td>
        </tr>${itemRows}`;
    };

    const buildPageHtml = (chunkRows: Row[], startIndex: number, isLast: boolean) => {
        const body = chunkRows.map((r, idx) => buildRowHtml(r, startIndex + idx)).join('');
        return `<table style="${isLast ? '' : 'page-break-after: always;'}">
            <thead>
                <tr>
                    <th colspan="11" style="padding:4px 6px;border:none;text-align:center;background:#fff;">
                        <div class="title">CHALLAN REPORT</div>
                        <div class="sub-title">Generated by M/S Noor Hotel and Restaurant</div>
                    </th>
                </tr>
                <tr style="background:#f1f5f9;">
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:24px;">#</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Challan No</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:64px;">Date</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">PO Code</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Name</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Customer PO</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Party</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Address</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:56px;">Qty</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:76px;">Amount</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:68px;">Status</th>
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
            const res = await fetch(`/api/reports/challan?${params.toString()}`, {
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

        const deliveredCount = summary.delivered_count;
        const dispatchedCount = summary.dispatched_count;
        const pendingCount = summary.pending_count;
        const cancelledCount = summary.cancelled_count;

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Challan Report</title>
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
                        <div>Total Challans: <strong>${summary.total_challans}</strong></div>
                        <div>Total Qty: <strong>${fmtNum(summary.total_qty)}</strong></div>
                        <div>Total Amount: <strong>Tk ${fmt$(summary.total_amount)}</strong></div>
                    </div>
                </td>
                <td style="padding:4px 6px;border:1px solid #000;width:50%;vertical-align:top;">
                    <div class="section-title" style="margin-bottom:4px;">Section-wise Total Value</div>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">All Challans (${summary.total_challans})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">Tk ${fmt$(summary.total_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#dcfce7;">Delivered (${deliveredCount})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#dcfce7;">Tk ${fmt$(summary.delivered_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#fef9c3;">Dispatched (${dispatchedCount})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#fef9c3;">Tk ${fmt$(summary.dispatched_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#eff6ff;">Pending (${pendingCount})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#eff6ff;">Tk ${fmt$(summary.pending_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#f1f5f9;">Cancelled (${cancelledCount})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#f1f5f9;">Tk ${fmt$(summary.cancelled_amount)}</td>
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
            const res = await fetch(`/api/reports/challan?${params.toString()}`, {
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

        const challanRows = allRows.map((r, i) => ({
            '#': i + 1,
            'Challan No': r.challan_number,
            Date: fmtDate(r.date),
            'PO Code': r.po_number,
            Name: r.product_name,
            'Customer PO': r.customer_po_number || '',
            Party: r.party_name,
            Address: r.address || '',
            Qty: r.total_qty,
            Amount: r.total_amount,
            Status: r.status,
        }));

        const itemRows = allRows.flatMap((r) =>
            (r.items || []).map((it) => ({
                'Challan No': r.challan_number,
                Date: fmtDate(r.date),
                Name: r.product_name,
                Party: r.party_name,
                Meal: formatMealType(it.meal_type),
                Description: it.description || '',
                Qty: it.quantity,
                'Unit Price': it.unit_price,
                Amount: it.total,
            }))
        );

        const summaryRows = [
            { Metric: 'Total Challans', Value: exportSummary.total_challans },
            { Metric: 'Total Qty', Value: exportSummary.total_qty },
            { Metric: 'Total Amount', Value: exportSummary.total_amount },
            { Metric: 'Delivered', Value: `${exportSummary.delivered_count} / Tk ${fmt$(exportSummary.delivered_amount)}` },
            { Metric: 'Dispatched', Value: `${exportSummary.dispatched_count} / Tk ${fmt$(exportSummary.dispatched_amount)}` },
            { Metric: 'Pending', Value: `${exportSummary.pending_count} / Tk ${fmt$(exportSummary.pending_amount)}` },
            { Metric: 'Cancelled', Value: `${exportSummary.cancelled_count} / Tk ${fmt$(exportSummary.cancelled_amount)}` },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(challanRows), 'Challans');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), 'Meal Items');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
        XLSX.writeFile(wb, 'challan_report.xlsx');
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
            <Head title="Challan Report" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <Truck className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Challan Report" description="View challans and dispatch status" />
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
                            placeholder="Search challan, PO, name or party..."
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
                            { label: 'Challans', value: summary.total_challans, icon: Package, color: 'text-foreground' },
                            { label: 'Total Qty', value: fmtNum(summary.total_qty), icon: Truck, color: 'text-foreground' },
                            { label: 'Delivered', value: `${summary.delivered_count} / Tk ${fmt$(summary.delivered_amount)}`, icon: CheckCircle2, color: 'text-emerald-600' },
                            { label: 'Dispatched', value: `${summary.dispatched_count} / Tk ${fmt$(summary.dispatched_amount)}`, icon: Send, color: 'text-amber-600' },
                            { label: 'Pending', value: `${summary.pending_count} / Tk ${fmt$(summary.pending_amount)}`, icon: Clock, color: 'text-blue-600' },
                            { label: 'Cancelled', value: `${summary.cancelled_count} / Tk ${fmt$(summary.cancelled_amount)}`, icon: XCircle, color: 'text-red-600' },
                            { label: 'Total Amount', value: `Tk ${fmt$(summary.total_amount)}`, icon: Package, color: 'text-foreground font-bold' },
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
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Challan No</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">PO Code</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer PO</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Party</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Address</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Qty</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Truck className="size-8 opacity-40" />
                                                <p className="text-sm font-medium">No challans found</p>
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
                                                            {r.challan_number}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs tabular-nums">{fmtDate(r.date)}</td>
                                                    <td className="px-4 py-3 font-medium text-foreground">{r.po_number}</td>
                                                    <td className="px-4 py-3 text-xs text-foreground/90">{r.product_name}</td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.customer_po_number || '—'}</td>
                                                    <td className="px-4 py-3 text-xs text-foreground/90">{r.party_name}</td>
                                                    <td className="max-w-48 truncate px-4 py-3 text-xs text-muted-foreground">{r.address || '—'}</td>
                                                    <td className="px-4 py-3 text-right text-xs tabular-nums">{fmtNum(r.total_qty)}</td>
                                                    <td className="px-4 py-3 text-right text-xs font-bold tabular-nums">Tk {fmt$(r.total_amount)}</td>
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
                                                            <div className="overflow-hidden rounded-lg border border-border">
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="border-b border-border bg-muted/50">
                                                                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Meal</th>
                                                                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
                                                                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Qty</th>
                                                                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unit Price</th>
                                                                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {r.items && r.items.length > 0 ? (
                                                                            r.items.map((it) => (
                                                                                <tr key={it.id} className="border-b border-border last:border-0">
                                                                                    <td className="px-3 py-2">
                                                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${mealBadge[it.meal_type] || 'bg-muted text-muted-foreground'}`}>
                                                                                            {formatMealType(it.meal_type)}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="max-w-md truncate px-3 py-2 text-muted-foreground">{it.description || '—'}</td>
                                                                                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(it.quantity)}</td>
                                                                                    <td className="px-3 py-2 text-right tabular-nums">Tk {fmt$(it.unit_price)}</td>
                                                                                    <td className="px-3 py-2 text-right font-semibold tabular-nums">Tk {fmt$(it.total)}</td>
                                                                                </tr>
                                                                            ))
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                                                                                    No meal items
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
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
