import { Head } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    CreditCard,
    Plus,
    Printer,
    Share2,
    Paperclip,
    Search,
    RotateCcw,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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

type Party = { id: number; party_name: string };

type Challan = {
    id: number;
    challan_number: string;
    product_id: number;
    product_name: string;
    po_number: string;
    date: string;
    status: string;
};

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
    vat_reduce?: number;
    due_amount?: number;
    attachments?: string[];
    challan_ids?: number[];
    status: string;
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
    if (!d) {
        return '—';
    }

    return new Date(d).toLocaleDateString('en-GB');
}

function reducePct(amount: number | undefined, total: number | undefined) {
    const t = Number(total || 0);

    if (t <= 0) {
        return '0.00';
    }

    return ((Number(amount || 0) / t) * 100).toFixed(2);
}

export default function Payments({ parties }: { parties: Party[] }) {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [partyFilter, setPartyFilter] = useState('');
    const [partyFilterOpen, setPartyFilterOpen] = useState(false);
    const [partyFilterSearch, setPartyFilterSearch] = useState('');
    const [processing, setProcessing] = useState<number | null>(null);

    const [payOpen, setPayOpen] = useState(false);
    const [paying, setPaying] = useState<Invoice | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('');
    const [payRef, setPayRef] = useState('');
    const [payDate, setPayDate] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [payNotes, setPayNotes] = useState('');
    const [payStatus, setPayStatus] = useState('');
    const [payCustomerBank, setPayCustomerBank] = useState('');
    const [payUserBank, setPayUserBank] = useState('');
    const [payAttachment, setPayAttachment] = useState<File | null>(null);
    const [payReduceAmount, setPayReduceAmount] = useState('');
    const [payReduceNote, setPayReduceNote] = useState('');
    const [payReduceOtherNote, setPayReduceOtherNote] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkParty, setBulkParty] = useState('');
    const [bulkPartyOpen, setBulkPartyOpen] = useState(false);
    const [bulkPartySearch, setBulkPartySearch] = useState('');
    const [bulkChallans, setBulkChallans] = useState<Challan[]>([]);
    const [bulkChallanIds, setBulkChallanIds] = useState<number[]>([]);
    const [bulkChalSearch, setBulkChalSearch] = useState('');
    const [bulkInvoices, setBulkInvoices] = useState<Invoice[]>([]);
    const [bulkSelected, setBulkSelected] = useState<number[]>([]);
    const [bulkInvoSearch, setBulkInvoSearch] = useState('');
    const [bulkDate, setBulkDate] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [bulkMethod, setBulkMethod] = useState('');
    const [bulkRef, setBulkRef] = useState('');
    const [bulkNotes, setBulkNotes] = useState('');
    const [bulkStatus, setBulkStatus] = useState('paid');
    const [bulkCustomerBank, setBulkCustomerBank] = useState('');
    const [bulkUserBank, setBulkUserBank] = useState('');
    const [bulkAttachment, setBulkAttachment] = useState<File | null>(null);
    const [bulkReduceAmount, setBulkReduceAmount] = useState('');
    const [bulkReduceNote, setBulkReduceNote] = useState('');
    const [bulkReduceOtherNote, setBulkReduceOtherNote] = useState('');
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const bulkFileInputRef = useRef<HTMLInputElement>(null);

    const filteredFilterParties = parties.filter((p) =>
        p.party_name.toLowerCase().includes(partyFilterSearch.toLowerCase()),
    );

    const fetchInvoices = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', String(limit));

            if (filter !== 'all') {
                params.set('status', filter);
            }

            if (partyFilter) {
                params.set('party_id', partyFilter);
            }

            if (search) {
                params.set('search', search);
            }

            const res = await fetch(`/api/invoices?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setInvoices(data.data?.items || []);
            setTotal(data.data?.total || 0);
        } catch {
            toast.error('Failed to load invoices');
        }
    }, [page, limit, filter, partyFilter, search]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const openPayDialog = (inv: Invoice) => {
        setPaying(inv);
        setPayAmount(String(inv.due_amount ?? inv.amount_due));
        setPayMethod('');
        setPayRef('');
        setPayDate(new Date().toISOString().slice(0, 10));
        setPayNotes('');
        setPayStatus('');
        setPayCustomerBank('');
        setPayUserBank('');
        setPayAttachment(null);
        setPayReduceAmount('');
        setPayReduceNote('');
        setPayReduceOtherNote('');

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        setPayOpen(true);
    };

    const submitPayment = async () => {
        if (!paying) {
            return;
        }

        const amount = parseFloat(payAmount);

        if (!amount || amount <= 0) {
            toast.error('Enter a valid amount');

            return;
        }

        const due = paying.due_amount ?? paying.amount_due;

        if (amount > due) {
            toast.error('Amount exceeds due balance');

            return;
        }

        setProcessing(paying.id);

        try {
            const isFull = amount >= due;
            const formData = new FormData();
            formData.append(
                'status',
                payStatus || (isFull ? 'paid' : 'partial'),
            );
            formData.append('amount_paid', String(amount));

            if (payMethod) {
                formData.append('payment_method', payMethod);
            }

            if (payRef) {
                formData.append('reference_number', payRef);
            }

            if (payDate) {
                formData.append('payment_date', payDate);
            }

            if (payNotes) {
                formData.append('notes', payNotes);
            }

            if (payStatus) {
                formData.append('payment_status', payStatus);
            }

            if (payCustomerBank) {
                formData.append('customer_bank_name', payCustomerBank);
            }

            if (payUserBank) {
                formData.append('user_bank_name', payUserBank);
            }

            if (payAttachment) {
                formData.append('attachment', payAttachment);
            }

            if (payReduceAmount) {
                formData.append('reduce_amount', payReduceAmount);
            }

            const finalReduceNote =
                payReduceNote === 'Other' ? payReduceOtherNote : payReduceNote;

            if (finalReduceNote) {
                formData.append('reduce_note', finalReduceNote);
            }

            const res = await fetch(`/api/invoices/${paying.id}/status`, {
                method: 'PATCH',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: formData,
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

    const resetBulk = () => {
        setBulkParty('');
        setBulkPartySearch('');
        setBulkChallans([]);
        setBulkChallanIds([]);
        setBulkChalSearch('');
        setBulkInvoices([]);
        setBulkSelected([]);
        setBulkInvoSearch('');
        setBulkDate(new Date().toISOString().slice(0, 10));
        setBulkMethod('');
        setBulkRef('');
        setBulkNotes('');
        setBulkStatus('paid');
        setBulkCustomerBank('');
        setBulkUserBank('');
        setBulkAttachment(null);
        setBulkReduceAmount('');
        setBulkReduceNote('');
        setBulkReduceOtherNote('');

        if (bulkFileInputRef.current) {
            bulkFileInputRef.current.value = '';
        }
    };

    const openBulk = () => {
        resetBulk();
        setBulkOpen(true);
    };

    const loadBulkParty = async (partyId: string) => {
        try {
            const [chRes, invRes] = await Promise.all([
                fetch(`/api/challans?party_id=${partyId}&limit=100`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                }).then((r) => r.json()),
                fetch(`/api/invoices?party_id=${partyId}&limit=100`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                }).then((r) => r.json()),
            ]);
            const challans = chRes.data?.items || [];
            const invoices = (invRes.data?.items || []).filter(
                (i: Invoice) => i.status !== 'paid',
            );
            setBulkChallans(challans);
            setBulkChallanIds(challans.map((c: Challan) => c.id));
            setBulkInvoices(invoices);
            setBulkSelected([]);
        } catch {
            toast.error('Failed to load party data');
        }
    };

    const filteredBulkChallans = bulkChallans.filter(
        (c) =>
            c.challan_number
                .toLowerCase()
                .includes(bulkChalSearch.toLowerCase()) ||
            (c.product_name || '')
                .toLowerCase()
                .includes(bulkChalSearch.toLowerCase()),
    );

    const filteredBulkInvoices = bulkInvoices.filter((i) => {
        if (bulkChallanIds.length > 0) {
            const linked = (i.challan_ids || []).some((id) =>
                bulkChallanIds.includes(id),
            );

            if (!linked) {
                return false;
            }
        }

        const q = bulkInvoSearch.toLowerCase();

        if (
            q &&
            !((i.invoice_number || '') + ' ' + (i.party_name || ''))
                .toLowerCase()
                .includes(q)
        ) {
            return false;
        }

        return true;
    });

    const toggleBulkChallansAll = () => {
        if (
            filteredBulkChallans.length > 0 &&
            filteredBulkChallans.every((c) => bulkChallanIds.includes(c.id))
        ) {
            setBulkChallanIds((prev) =>
                prev.filter(
                    (id) => !filteredBulkChallans.some((c) => c.id === id),
                ),
            );
        } else {
            setBulkChallanIds((prev) => [
                ...new Set([...prev, ...filteredBulkChallans.map((c) => c.id)]),
            ]);
        }
    };

    const toggleBulkInvoicesAll = () => {
        if (
            filteredBulkInvoices.length > 0 &&
            filteredBulkInvoices.every((i) => bulkSelected.includes(i.id))
        ) {
            setBulkSelected((prev) =>
                prev.filter(
                    (id) => !filteredBulkInvoices.some((i) => i.id === id),
                ),
            );
        } else {
            setBulkSelected((prev) => [
                ...new Set([...prev, ...filteredBulkInvoices.map((i) => i.id)]),
            ]);
        }
    };

    const bulkSelectedInvoices = bulkInvoices.filter((i) =>
        bulkSelected.includes(i.id),
    );
    const bulkTotalDue = bulkSelectedInvoices.reduce(
        (s, i) => s + Number(i.due_amount ?? i.amount_due ?? 0),
        0,
    );
    const bulkReduceTotal = parseFloat(bulkReduceAmount) || 0;
    const bulkToPay = Math.max(0, bulkTotalDue - bulkReduceTotal);

    const submitBulkPayment = async () => {
        if (bulkSelected.length === 0) {
            toast.error('Select at least one invoice');

            return;
        }

        if (!bulkDate) {
            toast.error('Enter a valid payment date');

            return;
        }

        setBulkProcessing(true);

        try {
            const formData = new FormData();
            formData.append('invoice_ids', JSON.stringify(bulkSelected));

            if (bulkMethod) {
                formData.append('payment_method', bulkMethod);
            }

            if (bulkRef) {
                formData.append('reference_number', bulkRef);
            }

            if (bulkDate) {
                formData.append('payment_date', bulkDate);
            }

            if (bulkNotes) {
                formData.append('notes', bulkNotes);
            }

            formData.append('payment_status', bulkStatus);

            if (bulkCustomerBank) {
                formData.append('customer_bank_name', bulkCustomerBank);
            }

            if (bulkUserBank) {
                formData.append('user_bank_name', bulkUserBank);
            }

            if (bulkAttachment) {
                formData.append('attachment', bulkAttachment);
            }

            if (bulkReduceAmount) {
                formData.append('reduce_amount', bulkReduceAmount);
            }

            const finalReduceNote =
                bulkReduceNote === 'Other'
                    ? bulkReduceOtherNote
                    : bulkReduceNote;

            if (finalReduceNote) {
                formData.append('reduce_note', finalReduceNote);
            }

            const res = await fetch('/api/payments/bulk', {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: formData,
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || 'Payment recorded');
                setBulkOpen(false);
                resetBulk();
                fetchInvoices();
            } else {
                toast.error(data.message || 'Something went wrong');
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setBulkProcessing(false);
        }
    };

    const printPayment = (inv: Invoice) => {
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Payment Receipt - ${inv.invoice_number}</title>
        <style>@page{size:A4;margin:15mm;}body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:20px;font-size:13px;}</style></head><body>
        <div style="text-align:center;margin-bottom:20px;"><h1 style="font-size:26px;margin:0;color:#0f172a;text-transform:uppercase;letter-spacing:2px;">PAYMENT RECEIPT</h1></div>
        <table style="width:100%;border:none;margin-bottom:20px;font-size:13px;">
            <tr><td style="width:50%;border:none;padding:4px 0;"><strong>Invoice No:</strong> ${inv.invoice_number}</td><td style="width:50%;border:none;padding:4px 0;text-align:right;"><strong>Date:</strong> ${fmtDate(inv.date)}</td></tr>
            <tr><td style="border:none;padding:4px 0;"><strong>Party:</strong> ${inv.party_name || 'N/A'}</td><td style="border:none;padding:4px 0;text-align:right;"><strong>Due Date:</strong> ${fmtDate(inv.due_date)}</td></tr>
        </table>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead><tr style="background:#f1f5f9;"><th style="padding:8px 12px;border:1px solid #000;text-align:left;font-size:11px;text-transform:uppercase;">Description</th><th style="padding:8px 12px;border:1px solid #000;text-align:right;font-size:11px;text-transform:uppercase;width:120px;">Amount (Tk)</th></tr></thead>
            <tbody>
                <tr><td style="padding:8px 12px;border:1px solid #000;">Total Amount</td><td style="padding:8px 12px;border:1px solid #000;text-align:right;">${fmt$(inv.total_amount)}</td></tr>
                <tr><td style="padding:8px 12px;border:1px solid #000;">Amount Paid</td><td style="padding:8px 12px;border:1px solid #000;text-align:right;color:#16a34a;">${fmt$(inv.amount_paid)}</td></tr>
                <tr><td style="padding:8px 12px;border:1px solid #000;">Amount Due</td><td style="padding:8px 12px;border:1px solid #000;text-align:right;color:#dc2626;">${fmt$(inv.due_amount ?? 0)}</td></tr>
                <tr><td style="padding:8px 12px;border:1px solid #000;">VAT Reduce (${reducePct(inv.vat_reduce ?? 0, inv.total_amount)}%)</td><td style="padding:8px 12px;border:1px solid #000;text-align:right;color:#dc2626;">${fmt$(inv.vat_reduce ?? 0)}</td></tr>
                <tr style="background:#f8fafc;"><td style="padding:8px 12px;border:1px solid #000;font-weight:bold;">Status</td><td style="padding:8px 12px;border:1px solid #000;text-align:right;text-transform:capitalize;">${inv.status}</td></tr>
            </tbody>
        </table>
        <div style="margin-top:30px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;">Generated by M/S Noor Hotel and Restaurant</div>
        </body></html>`;
        const win = window.open('', '_blank', 'width=800,height=600');

        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 500);
        }
    };

    const sharePayment = async (inv: Invoice) => {
        const text = [
            `Invoice: ${inv.invoice_number}`,
            `Party: ${inv.party_name}`,
            `Date: ${fmtDate(inv.date)}`,
            `Amount: Tk ${fmt$(inv.total_amount)}`,
            `Paid: Tk ${fmt$(inv.amount_paid)}`,
            `Due: Tk ${fmt$(inv.due_amount ?? 0)}`,
            `VAT Reduce: Tk ${fmt$(inv.vat_reduce ?? 0)} (${reducePct(inv.vat_reduce ?? 0, inv.total_amount)}%)`,
            `Status: ${inv.status}`,
        ].join('\n');

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Payment - ${inv.invoice_number}`,
                    text,
                });
            } catch {
                // user cancelled
            }
        } else {
            await navigator.clipboard.writeText(text);
            toast.success('Payment info copied to clipboard');
        }
    };

    const printPaymentReport = () => {
        if (invoices.length === 0) {
            toast.error('No invoices to print');

            return;
        }

        let rows = '';
        invoices.forEach((inv, i) => {
            rows += `<tr>
                <td style="padding:6px 10px;border:1px solid #000;font-size:11px;">${i + 1}</td>
                <td style="padding:6px 10px;border:1px solid #000;font-size:11px;font-weight:600;">${inv.invoice_number}</td>
                <td style="padding:6px 10px;border:1px solid #000;font-size:11px;">${inv.party_name || '—'}</td>
                <td style="padding:6px 10px;border:1px solid #000;font-size:11px;">${fmtDate(inv.date)}</td>
                <td style="padding:6px 10px;border:1px solid #000;font-size:11px;text-align:right;color:#dc2626;">Tk ${fmt$(inv.due_amount ?? 0)}</td>
                <td style="padding:6px 10px;border:1px solid #000;font-size:11px;text-align:right;">Tk ${fmt$(inv.total_amount)}</td>
                <td style="padding:6px 10px;border:1px solid #000;font-size:11px;text-align:right;color:#16a34a;">Tk ${fmt$(inv.amount_paid)}</td>
                <td style="padding:6px 10px;border:1px solid #000;font-size:11px;text-align:right;color:#dc2626;">Tk ${fmt$(inv.vat_reduce ?? 0)} (${reducePct(inv.vat_reduce ?? 0, inv.total_amount)}%)</td>
                <td style="padding:6px 10px;border:1px solid #000;font-size:11px;text-align:center;text-transform:capitalize;">${inv.status === 'pending' ? 'Unpaid' : inv.status}</td>
            </tr>`;
        });
        const totalPaid = invoices.reduce(
            (s, i) => s + Number(i.amount_paid || 0),
            0,
        );
        const totalDue = invoices.reduce(
            (s, i) => s + Number(i.due_amount ?? 0),
            0,
        );
        const totalVatReduce = invoices.reduce(
            (s, i) => s + Number(i.vat_reduce ?? 0),
            0,
        );
        const totalAmount = invoices.reduce(
            (s, i) => s + Number(i.total_amount || 0),
            0,
        );
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Payment Report</title>
        <style>@page{size:A4 landscape;margin:10mm;}body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:20px;font-size:13px;}</style></head><body>
        <div style="text-align:center;margin-bottom:20px;"><h1 style="font-size:26px;margin:0;color:#0f172a;text-transform:uppercase;letter-spacing:2px;">PAYMENT REPORT</h1></div>
        <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f1f5f9;">
                <th style="padding:8px 10px;border:1px solid #000;text-align:left;font-size:11px;text-transform:uppercase;width:30px;">#</th>
                <th style="padding:8px 10px;border:1px solid #000;text-align:left;font-size:11px;text-transform:uppercase;">Invoice</th>
                <th style="padding:8px 10px;border:1px solid #000;text-align:left;font-size:11px;text-transform:uppercase;">Party</th>
                <th style="padding:8px 10px;border:1px solid #000;text-align:left;font-size:11px;text-transform:uppercase;">Date</th>
                <th style="padding:8px 10px;border:1px solid #000;text-align:right;font-size:11px;text-transform:uppercase;width:90px;">Due</th>
                <th style="padding:8px 10px;border:1px solid #000;text-align:right;font-size:11px;text-transform:uppercase;width:100px;">Amount</th>
                <th style="padding:8px 10px;border:1px solid #000;text-align:right;font-size:11px;text-transform:uppercase;width:100px;">Paid</th>
                <th style="padding:8px 10px;border:1px solid #000;text-align:right;font-size:11px;text-transform:uppercase;width:140px;">VAT Reduce</th>
                <th style="padding:8px 10px;border:1px solid #000;text-align:center;font-size:11px;text-transform:uppercase;width:80px;">Status</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:24px;border:1px solid #000;background:#f8fafc;padding:12px 16px;font-size:13px;font-weight:bold;">
            <div style="margin-bottom:8px;text-transform:uppercase;font-size:11px;color:#475569;">Summary</div>
            <div style="display:flex;flex-wrap:wrap;gap:16px 32px;">
                <div><strong>Total Invoices:</strong> ${invoices.length}</div>
                <div><strong>Total Amount:</strong> Tk ${fmt$(totalAmount)}</div>
                <div style="color:#dc2626;"><strong>Total Due:</strong> Tk ${fmt$(totalDue)}</div>
                <div style="color:#16a34a;"><strong>Total Paid:</strong> Tk ${fmt$(totalPaid)}</div>
                <div style="color:#dc2626;"><strong>Total VAT Reduce:</strong> Tk ${fmt$(totalVatReduce)} (${reducePct(totalVatReduce, totalAmount)}%)</div>
            </div>
        </div>
        <div style="margin-top:30px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;">Generated by M/S Noor Hotel and Restaurant</div>
        </body></html>`;
        const win = window.open('', '_blank', 'width=1000,height=600');

        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 500);
        }
    };

    const totalPages = Math.ceil(total / limit);
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);
    const totalAmountSum = invoices.reduce(
        (s, i) => s + Number(i.total_amount || 0),
        0,
    );
    const totalPaidSum = invoices.reduce(
        (s, i) => s + Number(i.amount_paid || 0),
        0,
    );
    const totalDueAmountSum = invoices.reduce(
        (s, i) => s + Number(i.due_amount ?? 0),
        0,
    );
    const totalVatReduceSum = invoices.reduce(
        (s, i) => s + Number(i.vat_reduce ?? 0),
        0,
    );

    return (
        <>
            <Head title="Payments" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <CreditCard className="size-5 text-foreground/80" />
                        </div>
                        <Heading
                            variant="small"
                            title="Payments"
                            description="Track and manage invoice payments"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="default" size="sm" onClick={openBulk}>
                            <Plus className="mr-1.5 size-4" />
                            Create Payment
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={printPaymentReport}
                        >
                            <Printer className="mr-1.5 size-4" />
                            Print Payment Report
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                        {statusFilters.map((f) => (
                            <button
                                key={f.v}
                                onClick={() => {
                                    setFilter(f.v);
                                    setPage(1);
                                }}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.v ? 'border border-border bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {f.l}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setPartyFilterOpen((v) => !v)}
                            className="flex h-8 w-56 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                            <span className="whitespace-nowrap">
                                {partyFilter
                                    ? parties.find(
                                          (p) => p.id === Number(partyFilter),
                                      )?.party_name || 'All Parties'
                                    : 'All Parties'}
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
                                        onChange={(e) =>
                                            setPartyFilterSearch(e.target.value)
                                        }
                                        className="h-7 text-xs"
                                    />
                                    <div className="mt-1 max-h-60 overflow-auto">
                                        <button
                                            type="button"
                                            className={`w-full rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${partyFilter === '' ? 'bg-accent font-medium' : ''}`}
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
                                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                                No parties found
                                            </div>
                                        ) : (
                                            filteredFilterParties.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className={`w-full rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${partyFilter === String(p.id) ? 'bg-accent font-medium' : ''}`}
                                                    onClick={() => {
                                                        setPartyFilter(
                                                            String(p.id),
                                                        );
                                                        setPartyFilterOpen(
                                                            false,
                                                        );
                                                        setPartyFilterSearch(
                                                            '',
                                                        );
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
                        <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by invoice # or party..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="h-8 w-56 pl-8 text-xs"
                        />
                    </div>
                    {(filter !== 'all' || partyFilter || search) && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                                setFilter('all');
                                setPartyFilter('');
                                setSearch('');
                                setPage(1);
                            }}
                        >
                            <RotateCcw className="mr-1.5 size-3.5" />
                            Reset
                        </Button>
                    )}
                    <span className="ml-auto text-xs font-medium text-muted-foreground">
                        {from}–{to} of {total} invoice{total === 1 ? '' : 's'}
                    </span>
                    <select
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setPage(1);
                        }}
                        className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                        <option value={10}>10 / page</option>
                        <option value={20}>20 / page</option>
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                    </select>
                </div>

                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Number
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Party
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Due Date
                                    </th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Due
                                    </th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Paid
                                    </th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        VAT Reduce
                                    </th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Attach
                                    </th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={11}
                                            className="px-4 py-16 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <CreditCard className="size-8 opacity-40" />
                                                <p className="text-sm font-medium">
                                                    No invoices found
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv) => (
                                        <tr
                                            key={inv.id}
                                            className="border-b border-sidebar-border/70 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border"
                                        >
                                            <td className="px-4 py-3 font-mono text-xs font-semibold">
                                                {inv.invoice_number}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-medium">
                                                {inv.party_name || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {fmtDate(inv.date)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {fmtDate(inv.due_date)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">
                                                Tk {fmt$(inv.due_amount ?? 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">
                                                Tk {fmt$(inv.total_amount)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-green-600 tabular-nums">
                                                Tk {fmt$(inv.amount_paid)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-red-600 tabular-nums">
                                                Tk {fmt$(inv.vat_reduce ?? 0)}
                                                <span className="block text-[10px] font-normal text-muted-foreground">
                                                    (
                                                    {reducePct(
                                                        inv.vat_reduce ?? 0,
                                                        inv.total_amount,
                                                    )}
                                                    %)
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {inv.attachments &&
                                                inv.attachments.length > 0 ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 px-0"
                                                        title="Open attachment"
                                                        onClick={() =>
                                                            window.open(
                                                                inv
                                                                    .attachments![
                                                                    inv
                                                                        .attachments!
                                                                        .length -
                                                                        1
                                                                ],
                                                                '_blank',
                                                            )
                                                        }
                                                    >
                                                        <Paperclip className="size-3.5" />
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[inv.status] || 'bg-slate-100 text-slate-600'}`}
                                                >
                                                    {inv.status === 'pending'
                                                        ? 'Unpaid'
                                                        : inv.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {inv.status !== 'paid' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs text-green-600 hover:text-green-700"
                                                            onClick={() =>
                                                                openPayDialog(
                                                                    inv,
                                                                )
                                                            }
                                                        >
                                                            <CreditCard className="mr-1 size-3" />
                                                            Pay
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs text-blue-600 hover:text-blue-700"
                                                        onClick={() =>
                                                            printPayment(inv)
                                                        }
                                                    >
                                                        <Printer className="mr-1 size-3" />
                                                        Print
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs text-purple-600 hover:text-purple-700"
                                                        onClick={() =>
                                                            sharePayment(inv)
                                                        }
                                                    >
                                                        <Share2 className="mr-1 size-3" />
                                                        Share
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {invoices.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-sidebar-border/70 bg-muted/30 dark:border-sidebar-border">
                                        <td
                                            colSpan={4}
                                            className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                        >
                                            Total
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs font-bold text-red-600 tabular-nums">
                                            Tk {fmt$(totalDueAmountSum)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs font-bold tabular-nums">
                                            Tk {fmt$(totalAmountSum)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs font-bold text-green-600 tabular-nums">
                                            Tk {fmt$(totalPaidSum)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs font-bold text-red-600 tabular-nums">
                                            Tk {fmt$(totalVatReduceSum)}
                                            <span className="block text-[10px] font-normal text-muted-foreground">
                                                (
                                                {reducePct(
                                                    totalVatReduceSum,
                                                    totalAmountSum,
                                                )}
                                                %)
                                            </span>
                                        </td>
                                        <td colSpan={3} />
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
                                <ChevronLeft className="mr-1 size-3.5" />{' '}
                                Previous
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
            </div>

            {/* Payment Dialog */}
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <CreditCard className="size-4.5 text-muted-foreground" />
                            Record Payment
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {paying?.invoice_number} &mdash; Due: Tk{' '}
                            {fmt$(
                                paying?.due_amount ?? (paying?.amount_due || 0),
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Amount *
                            </Label>
                            <Input
                                type="number"
                                value={payAmount}
                                onChange={(e) => {
                                    setPayAmount(e.target.value);
                                    const due =
                                        paying?.due_amount ??
                                        (paying?.amount_due || 0);
                                    const paid =
                                        parseFloat(e.target.value) || 0;
                                    const diff = Math.max(0, due - paid);
                                    setPayReduceAmount(
                                        diff > 0 ? String(diff) : '',
                                    );
                                }}
                                min={0}
                                max={paying?.due_amount ?? paying?.amount_due}
                                step="0.01"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Reduce Amount
                                </Label>
                                <Input
                                    type="number"
                                    value={payReduceAmount}
                                    disabled
                                    min={0}
                                    step="0.01"
                                    placeholder="0"
                                    className="bg-muted/40 text-muted-foreground"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Reduce Note
                                </Label>
                                <select
                                    value={payReduceNote}
                                    onChange={(e) =>
                                        setPayReduceNote(e.target.value)
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                >
                                    <option value="">Select reason</option>
                                    <option value="VAT & Tax">
                                        VAT &amp; Tax
                                    </option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        {payReduceNote === 'Other' && (
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Custom Reduce Note
                                </Label>
                                <Input
                                    type="text"
                                    value={payReduceOtherNote || ''}
                                    onChange={(e) =>
                                        setPayReduceOtherNote(e.target.value)
                                    }
                                    placeholder="Enter custom reason"
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Payment Date *
                                </Label>
                                <Input
                                    type="date"
                                    value={payDate}
                                    onChange={(e) => setPayDate(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Method
                                </Label>
                                <select
                                    value={payMethod}
                                    onChange={(e) =>
                                        setPayMethod(e.target.value)
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                >
                                    <option value="">Select</option>
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">
                                        Bank Transfer
                                    </option>
                                    <option value="cheque">Cheque</option>
                                    <option value="mobile">
                                        Mobile Payment
                                    </option>
                                </select>
                            </div>
                        </div>
                        {payMethod !== 'cash' && (
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Reference Number
                                </Label>
                                <Input
                                    type="text"
                                    value={payRef}
                                    onChange={(e) => setPayRef(e.target.value)}
                                    placeholder="Transaction/Cheque number"
                                />
                            </div>
                        )}
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Notes
                            </Label>
                            <Input
                                type="text"
                                value={payNotes}
                                onChange={(e) => setPayNotes(e.target.value)}
                                placeholder="Payment notes"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Payment Status
                            </Label>
                            <select
                                value={payStatus}
                                onChange={(e) => setPayStatus(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                            >
                                <option value="">Select Status</option>
                                <option value="partial">Partial</option>
                                <option value="paid">Paid</option>
                                <option value="due">Due</option>
                            </select>
                        </div>
                        {payMethod !== 'cash' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        Customer Bank Name
                                    </Label>
                                    <Input
                                        type="text"
                                        value={payCustomerBank}
                                        onChange={(e) =>
                                            setPayCustomerBank(e.target.value)
                                        }
                                        placeholder="Customer bank name"
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        Your Bank Name
                                    </Label>
                                    <Input
                                        type="text"
                                        value={payUserBank}
                                        onChange={(e) =>
                                            setPayUserBank(e.target.value)
                                        }
                                        placeholder="Your bank name"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Attachment
                            </Label>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={(e) =>
                                        setPayAttachment(
                                            e.target.files?.[0] || null,
                                        )
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 text-xs"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >
                                    <Paperclip className="mr-1.5 size-3" />
                                    {payAttachment
                                        ? payAttachment.name
                                        : 'Choose File'}
                                </Button>
                                {payAttachment && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 text-xs text-red-500 hover:text-red-600"
                                        onClick={() => {
                                            setPayAttachment(null);

                                            if (fileInputRef.current) {
                                                fileInputRef.current.value = '';
                                            }
                                        }}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                PDF, JPG, PNG, DOC up to 10MB
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="border-t border-border pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setPayOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={processing === paying?.id}
                            onClick={submitPayment}
                            className="min-w-28"
                        >
                            {processing === paying?.id
                                ? 'Saving...'
                                : 'Record Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Payment Dialog */}
            <Dialog
                open={bulkOpen}
                onOpenChange={(v) => {
                    setBulkOpen(v);

                    if (!v) {
                        resetBulk();
                    }
                }}
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <CreditCard className="size-4.5 text-muted-foreground" />
                            Create Payment
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Select a party, choose its challans and invoices,
                            then record one payment across all selected
                            invoices.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Party *
                            </Label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setBulkPartyOpen((v) => !v)}
                                    className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                >
                                    <span className="truncate">
                                        {bulkParty
                                            ? parties.find(
                                                  (p) =>
                                                      p.id ===
                                                      Number(bulkParty),
                                              )?.party_name || 'Select party'
                                            : 'Select party'}
                                    </span>
                                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                                </button>
                                {bulkPartyOpen && (
                                    <>
                                        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md">
                                            <Input
                                                autoFocus
                                                placeholder="Search party..."
                                                value={bulkPartySearch}
                                                onChange={(e) =>
                                                    setBulkPartySearch(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-8 text-sm"
                                            />
                                            <div className="mt-1 max-h-52 overflow-auto">
                                                {parties.filter((p) =>
                                                    p.party_name
                                                        .toLowerCase()
                                                        .includes(
                                                            bulkPartySearch.toLowerCase(),
                                                        ),
                                                ).length === 0 ? (
                                                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                        No parties found
                                                    </div>
                                                ) : (
                                                    parties
                                                        .filter((p) =>
                                                            p.party_name
                                                                .toLowerCase()
                                                                .includes(
                                                                    bulkPartySearch.toLowerCase(),
                                                                ),
                                                        )
                                                        .map((p) => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                className={`w-full rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${bulkParty === String(p.id) ? 'bg-accent font-medium' : ''}`}
                                                                onClick={() => {
                                                                    setBulkParty(
                                                                        String(
                                                                            p.id,
                                                                        ),
                                                                    );
                                                                    setBulkPartyOpen(
                                                                        false,
                                                                    );
                                                                    setBulkPartySearch(
                                                                        '',
                                                                    );
                                                                    loadBulkParty(
                                                                        String(
                                                                            p.id,
                                                                        ),
                                                                    );
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
                                                setBulkPartyOpen(false);
                                                setBulkPartySearch('');
                                            }}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {bulkParty && (
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Challans
                                </Label>
                                <Input
                                    type="text"
                                    placeholder="Search by challan or product..."
                                    value={bulkChalSearch}
                                    onChange={(e) =>
                                        setBulkChalSearch(e.target.value)
                                    }
                                    className="text-xs"
                                />
                                <div className="flex items-center justify-between">
                                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                                        <input
                                            type="checkbox"
                                            checked={
                                                filteredBulkChallans.length >
                                                    0 &&
                                                filteredBulkChallans.every(
                                                    (c) =>
                                                        bulkChallanIds.includes(
                                                            c.id,
                                                        ),
                                                )
                                            }
                                            onChange={toggleBulkChallansAll}
                                            className="rounded"
                                        />
                                        Select all challans
                                    </label>
                                    <span className="text-[10px] text-muted-foreground">
                                        {bulkChallanIds.length} selected
                                    </span>
                                </div>
                                <div className="max-h-40 space-y-1 overflow-y-auto">
                                    {filteredBulkChallans.length === 0 ? (
                                        <p className="py-2 text-xs text-muted-foreground">
                                            No challans found for this party
                                        </p>
                                    ) : (
                                        filteredBulkChallans.map((c) => (
                                            <label
                                                key={c.id}
                                                className="flex cursor-pointer items-center gap-2 rounded-md bg-muted/30 p-2 text-sm hover:bg-muted/60"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={bulkChallanIds.includes(
                                                        c.id,
                                                    )}
                                                    onChange={() =>
                                                        setBulkChallanIds(
                                                            (prev) =>
                                                                prev.includes(
                                                                    c.id,
                                                                )
                                                                    ? prev.filter(
                                                                          (i) =>
                                                                              i !==
                                                                              c.id,
                                                                      )
                                                                    : [
                                                                          ...prev,
                                                                          c.id,
                                                                      ],
                                                        )
                                                    }
                                                    className="rounded"
                                                />
                                                <span className="font-mono text-xs">
                                                    {c.challan_number}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    —{' '}
                                                    {c.product_name ||
                                                        c.po_number ||
                                                        '—'}
                                                </span>
                                                <span className="ml-auto text-[10px] text-muted-foreground">
                                                    {fmtDate(c.date)}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {bulkParty && (
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Invoices *
                                </Label>
                                <Input
                                    type="text"
                                    placeholder="Search by invoice or party..."
                                    value={bulkInvoSearch}
                                    onChange={(e) =>
                                        setBulkInvoSearch(e.target.value)
                                    }
                                    className="text-xs"
                                />
                                <div className="flex items-center justify-between">
                                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                                        <input
                                            type="checkbox"
                                            checked={
                                                filteredBulkInvoices.length >
                                                    0 &&
                                                filteredBulkInvoices.every(
                                                    (i) =>
                                                        bulkSelected.includes(
                                                            i.id,
                                                        ),
                                                )
                                            }
                                            onChange={toggleBulkInvoicesAll}
                                            className="rounded"
                                        />
                                        Select all invoices
                                    </label>
                                    <span className="text-[10px] text-muted-foreground">
                                        {bulkSelected.length} selected
                                    </span>
                                </div>
                                <div className="max-h-48 space-y-1 overflow-y-auto">
                                    {filteredBulkInvoices.length === 0 ? (
                                        <p className="py-2 text-xs text-muted-foreground">
                                            {bulkChallanIds.length === 0
                                                ? 'Select at least one challan to see invoices'
                                                : 'No payable invoices for the selected challans'}
                                        </p>
                                    ) : (
                                        filteredBulkInvoices.map((inv) => (
                                            <label
                                                key={inv.id}
                                                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/30 p-2 text-sm hover:bg-muted/60"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={bulkSelected.includes(
                                                        inv.id,
                                                    )}
                                                    onChange={() =>
                                                        setBulkSelected(
                                                            (prev) =>
                                                                prev.includes(
                                                                    inv.id,
                                                                )
                                                                    ? prev.filter(
                                                                          (i) =>
                                                                              i !==
                                                                              inv.id,
                                                                      )
                                                                    : [
                                                                          ...prev,
                                                                          inv.id,
                                                                      ],
                                                        )
                                                    }
                                                    className="rounded"
                                                />
                                                <span className="font-mono text-xs font-semibold">
                                                    {inv.invoice_number}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    — {inv.party_name}
                                                </span>
                                                <span className="ml-auto text-xs text-muted-foreground">
                                                    Due
                                                </span>
                                                <span className="text-xs font-semibold text-red-600 tabular-nums">
                                                    Tk{' '}
                                                    {fmt$(inv.due_amount ?? 0)}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {bulkSelectedInvoices.length > 0 && (
                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                                <div className="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                    Selected Invoices
                                </div>
                                <div className="space-y-1">
                                    {bulkSelectedInvoices.map((inv) => (
                                        <div
                                            key={inv.id}
                                            className="flex items-center justify-between text-xs"
                                        >
                                            <span className="font-mono">
                                                {inv.invoice_number}
                                            </span>
                                            <span className="text-muted-foreground">
                                                Due{' '}
                                                <strong className="text-red-600">
                                                    Tk{' '}
                                                    {fmt$(inv.due_amount ?? 0)}
                                                </strong>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                                    <span className="font-semibold">
                                        Total Due
                                    </span>
                                    <span className="font-bold text-red-600 tabular-nums">
                                        Tk {fmt$(bulkTotalDue)}
                                    </span>
                                </div>
                                {bulkReduceTotal > 0 && (
                                    <div className="mt-1 flex items-center justify-between text-xs">
                                        <span className="font-semibold">
                                            Reduce
                                        </span>
                                        <span className="font-semibold text-red-600 tabular-nums">
                                            − Tk {fmt$(bulkReduceTotal)}
                                        </span>
                                    </div>
                                )}
                                <div className="mt-1 flex items-center justify-between text-xs">
                                    <span className="font-bold">To Pay</span>
                                    <span className="font-bold tabular-nums">
                                        Tk {fmt$(bulkToPay)}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Payment Date *
                                </Label>
                                <Input
                                    type="date"
                                    value={bulkDate}
                                    onChange={(e) =>
                                        setBulkDate(e.target.value)
                                    }
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Method
                                </Label>
                                <select
                                    value={bulkMethod}
                                    onChange={(e) =>
                                        setBulkMethod(e.target.value)
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                >
                                    <option value="">Select</option>
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">
                                        Bank Transfer
                                    </option>
                                    <option value="cheque">Cheque</option>
                                    <option value="mobile">
                                        Mobile Payment
                                    </option>
                                </select>
                            </div>
                        </div>
                        {bulkMethod !== 'cash' && (
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Reference Number
                                </Label>
                                <Input
                                    type="text"
                                    value={bulkRef}
                                    onChange={(e) => setBulkRef(e.target.value)}
                                    placeholder="Transaction/Cheque number"
                                />
                            </div>
                        )}
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Notes
                            </Label>
                            <Input
                                type="text"
                                value={bulkNotes}
                                onChange={(e) => setBulkNotes(e.target.value)}
                                placeholder="Payment notes"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Reduce Amount
                                </Label>
                                <Input
                                    type="number"
                                    value={bulkReduceAmount}
                                    onChange={(e) =>
                                        setBulkReduceAmount(e.target.value)
                                    }
                                    min={0}
                                    max={bulkTotalDue}
                                    step="0.01"
                                    placeholder="0"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Reduce Note
                                </Label>
                                <select
                                    value={bulkReduceNote}
                                    onChange={(e) =>
                                        setBulkReduceNote(e.target.value)
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                >
                                    <option value="">Select reason</option>
                                    <option value="VAT & Tax">
                                        VAT &amp; Tax
                                    </option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        {bulkReduceNote === 'Other' && (
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Custom Reduce Note
                                </Label>
                                <Input
                                    type="text"
                                    value={bulkReduceOtherNote || ''}
                                    onChange={(e) =>
                                        setBulkReduceOtherNote(e.target.value)
                                    }
                                    placeholder="Enter custom reason"
                                />
                            </div>
                        )}
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Payment Status
                            </Label>
                            <select
                                value={bulkStatus}
                                onChange={(e) => setBulkStatus(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                            >
                                <option value="paid">Paid</option>
                                <option value="partial">Partial</option>
                                <option value="due">Due</option>
                            </select>
                        </div>
                        {bulkMethod !== 'cash' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        Customer Bank Name
                                    </Label>
                                    <Input
                                        type="text"
                                        value={bulkCustomerBank}
                                        onChange={(e) =>
                                            setBulkCustomerBank(e.target.value)
                                        }
                                        placeholder="Customer bank name"
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        Your Bank Name
                                    </Label>
                                    <Input
                                        type="text"
                                        value={bulkUserBank}
                                        onChange={(e) =>
                                            setBulkUserBank(e.target.value)
                                        }
                                        placeholder="Your bank name"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Attachment
                            </Label>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={bulkFileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={(e) =>
                                        setBulkAttachment(
                                            e.target.files?.[0] || null,
                                        )
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 text-xs"
                                    onClick={() =>
                                        bulkFileInputRef.current?.click()
                                    }
                                >
                                    <Paperclip className="mr-1.5 size-3" />
                                    {bulkAttachment
                                        ? bulkAttachment.name
                                        : 'Choose File'}
                                </Button>
                                {bulkAttachment && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 text-xs text-red-500 hover:text-red-600"
                                        onClick={() => {
                                            setBulkAttachment(null);

                                            if (bulkFileInputRef.current) {
                                                bulkFileInputRef.current.value =
                                                    '';
                                            }
                                        }}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                PDF, JPG, PNG, DOC up to 10MB
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="border-t border-border pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setBulkOpen(false);
                                resetBulk();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={
                                bulkProcessing || bulkSelected.length === 0
                            }
                            onClick={submitBulkPayment}
                            className="min-w-28"
                        >
                            {bulkProcessing
                                ? 'Saving...'
                                : `Record Payment${bulkSelected.length > 1 ? ` (${bulkSelected.length})` : ''}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
