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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Eye,
    Plus,
    Printer,
    FileText,
    ChevronLeft,
    ChevronRight,
    Receipt,
    MoreHorizontal,
    Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Party = { id: number; party_name: string };

type Product = {
    id: number;
    code: string;
    name: string;
    unit: string;
    party_id: number;
    customer_po_number: string;
    party?: Party;
};

type ChallanItem = {
    id?: number;
    meal_type: string;
    quantity: number;
    description?: string;
};

type Challan = {
    id: number;
    challan_number: string;
    product_id: number;
    product_name: string;
    po_number: string;
    party_id: number;
    party_name: string;
    date: string;
    status: string;
    items?: ChallanItem[];
};

type InvoiceItem = {
    id: number;
    product_name: string;
    description?: string;
    meal_type?: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    vat_amount: number;
    total: number;
};

type InvoiceChallan = {
    id: number;
    challan_number: string;
    product_name: string;
    po_number: string;
    party_name: string;
    challan_date: string;
    challan_status: string;
    items?: ChallanItem[];
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
    status: string;
    subtotal?: number;
    total_vat?: number;
    notes?: string;
    items?: InvoiceItem[];
    challans?: InvoiceChallan[];
};

const statusFilters = [
    { v: 'all', l: 'All' },
    { v: 'pending', l: 'Pending' },
    { v: 'partial', l: 'Partial' },
    { v: 'paid', l: 'Paid' },
    { v: 'overdue', l: 'Overdue' },
];

const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    pending: 'bg-amber-100 text-amber-700',
    partial: 'bg-amber-100 text-amber-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-red-100 text-red-700',
};

function fmt$(n: number | string) {
    return Math.round(parseFloat(String(n || 0))).toLocaleString('en-US');
}

function fmtDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB');
}

function fmtMealBreakdown(items?: ChallanItem[]) {
    if (!items || items.length === 0) return '—';
    return items.map((it) => `${it.meal_type}/${it.quantity}`).join(', ');
}

export default function Invoices({ parties, products, challans }: { parties: Party[]; products: Product[]; challans: Challan[] }) {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('all');
    const [partyFilter, setPartyFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewing, setViewing] = useState<Invoice | null>(null);
    const [processing, setProcessing] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<Invoice | null>(null);

    const [formParty, setFormParty] = useState('');
    const [formProduct, setFormProduct] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
    const [formDueDate, setFormDueDate] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [formChallanIds, setFormChallanIds] = useState<number[]>([]);
    const [chalSearch, setChalSearch] = useState('');

    const fetchInvoices = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '10');
            if (filter !== 'all') params.set('status', filter);
            if (partyFilter) params.set('party_id', partyFilter);
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);
            const res = await fetch(`/api/invoices?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setInvoices(data.data?.items || []);
            setTotal(data.data?.total || 0);
        } catch {
            toast.error('Failed to load invoices');
        }
    }, [page, filter, partyFilter, dateFrom, dateTo]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const toggleSelectAll = () => {
        if (selectedIds.length === invoices.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(invoices.map((inv) => inv.id));
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    const filteredProducts = formParty
        ? products.filter((p) => String(p.party_id) === String(formParty))
        : [];

    const filteredChallans = challans.filter((c) => {
        if (!formParty) return false;
        if (String(c.party_id) !== String(formParty)) return false;
        if (formProduct && String(c.product_id) !== String(formProduct)) return false;
        const q = chalSearch.toLowerCase();
        if (q && !(c.challan_number + ' ' + c.product_name + ' ' + c.po_number).toLowerCase().includes(q)) return false;
        return true;
    });

    const handleCreate = async () => {
        if (!formParty || formChallanIds.length === 0 || !formDate || !formDueDate) {
            toast.error('Fill all required fields and select at least one challan');
            return;
        }
        setProcessing(true);
        try {
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({
                    party_id: parseInt(formParty),
                    date: formDate,
                    due_date: formDueDate,
                    notes: formNotes,
                    challan_ids: formChallanIds,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Invoice created');
                setCreateOpen(false);
                resetForm();
                fetchInvoices();
            } else {
                toast.error(data.message || 'Something went wrong');
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setProcessing(false);
        }
    };

    const resetForm = () => {
        setFormParty('');
        setFormProduct('');
        setFormDate(new Date().toISOString().slice(0, 10));
        setFormDueDate('');
        setFormNotes('');
        setFormChallanIds([]);
        setChalSearch('');
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/invoices/${deleting.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Invoice deleted');
                setDeleteOpen(false);
                setDeleting(null);
                fetchInvoices();
            } else {
                toast.error(data.message || 'Failed to delete invoice');
            }
        } catch {
            toast.error('Failed to delete invoice');
        } finally {
            setProcessing(false);
        }
    };

    const openView = async (id: number) => {
        try {
            const res = await fetch(`/api/invoices/${id}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setViewing(data.data);
            setViewOpen(true);
        } catch {
            toast.error('Failed to load invoice');
        }
    };

    function fmtPrice(n: number | string) {
        const val = parseFloat(String(n || 0));
        return Number.isInteger(val) ? val.toLocaleString('en-US') : val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const printInvoice = async (id: number) => {
        try {
            const res = await fetch(`/api/invoices/${id}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            const d = data.data;
            if (!d) {
                toast.error('Failed to load invoice');
                return;
            }

            let prevProduct = '';
            let sl = 0;
            let itemRows = '';
            if (d.items) {
                d.items.forEach((it: InvoiceItem, i: number) => {
                    const isNewProduct = it.product_name !== prevProduct;
                    prevProduct = it.product_name;
                    if (isNewProduct && i > 0) {
                        itemRows += `<tr style="background:#f8fafc;">
                            <td colspan="4" style="border:1px solid #000;padding:4px 12px;font-size:11px;color:#475569;"></td>
                            <td style="border:1px solid #000;padding:4px 12px;text-align:right;font-size:11px;font-weight:bold;">Tk ${fmtPrice(it.total)}</td>
                        </tr>`;
                    }
                    sl++;
                    itemRows += `<tr>
                        <td style="padding:8px 12px;border:1px solid #000;font-size:12px;">${sl}</td>
                        <td style="padding:8px 12px;border:1px solid #000;white-space:pre-line;font-size:12px;">${it.description || it.product_name}</td>
                        <td style="padding:8px 12px;border:1px solid #000;text-align:left;text-transform:capitalize;">${it.meal_type || '-'}</td>
                        <td style="padding:8px 12px;border:1px solid #000;text-align:center;">${it.quantity}</td>
                        <td style="padding:8px 12px;border:1px solid #000;text-align:right;">Tk ${fmtPrice(it.unit_price)}</td>
                        <td style="padding:8px 12px;border:1px solid #000;text-align:right;font-weight:bold;">Tk ${fmtPrice(it.total)}</td>
                    </tr>`;
                });
                if (d.items.length > 0) {
                    itemRows += `<tr style="background:#f1f5f9;">
                        <td colspan="5" style="border:1px solid #000;padding:6px 12px;font-size:12px;font-weight:bold;text-align:right;">Grand Total:</td>
                        <td style="border:1px solid #000;padding:6px 12px;text-align:right;font-size:14px;font-weight:bold;">Tk ${fmtPrice(d.total_amount)}</td>
                    </tr>`;
                }
            }

            const dateStr = d.date ? new Date(d.date).toLocaleDateString('en-GB') : '—';

            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>Invoice ${d.invoice_number}</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 26px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        table.info td { border: none; padding: 4px 0; vertical-align: top; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.items th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #000; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        table.items td { padding: 8px 12px; border: 1px solid #000; }
        .totals { text-align: right; font-size: 14px; margin-top: 12px; }
        .totals div { margin-bottom: 4px; }
        .totals .grand { font-size: 16px; border-top: 2px solid #e2e8f0; padding-top: 6px; margin-top: 6px; }
        .totals .in-words { text-align: left; margin-top: 8px; font-size: 12px; color: #475569; }
        .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding: 8px 15mm; }
    </style>
</head>
<body>
    <div class="header">
        <h1>INVOICE</h1>
    </div>
    <table class="info">
        <tr>
            <td style="width:60%;">
                <strong>Invoice to:</strong><br/><br/>
                ${d.party_name || 'N/A'}<br/><br/>
            </td>
            <td style="width:40%;text-align:right;">
                <div style="display:inline-block;text-align:left;margin-top:4px;">
                    <strong>Invoice Date:</strong> ${dateStr}<br/><br/>
                    <strong>Ref:</strong> ${d.invoice_number}<br/><br/>
                    <strong>Customer PO:</strong> ${d.customer_po_number || '-'}
                </div>
            </td>
        </tr>
    </table>
    <table class="items">
        <thead>
            <tr>
                <th style="width:40px;">SL</th>
                <th>Product / Item</th>
                <th style="width:80px;text-align:left;">Meal</th>
                <th style="width:70px;text-align:center;">Qty</th>
                <th style="width:100px;text-align:right;">Unit Price</th>
                <th style="width:100px;text-align:right;">Amount</th>
            </tr>
        </thead>
        <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
        <table style="border:none;font-size:14px;margin-left:auto;">
            <tr>
                <td style="border:none;padding:4px 10px 4px 0;text-align:right;">Subtotal:</td>
                <td style="border:none;padding:4px 0;text-align:right;white-space:nowrap;"><strong>Tk ${fmtPrice(d.subtotal || 0)}</strong></td>
            </tr>
            <tr>
                <td style="border:none;padding:4px 10px 4px 0;text-align:right;">VAT:</td>
                <td style="border:none;padding:4px 0;text-align:right;white-space:nowrap;"><strong>Tk ${fmtPrice(d.total_vat || 0)}</strong></td>
            </tr>
            <tr>
                <td style="border:none;padding:4px 10px 4px 0;text-align:right;border-top:2px solid #e2e8f0;">Grand Total:</td>
                <td style="border:none;padding:4px 0;text-align:right;border-top:2px solid #e2e8f0;white-space:nowrap;font-size:16px;"><strong>Tk ${fmtPrice(d.total_amount)}</strong></td>
            </tr>
        </table>
    </div>
    <div style="position:fixed;bottom:10mm;left:10mm;right:10mm;">
        <table style="width:100%;border:none;font-size:12px;">
            <tr>
                <td style="width:55%;border:none;vertical-align:top;">
                    <strong style="font-size:13px;">Payment Method</strong><br/>
                    <table style="border:none;font-size:12px;margin-top:4px;">
                        <tr><td style="border:none;padding:1px 8px 1px 0;white-space:nowrap;"><strong>Bank Name:</strong></td><td style="border:none;padding:1px 0;">BRAC BANK</td></tr>
                        <tr><td style="border:none;padding:1px 8px 1px 0;white-space:nowrap;"><strong>A/C Name:</strong></td><td style="border:none;padding:1px 0;">NOOR HOTEL AND RESTAURANT</td></tr>
                        <tr><td style="border:none;padding:1px 8px 1px 0;white-space:nowrap;"><strong>Account Number:</strong></td><td style="border:none;padding:1px 0;">2078277570001</td></tr>
                        <tr><td style="border:none;padding:1px 8px 1px 0;white-space:nowrap;"><strong>Swift Code:</strong></td><td style="border:none;padding:1px 0;">BRAKBDDH</td></tr>
                        <tr><td style="border:none;padding:1px 8px 1px 0;white-space:nowrap;"><strong>Routing No:</strong></td><td style="border:none;padding:1px 0;">060220259</td></tr>
                        <tr><td style="border:none;padding:1px 8px 1px 0;">&nbsp;</td><td style="border:none;padding:1px 0;">Court Bazar Sub-Branch</td></tr>
                    </table>
                </td>
                <td style="width:45%;border:none;text-align:right;vertical-align:top;">
                    <div style="border-top:1px solid #1e293b;width:200px;display:inline-block;"></div>
                    <div style="display:inline-block;text-align:left;padding-top:6px;">
                        <div style="font-weight:bold;font-size:12px;">Mohammod</div>
                        <div style="font-size:11px;">Noor Hotel &amp; Restaurant</div>
                        <div style="font-size:11px;">Marketing Manager</div>
                    </div>
                </td>
            </tr>
        </table>
        <div style="text-align:center;font-size:18px;font-weight:bold;margin-top:10px;">Thank you for your business!</div>
    </div>
</body>
</html>`;

            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
                win.focus();
                win.print();
            }
        } catch {
            toast.error('Failed to load invoice');
        }
    };

    const printSelectedInvoices = async () => {
        if (selectedIds.length === 0) {
            toast.error('Select at least one invoice');
            return;
        }
        try {
            const results = await Promise.all(selectedIds.map((id) => fetch(`/api/invoices/${id}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then((r) => r.json())));
            let allHtml = '';
            results.forEach((r) => {
                const d = r.data;
                let chlRows = '';
                if (d.challans && d.challans.length) {
                    chlRows = d.challans
                        .map(
                            (c: InvoiceChallan, i: number) => {
                                const mealStr = c.items && c.items.length
                                    ? c.items.map((it: ChallanItem) => `${it.meal_type}/${it.quantity}`).join(', ')
                                    : '-';
                                return `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;">${i + 1}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600;">${c.challan_number}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;">${c.product_name || c.po_number || '-'}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;">${mealStr}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;">${fmtDate(c.challan_date)}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;"><span style="padding:2px 8px;border-radius:12px;font-size:11px;background:#dbeafe;color:#1d4ed8;">${c.challan_status}</span></td></tr>`;
                            },
                        )
                        .join('');
                }
                let itemRows = '';
                if (d.items) {
                    d.items.forEach((it: InvoiceItem, i: number) => {
                        itemRows += `<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;">${i + 1}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${it.product_name}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${it.meal_type || '-'}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">${it.quantity}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;">Tk ${fmt$(it.unit_price)}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;">${fmt$(it.vat_amount)}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;">Tk ${fmt$(it.total)}</td></tr>`;
                    });
                }
                allHtml += `<div style="page-break-after:always;padding:20px;border-bottom:2px dashed #e2e8f0;">
                    <div style="border-bottom:3px solid #2563eb;padding-bottom:12px;margin-bottom:16px;"><h1 style="font-size:22px;margin:0;color:#0f172a;">INVOICE</h1></div>
                    <table style="width:100%;border:none;margin-bottom:16px;font-size:13px;">
                        <tr><td style="width:50%;border:none;padding:4px 0;"><strong>Invoice No:</strong> ${d.invoice_number}</td><td style="width:50%;border:none;padding:4px 0;"><strong>Date:</strong> ${fmtDate(d.date)}</td></tr>
                        <tr><td style="border:none;padding:4px 0;"><strong>Party:</strong> ${d.party_name || 'N/A'}</td><td style="border:none;padding:4px 0;"><strong>Due Date:</strong> ${fmtDate(d.due_date)}</td></tr>
                        <tr><td colspan="2" style="border:none;padding:4px 0;"><strong>Status:</strong> ${d.status}</td></tr>
                    </table>
                    ${d.challans && d.challans.length ? `<h3 style="font-size:14px;margin:16px 0 8px;color:#475569;">Challans</h3><table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><thead><tr><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;width:40px;">#</th><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;">Challan No</th><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;">Product/PO</th><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;">Items</th><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;">Date</th><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;text-align:center;width:100px;">Status</th></tr></thead><tbody>${chlRows}</tbody></table>` : ''}
                    <h3 style="font-size:14px;margin:16px 0 8px;color:#475569;">Items</h3>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><thead><tr><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;width:40px;">#</th><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;">Product</th><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;">Meal</th><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;text-align:center;width:80px;">Qty</th><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;text-align:right;width:100px;">Price</th><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;text-align:right;width:100px;">VAT</th><th style="background:#f1f5f9;padding:8px 12px;border:1px solid #e2e8f0;text-align:right;width:100px;">Total</th></tr></thead><tbody>${itemRows}</tbody></table>
                    <div style="text-align:right;font-size:14px;margin-top:12px;">
                        <div>Subtotal: <strong>Tk ${fmt$(d.subtotal)}</strong></div>
                        <div>VAT: <strong>Tk ${fmt$(d.total_vat)}</strong></div>
                        <div style="font-size:16px;border-top:2px solid #e2e8f0;padding-top:6px;margin-top:6px;">Total: <strong>Tk ${fmt$(d.total_amount)}</strong></div>
                        <div style="color:#16a34a;">Paid: <strong>Tk ${fmt$(d.amount_paid)}</strong></div>
                        <div style="color:#dc2626;">Due: <strong>Tk ${fmt$(d.amount_due)}</strong></div>
                    </div>
                    ${d.notes ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin-top:16px;font-size:12px;color:#64748b;"><strong>Notes:</strong> ${d.notes}</div>` : ''}
                </div>`;
            });
            const printHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice Batch Print</title><style>@page{size:A4;margin:15mm;}body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:0;font-size:13px;}</style></head><body>${allHtml}</body></html>`;
            const win = window.open('', '_blank', 'width=800,height=600');
            if (win) {
                win.document.write(printHtml);
                win.document.close();
                win.focus();
                setTimeout(() => win.print(), 500);
            }
        } catch {
            toast.error('Failed to print invoices');
        }
    };

    const totalPages = Math.ceil(total / 10);

    return (
        <>
            <Head title="Invoices" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <Receipt className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Invoices" description="Manage invoices" />
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && (
                            <Button variant="default" onClick={printSelectedInvoices} className="bg-purple-500 hover:bg-purple-600">
                                <Printer className="mr-1.5 size-4" />
                                Print Selected ({selectedIds.length})
                            </Button>
                        )}
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus className="mr-1.5 size-4" />
                            New Invoice
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div className="grid gap-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Party</Label>
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
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-muted-foreground">From</Label>
                        <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-8 w-36 text-xs" />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-muted-foreground">To</Label>
                        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-8 w-36 text-xs" />
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setPartyFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}>
                        Clear
                    </Button>
                    <span className="ml-auto text-xs font-medium text-muted-foreground">
                        {total} invoice{total === 1 ? '' : 's'} total
                    </span>
                </div>

                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                                    <th className="px-4 py-3 text-left">
                                        <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === invoices.length} onChange={toggleSelectAll} className="rounded" />
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Number</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Party</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Due</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Paid</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Due</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <FileText className="size-8 opacity-40" />
                                                <p className="text-sm font-medium">No invoices found</p>
                                                <p className="text-xs">Create a new invoice to get started.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv) => (
                                        <tr key={inv.id} className="border-b border-sidebar-border/70 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border">
                                            <td className="px-4 py-3">
                                                <input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => toggleSelect(inv.id)} className="rounded" />
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.invoice_number}</td>
                                            <td className="px-4 py-3 text-xs font-medium">{inv.party_name || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(inv.date)}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(inv.due_date)}</td>
                                            <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">Tk {fmt$(inv.total_amount)}</td>
                                            <td className="px-4 py-3 text-right text-xs text-green-600 tabular-nums">Tk {fmt$(inv.amount_paid)}</td>
                                            <td className="px-4 py-3 text-right text-xs text-red-600 tabular-nums">Tk {fmt$(inv.amount_due)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                                <MoreHorizontal className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-36">
                                                            <DropdownMenuItem onClick={() => openView(inv.id)} className="text-xs">
                                                                <Eye className="mr-2 size-3.5" />
                                                                View
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => printInvoice(inv.id)} className="text-xs">
                                                                <Printer className="mr-2 size-3.5" />
                                                                Print
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => { setDeleting(inv); setDeleteOpen(true); }} className="text-xs text-red-600 focus:text-red-600">
                                                                <Trash2 className="mr-2 size-3.5" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <FileText className="size-4.5 text-muted-foreground" />
                            New Invoice
                        </DialogTitle>
                        <DialogDescription className="text-xs">Fields marked with * are required.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 max-h-[65vh] overflow-y-auto py-1 pr-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">Party *</Label>
                                <select
                                    value={formParty}
                                    onChange={(e) => { setFormParty(e.target.value); setFormProduct(''); setFormChallanIds([]); }}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                                >
                                    <option value="">Select party</option>
                                    {parties.map((p) => (
                                        <option key={p.id} value={p.id}>{p.party_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">Date *</Label>
                                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Due Date *</Label>
                            <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">PO (Product)</Label>
                            {formParty ? (
                                <select
                                    value={formProduct}
                                    onChange={(e) => { setFormProduct(e.target.value); setFormChallanIds([]); }}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                                >
                                    <option value="">All POs for this party</option>
                                    {filteredProducts.map((p) => (
                                        <option key={p.id} value={p.id}>{p.customer_po_number || p.code} - {p.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="py-2 text-xs text-muted-foreground">Select a party first</p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Challans *</Label>
                            {formParty ? (
                                <>
                                    <Input
                                        type="text"
                                        placeholder="Search by challan, product, PO..."
                                        value={chalSearch}
                                        onChange={(e) => setChalSearch(e.target.value)}
                                        className="text-xs"
                                    />
                                    <div className="max-h-48 space-y-1 overflow-y-auto">
                                        {filteredChallans.length === 0 ? (
                                            <p className="py-2 text-xs text-muted-foreground">No delivered challans for this party{formProduct ? ' and PO' : ''}</p>
                                        ) : (
                                            filteredChallans.map((c) => (
                                                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md bg-muted/30 p-2 text-sm hover:bg-muted/60">
                                                    <input
                                                        type="checkbox"
                                                        checked={formChallanIds.includes(c.id)}
                                                        onChange={() => setFormChallanIds((prev) => (prev.includes(c.id) ? prev.filter((i) => i !== c.id) : [...prev, c.id]))}
                                                        className="rounded"
                                                    />
                                                    <span className="font-mono text-xs">{c.challan_number}</span>
                                                    <span className="text-xs text-muted-foreground">— {c.product_name || c.po_number || '—'}</span>
                                                    {c.items && c.items.length > 0 && (
                                                        <span className="ml-auto text-[10px] text-muted-foreground">{fmtMealBreakdown(c.items)}</span>
                                                    )}
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </>
                            ) : (
                                <p className="py-2 text-xs text-muted-foreground">Select a party to view challans</p>
                            )}
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                            <textarea
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                                rows={2}
                                placeholder="Additional notes..."
                                value={formNotes}
                                onChange={(e) => setFormNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="border-t border-border pt-4">
                        <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
                        <Button disabled={processing} onClick={handleCreate} className="min-w-28">
                            {processing ? 'Saving…' : 'Create Invoice'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <FileText className="size-4.5 text-muted-foreground" />
                            {viewing?.invoice_number || 'Invoice Details'}
                        </DialogTitle>
                    </DialogHeader>
                    {viewing && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Party</span>
                                    <span className="font-medium">{viewing.party_name || '—'}</span>
                                </div>
                                <div>
                                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColors[viewing.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {viewing.status}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</span>
                                    <span>{fmtDate(viewing.date)}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Due Date</span>
                                    <span>{fmtDate(viewing.due_date)}</span>
                                </div>
                            </div>

                            {viewing.challans && viewing.challans.length > 0 && (
                                <div>
                                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Challans</span>
                                    <div className="space-y-1">
                                        {viewing.challans.map((c) => (
                                            <div key={c.id} className="rounded-lg border border-border bg-muted/30 p-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-xs font-semibold">{c.challan_number}</span>
                                                    <span className="text-xs text-muted-foreground">|</span>
                                                    <span className="text-xs text-muted-foreground">{c.product_name || c.po_number || '—'}</span>
                                                    <span className="text-xs text-muted-foreground">|</span>
                                                    <span className="text-xs text-muted-foreground">{fmtDate(c.challan_date)}</span>
                                                    <span className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[c.challan_status] || 'bg-slate-100 text-slate-600'}`}>
                                                        {c.challan_status}
                                                    </span>
                                                </div>
                                                {c.items && c.items.length > 0 && (
                                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                        {c.items.map((it, idx) => (
                                                            <span key={idx} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                {it.meal_type} <strong className="text-foreground">{it.quantity}</strong>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {viewing.items && viewing.items.length > 0 && (
                                <div className="overflow-hidden rounded-lg border border-border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/50">
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Meal</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Qty</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Price</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">VAT</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewing.items.map((it) => (
                                                <tr key={it.id} className="border-t border-border first:border-t-0">
                                                    <td className="px-3 py-2 text-xs">{it.product_name}</td>
                                                    <td className="px-3 py-2 text-xs text-muted-foreground">{it.meal_type || '—'}</td>
                                                    <td className="px-3 py-2 text-right text-xs tabular-nums">{it.quantity}</td>
                                                    <td className="px-3 py-2 text-right text-xs tabular-nums">Tk {fmt$(it.unit_price)}</td>
                                                    <td className="px-3 py-2 text-right text-xs tabular-nums">{it.vat_rate}% (Tk {fmt$(it.vat_amount)})</td>
                                                    <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">Tk {fmt$(it.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4 border-t border-border pt-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Subtotal:</span> <strong>Tk {fmt$(viewing.subtotal || 0)}</strong>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">VAT:</span> <strong>Tk {fmt$(viewing.total_vat || 0)}</strong>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Total:</span> <strong className="text-lg">Tk {fmt$(viewing.total_amount)}</strong>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="text-green-600">
                                    <span className="text-muted-foreground">Paid:</span> <strong>Tk {fmt$(viewing.amount_paid)}</strong>
                                </div>
                                <div className="text-red-600">
                                    <span className="text-muted-foreground">Due:</span> <strong>Tk {fmt$(viewing.amount_due)}</strong>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={() => printInvoice(viewing.id)} className="bg-purple-500 hover:bg-purple-600">
                                    <Printer className="mr-1.5 size-4" />
                                    Print Invoice
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeleting(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Trash2 className="size-4.5 text-red-500" />
                            Delete Invoice
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            This action cannot be undone. Are you sure you want to permanently delete this invoice?
                        </DialogDescription>
                    </DialogHeader>
                    {deleting && (
                        <div className="py-4">
                            <div className="rounded-lg border border-border bg-muted/30 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-sm font-semibold">{deleting.invoice_number}</span>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[deleting.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {deleting.status}
                                    </span>
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                    <span>{deleting.party_name || '—'}</span>
                                    <span className="mx-2">|</span>
                                    <span>Tk {fmt$(deleting.total_amount)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="border-t border-border pt-4">
                        <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleting(null); }}>Cancel</Button>
                        <Button disabled={processing} onClick={handleDelete} className="bg-red-500 hover:bg-red-600 min-w-28">
                            {processing ? 'Deleting…' : 'Delete Invoice'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
