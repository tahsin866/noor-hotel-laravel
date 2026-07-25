import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { dashboard } from '@/routes';
import { Users, Package, Truck, FileText, TrendingUp, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';

type Stats = {
    totalParties: number;
    totalProducts: number;
    totalChallans: number;
    deliveredChallans: number;
    totalInvoices: number;
    totalRevenue: number;
    totalPaid: number;
    totalDue: number;
};

type RecentChallan = {
    id: number;
    challan_number: string;
    product_name: string;
    party_name: string;
    date: string;
    status: string;
    total_amount: number;
};

type RecentInvoice = {
    id: number;
    invoice_number: string;
    party_name: string;
    date: string;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    status: string;
};

function fmt$(n: number | string) {
    return Math.round(parseFloat(String(n || 0))).toLocaleString('en-US');
}

function fmtDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB');
}

const statusColors: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-700',
    dispatched: 'bg-amber-100 text-amber-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    partial: 'bg-amber-100 text-amber-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
};

function BarChart({ data, color }: { data: Record<string, number>; color: string }) {
    const values = Object.values(data);
    const max = Math.max(...values, 1);
    const labels = Object.keys(data);

    return (
        <div className="flex items-end gap-2 h-40">
            {labels.map((label, i) => {
                const val = values[i] || 0;
                const height = (val / max) * 100;
                return (
                    <div key={label} className="flex flex-col items-center flex-1 gap-1">
                        <span className="text-[10px] font-semibold text-muted-foreground">{val}</span>
                        <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                            <div
                                className={`w-full max-w-10 rounded-t ${color}`}
                                style={{ height: `${height}%`, minHeight: val > 0 ? '4px' : '0' }}
                            />
                        </div>
                        <span className="text-[9px] text-muted-foreground text-center leading-tight">{label}</span>
                    </div>
                );
            })}
        </div>
    );
}

function DonutChart({ data, colors }: { data: Record<string, number>; colors: Record<string, string> }) {
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) return <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No data</div>;

    let accumulated = 0;
    const segments = Object.entries(data).map(([key, val]) => {
        const start = (accumulated / total) * 360;
        accumulated += val;
        const end = (accumulated / total) * 360;
        return { key, val, start, end, color: colors[key] || 'bg-slate-300' };
    });

    const gradientParts = segments.map((s) => {
        const startDeg = s.start;
        const endDeg = s.end;
        const colorMap: Record<string, string> = {
            pending: '#3b82f6',
            dispatched: '#f59e0b',
            delivered: '#10b981',
            cancelled: '#ef4444',
            partial: '#f59e0b',
            paid: '#22c55e',
            overdue: '#ef4444',
        };
        const c = colorMap[s.key] || '#94a3b8';
        return `${c} ${startDeg}deg ${endDeg}deg`;
    });

    const gradient = `conic-gradient(${gradientParts.join(', ')})`;

    return (
        <div className="flex items-center gap-6">
            <div className="relative size-32 rounded-full" style={{ background: gradient }}>
                <div className="absolute inset-4 rounded-full bg-background" />
            </div>
            <div className="flex flex-col gap-1.5">
                {segments.map((s) => (
                    <div key={s.key} className="flex items-center gap-2 text-xs">
                        <div className={`size-2.5 rounded-full ${s.color}`} />
                        <span className="capitalize text-muted-foreground">{s.key}</span>
                        <span className="font-semibold">{s.val}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function HorizontalBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const width = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">Tk {fmt$(value)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
            </div>
        </div>
    );
}

export default function Dashboard({
    stats,
    challanByStatus,
    invoiceByStatus,
    monthlyChallans,
    monthlyInvoices,
    monthlyRevenue,
    recentChallans,
    recentInvoices,
}: {
    stats: Stats;
    challanByStatus: Record<string, number>;
    invoiceByStatus: Record<string, number>;
    monthlyChallans: Record<string, number>;
    monthlyInvoices: Record<string, number>;
    monthlyRevenue: Record<string, number>;
    recentChallans: RecentChallan[];
    recentInvoices: RecentInvoice[];
}) {
    const statCards = [
        { label: 'Parties', value: stats.totalParties, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Products', value: stats.totalProducts, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Challans', value: stats.totalChallans, icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Invoices', value: stats.totalInvoices, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex items-center gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <Heading variant="small" title="Dashboard" description="Overview of your business" />
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {statCards.map((card) => (
                        <div key={card.label} className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">{card.label}</p>
                                    <p className="text-2xl font-bold">{card.value}</p>
                                </div>
                                <div className={`flex size-10 items-center justify-center rounded-lg ${card.bg}`}>
                                    <card.icon className={`size-5 ${card.color}`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center gap-2">
                            <TrendingUp className="size-4 text-emerald-600" />
                            <h3 className="text-sm font-semibold">Delivered Challans</h3>
                        </div>
                        <p className="text-3xl font-bold">{stats.deliveredChallans}</p>
                        <p className="mt-1 text-xs text-muted-foreground">of {stats.totalChallans} total</p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center gap-2">
                            <DollarSign className="size-4 text-green-600" />
                            <h3 className="text-sm font-semibold">Total Revenue</h3>
                        </div>
                        <p className="text-3xl font-bold">Tk {fmt$(stats.totalRevenue)}</p>
                        <div className="mt-2 flex gap-4 text-xs">
                            <span className="text-green-600">Paid: Tk {fmt$(stats.totalPaid)}</span>
                            <span className="text-red-600">Due: Tk {fmt$(stats.totalDue)}</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center gap-2">
                            <CheckCircle className="size-4 text-blue-600" />
                            <h3 className="text-sm font-semibold">Collection Rate</h3>
                        </div>
                        {stats.totalRevenue > 0 ? (
                            <>
                                <p className="text-3xl font-bold">{Math.round((stats.totalPaid / stats.totalRevenue) * 100)}%</p>
                                <div className="mt-2 h-2 rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-green-500"
                                        style={{ width: `${(stats.totalPaid / stats.totalRevenue) * 100}%` }}
                                    />
                                </div>
                            </>
                        ) : (
                            <p className="text-3xl font-bold">0%</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <h3 className="mb-4 text-sm font-semibold">Monthly Challans</h3>
                        <BarChart data={monthlyChallans} color="bg-amber-500" />
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <h3 className="mb-4 text-sm font-semibold">Monthly Invoices</h3>
                        <BarChart data={monthlyInvoices} color="bg-indigo-500" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <h3 className="mb-4 text-sm font-semibold">Challan Status</h3>
                        <DonutChart
                            data={challanByStatus}
                            colors={{
                                pending: 'bg-blue-500',
                                dispatched: 'bg-amber-500',
                                delivered: 'bg-emerald-500',
                                cancelled: 'bg-red-500',
                            }}
                        />
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <h3 className="mb-4 text-sm font-semibold">Invoice Status</h3>
                        <DonutChart
                            data={invoiceByStatus}
                            colors={{
                                pending: 'bg-red-500',
                                partial: 'bg-amber-500',
                                paid: 'bg-green-500',
                                overdue: 'bg-red-500',
                            }}
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                    <h3 className="mb-4 text-sm font-semibold">Monthly Revenue</h3>
                    <div className="space-y-3">
                        {Object.entries(monthlyRevenue).map(([month, amount]) => (
                            <HorizontalBar
                                key={month}
                                label={month}
                                value={amount}
                                max={Math.max(...Object.values(monthlyRevenue))}
                                color="bg-emerald-500"
                            />
                        ))}
                        {Object.keys(monthlyRevenue).length === 0 && (
                            <p className="text-sm text-muted-foreground">No revenue data yet</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <h3 className="mb-4 text-sm font-semibold">Recent Challans</h3>
                        <div className="space-y-3">
                            {recentChallans.map((c) => (
                                <div key={c.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs font-semibold">{c.challan_number}</span>
                                        <span className="text-xs text-muted-foreground">{c.party_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[c.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {recentChallans.length === 0 && <p className="text-sm text-muted-foreground">No challans yet</p>}
                        </div>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
                        <h3 className="mb-4 text-sm font-semibold">Recent Invoices</h3>
                        <div className="space-y-3">
                            {recentInvoices.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs font-semibold">{inv.invoice_number}</span>
                                        <span className="text-xs text-muted-foreground">{inv.party_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold">Tk {fmt$(inv.total_amount)}</span>
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {inv.status === 'pending' ? 'Unpaid' : inv.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {recentInvoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet</p>}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
