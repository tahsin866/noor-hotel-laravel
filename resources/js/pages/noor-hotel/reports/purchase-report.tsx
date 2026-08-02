import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    ShoppingCart,
    Printer,
    Search,
    RotateCcw,
    ChevronDown,
    Package,
    Truck,
    CheckCircle2,
    Clock,
    AlertCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type Party = { id: number; party_name: string };

type Row = {
    id: number;
    code: string;
    name: string;
    party_id: number;
    party_name: string;
    customer_po_number: string;
    unit: string;
    vat_rate: number;
    total_ordered: number;
    total_delivered: number;
    remaining: number;
    subtotal: number;
    vat: number;
    total: number;
    status: string;
};

type Summary = {
    total_orders: number;
    total_ordered: number;
    total_delivered: number;
    total_remaining: number;
    total_subtotal: number;
    total_vat: number;
    total_amount: number;
};

const statusFilters = [
    { v: 'all', l: 'All' },
    { v: 'delivered', l: 'Delivered' },
    { v: 'partial', l: 'Partial' },
    { v: 'pending', l: 'Pending' },
];

const statusMeta: Record<string, { label: string; dot: string; color: string; icon: typeof CheckCircle2 }> = {
    delivered: { label: 'Delivered', dot: 'bg-emerald-500', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    partial: { label: 'Partial', dot: 'bg-amber-500', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Truck },
    pending: { label: 'Pending', dot: 'bg-blue-500', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
    no_items: { label: 'No Items', dot: 'bg-slate-400', color: 'bg-slate-50 text-slate-600 border-slate-200', icon: AlertCircle },
};

function fmt$(n: number | string) {
    return Math.round(parseFloat(String(n || 0))).toLocaleString('en-US');
}

function fmtNum(n: number | string) {
    return Number(n || 0).toLocaleString('en-US');
}

export default function PurchaseReport({ parties }: { parties: Party[] }) {
    const [rows, setRows] = useState<Row[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [partyFilter, setPartyFilter] = useState('');
    const [partyFilterOpen, setPartyFilterOpen] = useState(false);
    const [partyFilterSearch, setPartyFilterSearch] = useState('');
    const [loading, setLoading] = useState(false);

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
            const res = await fetch(`/api/reports/purchase?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            if (data.success) {
                setRows(data.data.rows || []);
                setSummary(data.data.summary || null);
            } else {
                toast.error(data.message || 'Failed to load report');
            }
        } catch {
            toast.error('Failed to load report');
        } finally {
            setLoading(false);
        }
    }, [filter, partyFilter, search]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const printReport = () => {
        if (!summary || rows.length === 0) {
            toast.error('No data to print');
            return;
        }

        const dataRows = rows
            .map(
                (r, i) => `<tr>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${i + 1}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;font-weight:600;">${r.code}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${r.name}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${r.party_name || '—'}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">${r.customer_po_number || '—'}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:center;">${r.unit}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">${r.vat_rate}%</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">${fmtNum(r.total_ordered)}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">${fmtNum(r.total_delivered)}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">${fmtNum(r.remaining)}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">Tk ${fmt$(r.subtotal)}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">Tk ${fmt$(r.vat)}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;font-weight:bold;">Tk ${fmt$(r.total)}</td>
                    <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:center;text-transform:capitalize;">${r.status.replace('_', ' ')}</td>
                </tr>`
            )
            .join('');

        const deliveredRows = rows.filter((r) => r.status === 'delivered');
        const partialRows = rows.filter((r) => r.status === 'partial');
        const pendingRows = rows.filter((r) => r.status === 'pending' || r.status === 'no_items');

        const deliveredTotal = deliveredRows.reduce((s, r) => s + r.total, 0);
        const partialTotal = partialRows.reduce((s, r) => s + r.total, 0);
        const pendingTotal = pendingRows.reduce((s, r) => s + r.total, 0);

        const partialDeliveredQty = partialRows.reduce((s, r) => s + r.total_delivered, 0);
        const partialRemainingQty = partialRows.reduce((s, r) => s + r.remaining, 0);
        const partialOrderedQty = partialRows.reduce((s, r) => s + r.total_ordered, 0);

        const deliveredCount = deliveredRows.length;
        const partialCount = partialRows.length;
        const pendingCount = pendingRows.length;

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Purchase Report</title>
        <style>
            @page{size:A4 landscape;margin:6mm;}
            *{box-sizing:border-box;}
            body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:0;font-size:10px;}
            table{width:100%;border-collapse:collapse;}
            th,td{border:1px solid #000;}
            .title{font-size:18px;margin:0;color:#0f172a;text-transform:uppercase;letter-spacing:1.5px;}
            .sub-title{font-size:10px;color:#64748b;margin:2px 0 0;}
            .section-title{margin:0;font-size:10px;text-transform:uppercase;color:#475569;letter-spacing:0.5px;}
            .footer{margin-top:8px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:4px;}
        </style></head><body>
        <table>
            <thead>
                <tr>
                    <th colspan="14" style="padding:4px 6px;border:none;text-align:center;background:#fff;">
                        <div class="title">PURCHASE REPORT</div>
                        <div class="sub-title">Generated by M/S Noor Hotel and Restaurant</div>
                    </th>
                </tr>
                <tr style="background:#f1f5f9;">
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:24px;">#</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">PO Code</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Name</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Party</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:left;">Customer PO</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:36px;">Unit</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:48px;">VAT</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:56px;">Ordered</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:64px;">Delivered</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:64px;">Remaining</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:76px;">Subtotal</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:56px;">VAT</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:right;width:76px;">Total</th>
                    <th style="padding:4px 6px;font-size:10px;text-align:center;width:68px;">Status</th>
                </tr>
            </thead>
            <tbody>${dataRows}</tbody>
        </table>
        <table style="margin-top:8px;">
            <tr>
                <td style="padding:4px 6px;border:1px solid #000;width:50%;vertical-align:top;">
                    <div class="section-title" style="margin-bottom:4px;">Summary</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 12px;">
                        <div>Total Orders: <strong>${summary.total_orders}</strong></div>
                        <div>Total Ordered: <strong>${fmtNum(summary.total_ordered)}</strong></div>
                        <div>Total Delivered: <strong>${fmtNum(summary.total_delivered)}</strong></div>
                        <div>Total Remaining: <strong>${fmtNum(summary.total_remaining)}</strong></div>
                        <div>Subtotal: <strong>Tk ${fmt$(summary.total_subtotal)}</strong></div>
                        <div>VAT: <strong>Tk ${fmt$(summary.total_vat)}</strong></div>
                        <div>Total Amount: <strong>Tk ${fmt$(summary.total_amount)}</strong></div>
                    </div>
                </td>
                <td style="padding:4px 6px;border:1px solid #000;width:50%;vertical-align:top;">
                    <div class="section-title" style="margin-bottom:4px;">Section-wise Total Value</div>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;">All Orders (${summary.total_orders})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;">Tk ${fmt$(summary.total_amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#dcfce7;">Delivered Orders (${deliveredCount})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#dcfce7;">Tk ${fmt$(deliveredTotal)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#fef9c3;">Partial Orders (${partialCount})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#fef9c3;">Tk ${fmt$(partialTotal)}</td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#fee2e2;">
                                Delivered: ${fmtNum(partialDeliveredQty)} packs | Remaining: ${fmtNum(partialRemainingQty)} packs
                            </td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#fee2e2;">
                                Ordered: ${fmtNum(partialOrderedQty)} packs
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;background:#f1f5f9;">Pending / No Items Orders (${pendingCount})</td>
                            <td style="padding:3px 6px;border:1px solid #000;font-size:10px;text-align:right;background:#f1f5f9;">Tk ${fmt$(pendingTotal)}</td>
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

    return (
        <>
            <Head title="Purchase Report" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <ShoppingCart className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Purchase Report" description="View purchase orders and delivery status" />
                    </div>
                    <Button variant="outline" size="sm" onClick={printReport} disabled={!summary || rows.length === 0}>
                        <Printer className="mr-1.5 size-4" />
                        Print Report
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                        {statusFilters.map((f) => (
                            <button
                                key={f.v}
                                onClick={() => { setFilter(f.v); }}
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
                            placeholder="Search by PO, name or party..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); }}
                            className="h-8 w-56 pl-8 text-xs"
                        />
                    </div>
                    {(filter !== 'all' || partyFilter || search) && (
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setFilter('all'); setPartyFilter(''); setSearch(''); }}>
                            <RotateCcw className="mr-1.5 size-3.5" />
                            Reset
                        </Button>
                    )}
                </div>

                {summary && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                        {[
                            { label: 'Orders', value: summary.total_orders, icon: Package, color: 'text-foreground' },
                            { label: 'Ordered', value: fmtNum(summary.total_ordered), icon: ShoppingCart, color: 'text-foreground' },
                            { label: 'Delivered', value: fmtNum(summary.total_delivered), icon: Truck, color: 'text-emerald-600' },
                            { label: 'Remaining', value: fmtNum(summary.total_remaining), icon: AlertCircle, color: 'text-red-600' },
                            { label: 'Subtotal', value: `Tk ${fmt$(summary.total_subtotal)}`, icon: Package, color: 'text-foreground' },
                            { label: 'VAT', value: `Tk ${fmt$(summary.total_vat)}`, icon: Package, color: 'text-foreground' },
                            { label: 'Total', value: `Tk ${fmt$(summary.total_amount)}`, icon: Package, color: 'text-foreground font-bold' },
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
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">PO Code</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer PO</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Party</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Unit</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">VAT</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ordered</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Delivered</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Remaining</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Subtotal</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">VAT</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <ShoppingCart className="size-8 opacity-40" />
                                                <p className="text-sm font-medium">No purchase orders found</p>
                                                <p className="text-xs">Try adjusting the filter.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((r) => {
                                        const meta = statusMeta[r.status] || statusMeta.no_items;
                                        const Icon = meta.icon;
                                        return (
                                            <tr key={r.id} className="border-b border-sidebar-border/70 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border">
                                                <td className="px-4 py-3">
                                                    <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{r.code}</span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">{r.customer_po_number || '—'}</td>
                                                <td className="px-4 py-3 text-xs text-foreground/90">{r.party_name || '—'}</td>
                                                <td className="px-4 py-3 text-center text-xs">{r.unit}</td>
                                                <td className="px-4 py-3 text-right text-xs tabular-nums">{r.vat_rate}%</td>
                                                <td className="px-4 py-3 text-right text-xs tabular-nums">{fmtNum(r.total_ordered)}</td>
                                                <td className="px-4 py-3 text-right text-xs font-medium tabular-nums text-emerald-600">{fmtNum(r.total_delivered)}</td>
                                                <td className={`px-4 py-3 text-right text-xs tabular-nums ${r.remaining > 0 ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>{fmtNum(r.remaining)}</td>
                                                <td className="px-4 py-3 text-right text-xs tabular-nums">Tk {fmt$(r.subtotal)}</td>
                                                <td className="px-4 py-3 text-right text-xs tabular-nums">Tk {fmt$(r.vat)}</td>
                                                <td className="px-4 py-3 text-right text-xs font-bold tabular-nums">Tk {fmt$(r.total)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
                                                        <Icon className="size-3" />
                                                        {meta.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    )}
                </div>
            </div>
        </>
    );
}
