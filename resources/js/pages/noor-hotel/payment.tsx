import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    ChevronLeft,
    ChevronRight,
    CreditCard,
    CheckCircle,
    Clock,
    FileDown,
    FileText,
    Eye,
    History,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Party = { id: number; party_name: string };

type Invoice = {
    id: number;
    invoice_number: string;
    party_id: number;
    party_name: string;
    date: string;
    due_date: string;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    status: string;
};

type PaymentRecord = {
    id: number;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number: string;
    notes: string;
};

type ReportInvoice = {
    invoice_number: string;
    party_name: string;
    date: string;
    due_date: string;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    status: string;
    payments: { date: string; amount: number; method: string; reference: string }[];
};

type ReportSummary = {
    total_invoices: number;
    total_amount: number;
    total_paid: number;
    total_due: number;
};

const statusFilters = [
    { v: 'all', l: 'All' },
    { v: 'pending', l: 'Unpaid' },
    { v: 'paid', l: 'Paid' },
    { v: 'partial', l: 'Partial' },
    { v: 'overdue', l: 'Overdue' },
];

const statusColors: Record<string, string> = {
    pending: 'bg-red-100 text-red-700',
    partial: 'bg-amber-100 text-amber-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-600',
};

function fmt$(n: number | string) {
    return Math.round(parseFloat(String(n || 0))).toLocaleString('en-US');
}

function fmtDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB');
}

export default function Payments({ parties }: { parties: Party[] }) {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('all');
    const [partyFilter, setPartyFilter] = useState('');
    const [processing, setProcessing] = useState<number | null>(null);

    const [payOpen, setPayOpen] = useState(false);
    const [paying, setPaying] = useState<Invoice | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('');
    const [payRef, setPayRef] = useState('');
    const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
    const [payNotes, setPayNotes] = useState('');

    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyInvoice, setHistoryInvoice] = useState<Invoice | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);

    const [reportOpen, setReportOpen] = useState(false);
    const [reportParty, setReportParty] = useState('');
    const [reportFrom, setReportFrom] = useState('');
    const [reportTo, setReportTo] = useState('');
    const [reportStatus, setReportStatus] = useState('');
    const [reportData, setReportData] = useState<ReportInvoice[]>([]);
    const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);

    const fetchInvoices = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '10');
            if (filter !== 'all') params.set('status', filter);
            if (partyFilter) params.set('party_id', partyFilter);
            const res = await fetch(`/api/invoices?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setInvoices(data.data?.items || []);
            setTotal(data.data?.total || 0);
        } catch {
            toast.error('Failed to load invoices');
        }
    }, [page, filter, partyFilter]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const openPayDialog = (inv: Invoice) => {
        setPaying(inv);
        setPayAmount(String(inv.amount_due));
        setPayMethod('');
        setPayRef('');
        setPayDate(new Date().toISOString().slice(0, 10));
        setPayNotes('');
        setPayOpen(true);
    };

    const submitPayment = async () => {
        if (!paying) return;
        const amount = parseFloat(payAmount);
        if (!amount || amount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }
        if (amount > paying.amount_due) {
            toast.error('Amount exceeds due balance');
            return;
        }
        setProcessing(paying.id);
        try {
            const isFull = amount >= paying.amount_due;
            const res = await fetch(`/api/invoices/${paying.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({
                    status: isFull ? 'paid' : 'partial',
                    amount_paid: amount,
                    payment_method: payMethod,
                    reference_number: payRef,
                    payment_date: payDate,
                    notes: payNotes,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Payment recorded');
                setPayOpen(false);
                fetchInvoices();
            } else {
                toast.error(data.message || 'Something went wrong');
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setProcessing(null);
        }
    };

    const openHistory = async (inv: Invoice) => {
        setHistoryInvoice(inv);
        try {
            const res = await fetch(`/api/invoices/${inv.id}/payment-history`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setPaymentHistory(data.data?.payments || []);
            setHistoryOpen(true);
        } catch {
            toast.error('Failed to load payment history');
        }
    };

    const exportIndividualReport = (inv: Invoice) => {
        let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Payment Report - ${inv.invoice_number}</title>
        <style>@page{size:A4;margin:15mm;}body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:20px;font-size:13px;}</style></head><body>
        <div style="border-bottom:3px solid #2563eb;padding-bottom:12px;margin-bottom:16px;"><h1 style="font-size:22px;margin:0;color:#0f172a;">PAYMENT REPORT</h1></div>
        <table style="width:100%;border:none;margin-bottom:16px;font-size:13px;">
            <tr><td style="width:50%;border:none;padding:4px 0;"><strong>Invoice No:</strong> ${inv.invoice_number}</td><td style="width:50%;border:none;padding:4px 0;"><strong>Date:</strong> ${fmtDate(inv.date)}</td></tr>
            <tr><td style="border:none;padding:4px 0;"><strong>Party:</strong> ${inv.party_name || 'N/A'}</td><td style="border:none;padding:4px 0;"><strong>Due Date:</strong> ${fmtDate(inv.due_date)}</td></tr>
            <tr><td style="border:none;padding:4px 0;"><strong>Total:</strong> Tk ${fmt$(inv.total_amount)}</td><td style="border:none;padding:4px 0;"><strong>Paid:</strong> Tk ${fmt$(inv.amount_paid)}</td></tr>
            <tr><td colspan="2" style="border:none;padding:4px 0;"><strong>Due:</strong> Tk ${fmt$(inv.amount_due)} | <strong>Status:</strong> ${inv.status}</td></tr>
        </table>
        <p style="color:#475569;font-size:12px;">Payment history will be available after recording payments.</p>
        </body></html>`;
        const win = window.open('', '_blank', 'width=800,height=600');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 500);
        }
    };

    const fetchReport = async () => {
        try {
            const params = new URLSearchParams();
            if (reportParty) params.set('party_id', reportParty);
            if (reportFrom) params.set('date_from', reportFrom);
            if (reportTo) params.set('date_to', reportTo);
            if (reportStatus) params.set('status', reportStatus);
            const res = await fetch(`/api/payments/report?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setReportData(data.data?.invoices || []);
            setReportSummary(data.data?.summary || null);
        } catch {
            toast.error('Failed to load report');
        }
    };

    const exportBulkReport = () => {
        if (!reportSummary) return;
        let rows = '';
        reportData.forEach((inv) => {
            rows += `<tr>
                <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;">${inv.invoice_number}</td>
                <td style="padding:8px 12px;border:1px solid #e2e8f0;">${inv.party_name}</td>
                <td style="padding:8px 12px;border:1px solid #e2e8f0;">${inv.date}</td>
                <td style="padding:8px 12px;border:1px solid #e2e8f0;">${inv.due_date}</td>
                <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;">Tk ${fmt$(inv.total_amount)}</td>
                <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;color:#16a34a;">Tk ${fmt$(inv.amount_paid)}</td>
                <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;color:#dc2626;">Tk ${fmt$(inv.amount_due)}</td>
                <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">${inv.status}</td>
            </tr>`;
            if (inv.payments && inv.payments.length) {
                inv.payments.forEach((p) => {
                    rows += `<tr style="background:#f8fafc;">
                        <td colspan="3" style="padding:4px 12px;border:1px solid #e2e8f0;font-size:11px;color:#64748b;">Payment: ${p.date}</td>
                        <td style="padding:4px 12px;border:1px solid #e2e8f0;font-size:11px;color:#64748b;">${p.method || '-'}</td>
                        <td style="padding:4px 12px;border:1px solid #e2e8f0;font-size:11px;color:#64748b;">${p.reference || '-'}</td>
                        <td colspan="2" style="padding:4px 12px;border:1px solid #e2e8f0;font-size:11px;color:#16a34a;text-align:right;">Tk ${fmt$(p.amount)}</td>
                        <td style="padding:4px 12px;border:1px solid #e2e8f0;"></td>
                    </tr>`;
                });
            }
        });
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Payment Report</title>
        <style>@page{size:landscape;margin:10mm;}body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:20px;font-size:12px;}</style></head><body>
        <div style="border-bottom:3px solid #2563eb;padding-bottom:12px;margin-bottom:16px;"><h1 style="font-size:20px;margin:0;">PAYMENT REPORT</h1></div>
        <div style="display:flex;gap:24px;margin-bottom:16px;font-size:13px;">
            <div><strong>Total Invoices:</strong> ${reportSummary.total_invoices}</div>
            <div><strong>Total Amount:</strong> Tk ${fmt$(reportSummary.total_amount)}</div>
            <div style="color:#16a34a;"><strong>Total Paid:</strong> Tk ${fmt$(reportSummary.total_paid)}</div>
            <div style="color:#dc2626;"><strong>Total Due:</strong> Tk ${fmt$(reportSummary.total_due)}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f1f5f9;">
                <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left;font-size:11px;">Invoice</th>
                <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left;font-size:11px;">Party</th>
                <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left;font-size:11px;">Date</th>
                <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left;font-size:11px;">Due Date</th>
                <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-size:11px;">Amount</th>
                <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-size:11px;">Paid</th>
                <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-size:11px;">Due</th>
                <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;font-size:11px;">Status</th>
            </tr></thead><tbody>${rows}</tbody>
        </table>
        <div style="margin-top:30px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;">
            Generated on ${new Date().toLocaleDateString('en-GB')} &mdash; Noor Hotel PRG
        </div>
        </body></html>`;
        const win = window.open('', '_blank', 'width=1000,height=600');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 500);
        }
    };

    const totalPages = Math.ceil(total / 10);

    return (
        <>
            <Head title="Payments" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <CreditCard className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Payments" description="Track and manage invoice payments" />
                    </div>
                    <Button onClick={() => { setReportOpen(true); fetchReport(); }}>
                        <FileDown className="mr-1.5 size-4" />
                        Payment Report
                    </Button>
                </div>

                <div className="flex flex-wrap items-end gap-3">
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
                        value={partyFilter}
                        onChange={(e) => { setPartyFilter(e.target.value); setPage(1); }}
                        className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                    >
                        <option value="">All Parties</option>
                        {parties.map((p) => (
                            <option key={p.id} value={p.id}>{p.party_name}</option>
                        ))}
                    </select>
                    <span className="ml-auto text-xs font-medium text-muted-foreground">
                        {total} invoice{total === 1 ? '' : 's'}
                    </span>
                </div>

                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Number</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Party</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Due</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Paid</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Due</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <CreditCard className="size-8 opacity-40" />
                                                <p className="text-sm font-medium">No invoices found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv) => (
                                        <tr key={inv.id} className="border-b border-sidebar-border/70 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border">
                                            <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.invoice_number}</td>
                                            <td className="px-4 py-3 text-xs font-medium">{inv.party_name || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(inv.date)}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(inv.due_date)}</td>
                                            <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">Tk {fmt$(inv.total_amount)}</td>
                                            <td className="px-4 py-3 text-right text-xs text-green-600 tabular-nums">Tk {fmt$(inv.amount_paid)}</td>
                                            <td className="px-4 py-3 text-right text-xs text-red-600 tabular-nums">Tk {fmt$(inv.amount_due)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {inv.status === 'pending' ? 'Unpaid' : inv.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {inv.status !== 'paid' && (
                                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:text-green-700" onClick={() => openPayDialog(inv)}>
                                                            <CreditCard className="mr-1 size-3" />
                                                            Pay
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700" onClick={() => openHistory(inv)}>
                                                        <History className="mr-1 size-3" />
                                                        History
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-600 hover:text-purple-700" onClick={() => exportIndividualReport(inv)}>
                                                        <FileDown className="mr-1 size-3" />
                                                        Report
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-2 border-t border-sidebar-border/70 pt-4 dark:border-sidebar-border">
                        <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                <ChevronLeft className="mr-1 size-3.5" /> Previous
                            </Button>
                            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                                Next <ChevronRight className="ml-1 size-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Dialog */}
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <CreditCard className="size-4.5 text-muted-foreground" />
                            Record Payment
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {paying?.invoice_number} &mdash; Due: Tk {fmt$(paying?.amount_due || 0)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Amount *</Label>
                            <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} min={0} max={paying?.amount_due} step="0.01" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">Payment Date *</Label>
                                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">Method</Label>
                                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none">
                                    <option value="">Select</option>
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="mobile">Mobile Payment</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Reference Number</Label>
                            <Input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Transaction/Cheque number" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                            <Input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Payment notes" />
                        </div>
                    </div>
                    <DialogFooter className="border-t border-border pt-4">
                        <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                        <Button disabled={processing === paying?.id} onClick={submitPayment} className="min-w-28">
                            {processing === paying?.id ? 'Saving...' : 'Record Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment History Dialog */}
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <History className="size-4.5 text-muted-foreground" />
                            Payment History &mdash; {historyInvoice?.invoice_number}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        {paymentHistory.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">No payments recorded yet</p>
                        ) : (
                            <div className="overflow-hidden rounded-lg border border-border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/50">
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Date</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase text-muted-foreground">Amount</th>
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Method</th>
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Reference</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paymentHistory.map((p) => (
                                            <tr key={p.id} className="border-t border-border first:border-t-0">
                                                <td className="px-3 py-2 text-xs">{fmtDate(p.payment_date)}</td>
                                                <td className="px-3 py-2 text-right text-xs font-semibold text-green-600">Tk {fmt$(p.amount)}</td>
                                                <td className="px-3 py-2 text-xs text-muted-foreground">{p.payment_method || '—'}</td>
                                                <td className="px-3 py-2 text-xs text-muted-foreground">{p.reference_number || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Report Dialog */}
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <FileDown className="size-4.5 text-muted-foreground" />
                            Payment Report
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="grid gap-1.5">
                                <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Party</Label>
                                <select value={reportParty} onChange={(e) => setReportParty(e.target.value)} className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none">
                                    <option value="">All Parties</option>
                                    {parties.map((p) => (
                                        <option key={p.id} value={p.id}>{p.party_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-[10px] font-semibold uppercase text-muted-foreground">From</Label>
                                <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="h-8 w-36 text-xs" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-[10px] font-semibold uppercase text-muted-foreground">To</Label>
                                <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="h-8 w-36 text-xs" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Status</Label>
                                <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none">
                                    <option value="">All</option>
                                    <option value="pending">Unpaid</option>
                                    <option value="paid">Paid</option>
                                    <option value="partial">Partial</option>
                                </select>
                            </div>
                            <Button size="sm" onClick={fetchReport}>Filter</Button>
                            <Button size="sm" variant="default" onClick={exportBulkReport} disabled={!reportSummary}>
                                <FileDown className="mr-1 size-3" />
                                Export PDF
                            </Button>
                        </div>

                        {reportSummary && (
                            <div className="grid grid-cols-4 gap-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                                <div>
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Invoices</span>
                                    <p className="font-semibold">{reportSummary.total_invoices}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Total</span>
                                    <p className="font-semibold">Tk {fmt$(reportSummary.total_amount)}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Paid</span>
                                    <p className="font-semibold text-green-600">Tk {fmt$(reportSummary.total_paid)}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Due</span>
                                    <p className="font-semibold text-red-600">Tk {fmt$(reportSummary.total_due)}</p>
                                </div>
                            </div>
                        )}

                        {reportData.length > 0 && (
                            <div className="overflow-hidden rounded-lg border border-border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/50">
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Invoice</th>
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Party</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase text-muted-foreground">Amount</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase text-muted-foreground">Paid</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase text-muted-foreground">Due</th>
                                            <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase text-muted-foreground">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.map((inv, i) => (
                                            <tr key={i} className="border-t border-border first:border-t-0">
                                                <td className="px-3 py-2 font-mono text-xs font-semibold">{inv.invoice_number}</td>
                                                <td className="px-3 py-2 text-xs">{inv.party_name}</td>
                                                <td className="px-3 py-2 text-right text-xs">Tk {fmt$(inv.total_amount)}</td>
                                                <td className="px-3 py-2 text-right text-xs text-green-600">Tk {fmt$(inv.amount_paid)}</td>
                                                <td className="px-3 py-2 text-right text-xs text-red-600">Tk {fmt$(inv.amount_due)}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
