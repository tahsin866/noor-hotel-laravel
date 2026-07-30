import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
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
    Pencil,
    Trash2,
    Printer,
    Send,
    FileText,
    Package,
    ChevronLeft,
    ChevronRight,
    Truck,
    Search,
    AlertTriangle,
    CheckSquare,
    Square,
    Undo2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Party = { id: number; party_name: string };

type ProductMeal = {
    id: number;
    meal_type: string;
    quantity: number;
    unit_price: number;
    delivered_quantity: number;
};

type Product = {
    id: number;
    code: string;
    name: string;
    unit: string;
    party_id: number;
    party?: Party;
    party_name: string;
    customer_po_number: string;
    meals: ProductMeal[];
    total_ordered: number;
    total_delivered: number;
};

type ChlItem = {
    product_meal_id: number;
    quantity: number;
    unit_price: number;
    product_name: string;
    meal_type: string;
    description?: string;
};

type Challan = {
    id: number;
    challan_number: string;
    product_id: number;
    product_name: string;
    po_number: string;
    customer_po_number: string;
    party_name: string;
    date: string;
    address: string;
    notes: string;
    total_amount: number;
    total_qty: number;
    status: string;
    items: ChlItem[];
};

const statusFilters = [
    { v: 'all', l: 'All' },
    { v: 'pending', l: 'Pending' },
    { v: 'dispatched', l: 'Dispatched' },
    { v: 'delivered', l: 'Delivered' },
    { v: 'cancelled', l: 'Cancelled' },
];

const statusColors: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-700 border-blue-200',
    dispatched: 'bg-amber-100 text-amber-700 border-amber-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const mealBadge: Record<string, string> = {
    breakfast: 'bg-amber-100 text-amber-700',
    lunch: 'bg-green-100 text-green-700',
    dinner: 'bg-indigo-100 text-indigo-700',
    snack: 'bg-pink-100 text-pink-700',
};

function fmt$(n: number | string) {
    return Number(n || 0).toFixed(2);
}

function fmtDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB');
}

type FormItem = { product_meal_id: number; meal_type: string; unit_price: number; quantity: number; max: number };

function ChallanForm({
    title,
    submitLabel,
    onSubmit,
    processing,
    errors,
    parties,
    filteredProducts,
    formParty,
    setFormParty,
    selectedPo,
    loadPoDetails,
    date,
    setDate,
    poInfo,
    address,
    setAddress,
    notes,
    setNotes,
    items,
    updateItemQty,
    grandTotal,
    onCancel,
}: {
    title: string;
    submitLabel: string;
    onSubmit: () => void;
    processing: boolean;
    errors: Record<string, string>;
    parties: Party[];
    filteredProducts: Product[];
    formParty: string;
    setFormParty: (v: string) => void;
    selectedPo: string;
    loadPoDetails: (v: string) => void;
    date: string;
    setDate: (v: string) => void;
    poInfo: Product | null;
    address: string;
    setAddress: (v: string) => void;
    notes: string;
    setNotes: (v: string) => void;
    items: FormItem[];
    updateItemQty: (idx: number, qty: number) => void;
    grandTotal: number;
    onCancel: () => void;
}) {
    return (
        <>
            <DialogHeader className="space-y-1 border-b border-border pb-4">
                <DialogTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-4.5 text-muted-foreground" />
                    {title}
                </DialogTitle>
                <DialogDescription className="text-xs">
                    Fields marked with * are required.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 max-h-[65vh] overflow-y-auto py-1 pr-1">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Party *</Label>
                        <select
                            value={formParty}
                            onChange={(e) => {
                                setFormParty(e.target.value);
                            }}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">All Parties</option>
                            {parties.map((p) => (
                                <option key={p.id} value={p.id}>{p.party_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Date *</Label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">PO (Product) *</Label>
                    <select
                        value={selectedPo}
                        onChange={(e) => loadPoDetails(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">Select PO (Product)</option>
                        {filteredProducts.map((p) => {
                            const remaining = (p.meals || []).reduce((sum, m) => sum + Math.max(0, m.quantity - (m.delivered_quantity || 0)), 0);
                            return (
                                <option key={p.id} value={p.id}>
                                    {p.code} - {p.name} [{remaining} remaining]
                                </option>
                            );
                        })}
                    </select>
                </div>

                {poInfo && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-[10px] font-semibold uppercase text-blue-400">PO Code</span>
                                <p className="font-mono text-blue-800">{poInfo.code}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-semibold uppercase text-blue-400">Name</span>
                                <p className="text-blue-800">{poInfo.name}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-semibold uppercase text-blue-400">Party</span>
                                <p className="text-blue-800">{poInfo.party?.party_name || '—'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-semibold uppercase text-blue-400">Unit</span>
                                <p className="text-blue-800">{poInfo.unit}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Delivery Address *</Label>
                    <textarea
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        rows={2}
                        placeholder="Enter delivery address..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                    <InputError message={errors.address} />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                    <textarea
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        rows={2}
                        placeholder="Additional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Items *</Label>
                    {items.length === 0 ? (
                        <p className="py-2 text-xs text-muted-foreground">Select a PO to load items</p>
                    ) : (
                        <div className="space-y-2">
                            {items.map((it, idx) => (
                                <div key={it.product_meal_id} className="rounded-lg border border-border bg-muted/30 p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${mealBadge[it.meal_type] || 'bg-slate-100 text-slate-600'}`}>
                                                {it.meal_type.charAt(0).toUpperCase() + it.meal_type.slice(1)}
                                            </span>
                                            <span className="text-xs text-muted-foreground">৳{fmt$(it.unit_price)}/unit</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Max: <strong>{it.max}</strong>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label className="w-20 text-xs text-muted-foreground">Dispatch Qty</Label>
                                        <Input
                                            type="number"
                                            className="h-8 flex-1 text-xs"
                                            value={it.quantity}
                                            min={0}
                                            max={it.max}
                                            onChange={(e) => updateItemQty(idx, parseInt(e.target.value) || 0)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        />
                                        <span className="w-24 text-right text-xs font-semibold tabular-nums">
                                            ৳{fmt$(it.quantity * it.unit_price)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                <div className="flex justify-between text-sm font-bold text-emerald-800">
                                    <span>Total Delivery Amount:</span>
                                    <span className="tabular-nums">৳{fmt$(grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button disabled={processing} onClick={onSubmit} className="min-w-28">
                    {processing ? 'Saving…' : submitLabel}
                </Button>
            </DialogFooter>
        </>
    );
}

export default function Challans({ products, parties }: { products: Product[]; parties: Party[] }) {
    const [challans, setChallans] = useState<Challan[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [partyFilter, setPartyFilter] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [viewing, setViewing] = useState<Challan | null>(null);
    const [editing, setEditing] = useState<Challan | null>(null);
    const [deleting, setDeleting] = useState<Challan | null>(null);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const [selectedPo, setSelectedPo] = useState('');
    const [formParty, setFormParty] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [poInfo, setPoInfo] = useState<Product | null>(null);
    const [items, setItems] = useState<FormItem[]>([]);

    const fetchChallans = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', String(limit));
            if (filter !== 'all') params.set('status', filter);
            if (search) params.set('search', search);
            if (partyFilter) params.set('party_id', partyFilter);
            const res = await fetch(`/api/challans?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setChallans(data.data?.items || []);
            setTotal(data.data?.total || 0);
        } catch {
            toast.error('Failed to load challans');
        }
    }, [page, limit, filter, search, partyFilter]);

    useEffect(() => {
        fetchChallans();
    }, [fetchChallans]);

    const resetForm = () => {
        setSelectedPo('');
        setFormParty('');
        setDate(new Date().toISOString().slice(0, 10));
        setAddress('');
        setNotes('');
        setPoInfo(null);
        setItems([]);
        setErrors({});
    };

    const openCreate = () => {
        resetForm();
        setCreateOpen(true);
    };

    const loadPoDetails = (productId: string, isEdit = false) => {
        setSelectedPo(productId);
        const p = products.find((x) => x.id === parseInt(productId));
        if (!p) {
            setPoInfo(null);
            setItems([]);
            return;
        }
        setPoInfo(p);
        const rows = (p.meals || [])
            .map((m) => {
                const remaining = Math.max(0, m.quantity - (m.delivered_quantity || 0));
                if (remaining <= 0) return null;
                return {
                    product_meal_id: m.id,
                    meal_type: m.meal_type,
                    unit_price: m.unit_price,
                    quantity: remaining,
                    max: remaining,
                };
            })
            .filter(Boolean) as FormItem[];
        setItems(rows);
    };

    const loadPoDetailsForEdit = (productId: string, existingItems: ChlItem[]) => {
        setSelectedPo(productId);
        const p = products.find((x) => x.id === parseInt(productId));
        if (!p) {
            setPoInfo(null);
            setItems([]);
            return;
        }
        setPoInfo(p);
        const rows = (p.meals || [])
            .map((m) => {
                const remaining = Math.max(0, m.quantity - (m.delivered_quantity || 0));
                if (remaining <= 0) return null;
                const existing = existingItems.find((ei) => ei.product_meal_id === m.id);
                return {
                    product_meal_id: m.id,
                    meal_type: m.meal_type,
                    unit_price: m.unit_price,
                    quantity: existing ? existing.quantity : remaining,
                    max: remaining,
                };
            })
            .filter(Boolean) as FormItem[];
        setItems(rows);
    };

    const updateItemQty = (idx: number, qty: number) => {
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: Math.min(qty, it.max) } : it)));
    };

    const grandTotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

    const buildBody = () => ({
        product_id: parseInt(selectedPo),
        date,
        address,
        notes,
        items: items.map((it) => ({ product_meal_id: it.product_meal_id, quantity: it.quantity })),
    });

    const handleCreate = async () => {
        if (!selectedPo || items.length === 0) {
            toast.error('Select a PO and add items');
            return;
        }
        setProcessing(true);
        setErrors({});
        try {
            const res = await fetch('/api/challans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify(buildBody()),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Challan created');
                setCreateOpen(false);
                resetForm();
                fetchChallans();
            } else if (res.status === 422) {
                setErrors(data.errors || {});
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdate = async () => {
        if (!editing || !selectedPo) return;
        setProcessing(true);
        setErrors({});
        try {
            const res = await fetch(`/api/challans/${editing.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify(buildBody()),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Challan updated');
                setEditOpen(false);
                setEditing(null);
                resetForm();
                fetchChallans();
            } else if (res.status === 422) {
                setErrors(data.errors || {});
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/challans/${deleting.id}`, {
                method: 'DELETE',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Challan deleted');
                setDeleteOpen(false);
                setDeleting(null);
                fetchChallans();
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        } finally {
            setProcessing(false);
        }
    };

    const openView = async (id: number) => {
        try {
            const res = await fetch(`/api/challans/${id}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setViewing(data.data);
            setViewOpen(true);
        } catch {
            toast.error('Failed to load challan');
        }
    };

    const openEdit = async (c: Challan) => {
        try {
            const res = await fetch(`/api/challans/${c.id}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            const d = data.data;
            setEditing(d);
            setDate(d.date);
            setAddress(d.address || '');
            setNotes(d.notes || '');
            const p = products.find((x) => x.id === d.product_id);
            setFormParty(p?.party_id ? String(p.party_id) : '');
            loadPoDetailsForEdit(String(d.product_id), d.items || []);
            setErrors({});
            setEditOpen(true);
        } catch {
            toast.error('Failed to load challan');
        }
    };

    const dispatchChallan = async (id: number) => {
        try {
            const res = await fetch(`/api/challans/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ status: 'dispatched' }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Challan dispatched');
                fetchChallans();
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        }
    };

    const deliverChallan = async (id: number) => {
        try {
            const res = await fetch(`/api/challans/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ status: 'delivered' }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Challan delivered');
                fetchChallans();
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        }
    };

    const cancelChallan = async (id: number) => {
        try {
            const res = await fetch(`/api/challans/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ status: 'cancelled' }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Challan cancelled');
                fetchChallans();
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        }
    };

    const returnToPending = async (id: number) => {
        try {
            const res = await fetch(`/api/challans/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ status: 'pending' }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Challan returned to pending');
                fetchChallans();
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        }
    };

    const returnToDispatched = async (id: number) => {
        try {
            const res = await fetch(`/api/challans/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ status: 'dispatched' }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Challan returned to dispatched');
                fetchChallans();
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        }
    };

    const printChallan = async (id: number) => {
        try {
            const res = await fetch(`/api/challans/${id}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            const c = data.data;
            if (!c) {
                toast.error('Failed to load challan');
                return;
            }

                            const rows = (c.items || []).filter((it: ChlItem) => it.quantity > 0)
                .map(
                    (it: ChlItem, i: number) =>
                            `<tr>
                                <td style="width:20px;padding:6px 8px;border:1px solid #000;text-align:center;">${i + 1}</td>
                                <td style="padding:6px 12px;border:1px solid #000;">${it.description || it.product_name}</td>
                                <td style="width:50px;padding:6px 8px;border:1px solid #000;text-align:left;">${it.meal_type.charAt(0).toUpperCase() + it.meal_type.slice(1)}</td>
                                <td style="width:50px;padding:6px 8px;border:1px solid #000;text-align:center;">${it.quantity}</td>
                            </tr>`,
                )
                .join('');

            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>Challan ${c.challan_number}</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
        h1 { font-size: 22px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; text-align: center; padding-bottom: 12px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        table.items th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #000; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        .notes { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #64748b; }
        .content-wrapper { display: flex; flex-direction: column; min-height: 100vh; }
        .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: auto; }
        .signatures { margin-top: 30px; }
        .body-content { flex: 1; }
    </style>
</head>
<body>
    <div class="content-wrapper">
        <div class="body-content">
            <h1>DELIVERY CHALLAN</h1>
            <table style="width:100%;border:none;margin-bottom:16px;font-size:13px;">
                <tr>
                    <td style="border:none;padding:4px 0;"><strong>Party:</strong> ${c.party_name || '—'}</td>
                    <td style="border:none;padding:4px 0;text-align:right;"><strong>Challan No:</strong> ${c.challan_number}</td>
                </tr>
                ${c.customer_po_number && c.customer_po_number !== '-' ? `<tr>
                    <td style="border:none;padding:4px 0;max-width:50%;overflow-wrap:break-word;word-wrap:break-word;"><strong>Address:</strong> ${c.address || '—'}</td>
                    <td style="border:none;padding:4px 0;text-align:right;"><strong>Customer PO:</strong> ${c.customer_po_number}</td>
                </tr>` : `<tr>
                    <td style="border:none;padding:4px 0;max-width:50%;overflow-wrap:break-word;word-wrap:break-word;"><strong>Address:</strong> ${c.address || '—'}</td>
                    <td style="border:none;padding:4px 0;text-align:right;"><strong>PO:</strong> ${c.po_number || '—'}</td>
                </tr>`}
                <tr>
                    <td style="border:none;padding:4px 0;"></td>
                    <td style="border:none;padding:4px 0;text-align:right;"><strong>Date:</strong> ${c.date ? new Date(c.date).toLocaleDateString('en-GB') : '—'}</td>
                </tr>
            </table>
            <table class="items">
                <thead>
                    <tr>
                        <th style="width:20px;">SL</th>
                        <th>Product / Item</th>
                        <th style="width:50px;text-align:left;">Meal</th>
                        <th style="width:50px;text-align:center;">Qty</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            ${c.notes ? `<div class="notes"><strong>Notes:</strong> ${c.notes}</div>` : ''}
        </div>
        <div class="signatures">
            <table style="width:100%;border:none;">
                <tr>
                    <td style="width:45%;border:none;text-align:center;padding:0;">
                        <div style="height:40px;"></div>
                        <div style="border-top:1px solid #1e293b;"></div>
                        <div style="padding-top:6px;font-weight:bold;font-size:12px;">Received By</div>
                    </td>
                    <td style="width:10%;border:none;"></td>
                    <td style="width:45%;border:none;text-align:center;padding:0;">
                        <div style="height:40px;"></div>
                        <div style="border-top:1px solid #1e293b;"></div>
                        <div style="padding-top:6px;font-weight:bold;font-size:12px;">Prepared By</div>
                    </td>
                </tr>
            </table>
        </div>
                <div class="footer">Generated on ${new Date().toLocaleDateString('en-GB')} &mdash; M/S Noor Hotel and restaurant</div>
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
            toast.error('Failed to load challan');
        }
    };

    const totalPages = Math.ceil(total / limit);
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);
    const filteredProducts = formParty
        ? products.filter((p) => String(p.party_id) === formParty)
        : products;

    const formProps = {
        processing,
        errors,
        parties,
        filteredProducts,
        formParty,
        setFormParty: (v: string) => {
            setFormParty(v);
            setSelectedPo('');
            setPoInfo(null);
            setItems([]);
        },
        selectedPo,
        loadPoDetails,
        date,
        setDate,
        poInfo,
        address,
        setAddress,
        notes,
        setNotes,
        items,
        updateItemQty,
        grandTotal,
    };

    return (
        <>
            <Head title="Challans" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <Truck className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Challans" description="Manage delivery challans" />
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-1.5 size-4" />
                        New Challan
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
                        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by challan # or PO..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="h-8 w-56 pl-8 text-xs"
                        />
                    </div>
                    <select
                        value={partyFilter}
                        onChange={(e) => { setPartyFilter(e.target.value); setPage(1); }}
                        className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">All Parties</option>
                        {parties.map((p) => (
                            <option key={p.id} value={p.id}>{p.party_name}</option>
                        ))}
                    </select>
                    <span className="ml-auto text-xs font-medium text-muted-foreground">
                        {total} challan{total === 1 ? '' : 's'} total
                    </span>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
                        <span className="text-xs font-medium text-primary">{selectedIds.size} selected</span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={async () => {
                                    try {
                                        let combinedHtml = '';
                                        let idx = 0;
                                        for (const id of selectedIds) {
                                            const res = await fetch(`/api/challans/${id}`, {
                                                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                                            });
                                            const data = await res.json();
                                            const c = data.data;
                                            if (!c) continue;

                                            const rows = (c.items || []).filter((it: ChlItem) => it.quantity > 0).map(
                                                (it: ChlItem, i: number) =>
                                                    `<tr>
                                                        <td style="width:20px;padding:6px 8px;border:1px solid #000;text-align:center;">${i + 1}</td>
                                                        <td style="padding:6px 12px;border:1px solid #000;">${it.description || it.product_name}</td>
                                                        <td style="width:50px;padding:6px 8px;border:1px solid #000;text-align:left;">${it.meal_type.charAt(0).toUpperCase() + it.meal_type.slice(1)}</td>
                                                        <td style="width:50px;padding:6px 8px;border:1px solid #000;text-align:center;">${it.quantity}</td>
                                                    </tr>`
                                            ).join('');

                                            const customerPoRow = c.customer_po_number && c.customer_po_number !== '-'
                                                ? `<tr><td style="border:none;padding:4px 0;max-width:50%;overflow-wrap:break-word;word-wrap:break-word;"><strong>Address:</strong> ${c.address || '—'}</td><td style="border:none;padding:4px 0;text-align:right;"><strong>Customer PO:</strong> ${c.customer_po_number}</td></tr>`
                                                : `<tr><td style="border:none;padding:4px 0;max-width:50%;overflow-wrap:break-word;word-wrap:break-word;"><strong>Address:</strong> ${c.address || '—'}</td><td style="border:none;padding:4px 0;text-align:right;"><strong>PO:</strong> ${c.po_number || '—'}</td></tr>`;

                                            combinedHtml += `
                                                <div class="challan-page">
                                                    <div class="content-wrapper">
                                                        <div class="body-content">
                                                            <h1>DELIVERY CHALLAN</h1>
                                                            <table style="width:100%;border:none;margin-bottom:16px;font-size:13px;">
                                                                <tr>
                                                                    <td style="border:none;padding:4px 0;"><strong>Party:</strong> ${c.party_name || '—'}</td>
                                                                    <td style="border:none;padding:4px 0;text-align:right;"><strong>Challan No:</strong> ${c.challan_number}</td>
                                                                </tr>
                                                                ${customerPoRow}
                                                                <tr>
                                                                    <td style="border:none;padding:4px 0;"></td>
                                                                    <td style="border:none;padding:4px 0;text-align:right;"><strong>Date:</strong> ${c.date ? new Date(c.date).toLocaleDateString('en-GB') : '—'}</td>
                                                                </tr>
                                                            </table>
                                                            <table class="items">
                                                                <thead>
                                                                    <tr>
                                                                        <th style="width:20px;">SL</th>
                                                                        <th>Product / Item</th>
                                                                        <th style="width:50px;text-align:left;">Meal</th>
                                                                        <th style="width:50px;text-align:center;">Qty</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>${rows}</tbody>
                                                            </table>
                                                            ${c.notes ? `<div class="notes"><strong>Notes:</strong> ${c.notes}</div>` : ''}
                                                        </div>
                                                        <div class="signatures">
                                                            <table style="width:100%;border:none;">
                                                                <tr>
                                                                    <td style="width:45%;border:none;text-align:center;padding:0;">
                                                                        <div style="height:40px;"></div>
                                                                        <div style="border-top:1px solid #1e293b;"></div>
                                                                        <div style="padding-top:6px;font-weight:bold;font-size:12px;">Received By</div>
                                                                    </td>
                                                                    <td style="width:10%;border:none;"></td>
                                                                    <td style="width:45%;border:none;text-align:center;padding:0;">
                                                                        <div style="height:40px;"></div>
                                                                        <div style="border-top:1px solid #1e293b;"></div>
                                                                        <div style="padding-top:6px;font-weight:bold;font-size:12px;">Prepared By</div>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </div>
                                                        <div class="footer">Generated on ${new Date().toLocaleDateString('en-GB')} &mdash; Noor Hotel PRG</div>
                                                    </div>
                                                </div>`;
                                            idx++;
                                        }

                                        if (!combinedHtml) {
                                            toast.error('Failed to load challans');
                                            return;
                                        }

                                        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>Challans Batch Print</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
        h1 { font-size: 22px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; text-align: center; padding-bottom: 12px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        table.items th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #000; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        table.items td { padding: 8px 12px; border: 1px solid #000; }
        .notes { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #64748b; }
        .content-wrapper { display: flex; flex-direction: column; min-height: 100vh; }
        .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: auto; }
        .signatures { margin-top: 30px; }
        .challan-page { page-break-after: always; display: flex; flex-direction: column; }
        .challan-page:last-child { page-break-after: avoid; }
        .body-content { flex: 1; }
    </style>
</head>
<body>
    ${combinedHtml}
</body>
</html>`;

                                        const win = window.open('', '_blank');
                                        if (win) {
                                            win.document.write(html);
                                            win.document.close();
                                            win.focus();
                                            win.print();
                                        }
                                        setSelectedIds(new Set());
                                    } catch {
                                        toast.error('Failed to print challans');
                                    }
                                }}
                            >
                                <Printer className="mr-1 size-3" />
                                Print
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={async () => {
                                    for (const id of selectedIds) {
                                        await fetch(`/api/challans/${id}/status`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                                            body: JSON.stringify({ status: 'dispatched' }),
                                        });
                                    }
                                    toast.success(`${selectedIds.size} challan(s) dispatched`);
                                    setSelectedIds(new Set());
                                    fetchChallans();
                                }}
                            >
                                <Send className="mr-1 size-3" />
                                Dispatch
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={async () => {
                                    for (const id of selectedIds) {
                                        await fetch(`/api/challans/${id}/status`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                                            body: JSON.stringify({ status: 'delivered' }),
                                        });
                                    }
                                    toast.success(`${selectedIds.size} challan(s) delivered`);
                                    setSelectedIds(new Set());
                                    fetchChallans();
                                }}
                            >
                                <Send className="mr-1 size-3" />
                                Deliver
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={async () => {
                                    for (const id of selectedIds) {
                                        await fetch(`/api/challans/${id}/status`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                                            body: JSON.stringify({ status: 'cancelled' }),
                                        });
                                    }
                                    toast.success(`${selectedIds.size} challan(s) cancelled`);
                                    setSelectedIds(new Set());
                                    fetchChallans();
                                }}
                            >
                                <Trash2 className="mr-1 size-3" />
                                Cancel
                            </Button>
                        </div>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                        >
                            Clear
                        </button>
                    </div>
                )}

                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                                    <th className="w-10 px-4 py-3 text-center">
                                        <button
                                            onClick={() => {
                                                if (selectedIds.size === challans.length) {
                                                    setSelectedIds(new Set());
                                                } else {
                                                    setSelectedIds(new Set(challans.map((c) => c.id)));
                                                }
                                            }}
                                            className="inline-flex items-center justify-center"
                                        >
                                            {selectedIds.size === challans.length && challans.length > 0 ? (
                                                <CheckSquare className="size-4 text-primary" />
                                            ) : (
                                                <Square className="size-4 text-muted-foreground" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Number</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">PO</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Party</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Qty</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {challans.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Package className="size-8 opacity-40" />
                                                <p className="text-sm font-medium">No challans found</p>
                                                <p className="text-xs">Create a new challan to get started.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    challans.map((c) => (
                                        <tr key={c.id} className="border-b border-sidebar-border/70 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border">
                                            <td className="w-10 px-4 py-3 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedIds((prev) => {
                                                            const next = new Set(prev);
                                                            if (next.has(c.id)) {
                                                                next.delete(c.id);
                                                            } else {
                                                                next.add(c.id);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    className="inline-flex items-center justify-center"
                                                >
                                                    {selectedIds.has(c.id) ? (
                                                        <CheckSquare className="size-4 text-primary" />
                                                    ) : (
                                                        <Square className="size-4 text-muted-foreground" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs font-semibold">{c.challan_number}</span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{c.po_number || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{c.party_name || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(c.date)}</td>
                                            <td className="px-4 py-3 text-right text-xs font-medium tabular-nums">{c.total_qty}</td>
                                            <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">৳{fmt$(c.total_amount || 0)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColors[c.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                                                                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <circle cx="12" cy="5" r="1.5" />
                                                                    <circle cx="12" cy="12" r="1.5" />
                                                                    <circle cx="12" cy="19" r="1.5" />
                                                                </svg>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            <DropdownMenuItem onClick={() => openView(c.id)}>
                                                                <Eye className="size-3.5" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => printChallan(c.id)}>
                                                                <Printer className="size-3.5" />
                                                                Print Challan
                                                            </DropdownMenuItem>
                                                            {c.status === 'pending' && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => dispatchChallan(c.id)}>
                                                                        <Send className="size-3.5" />
                                                                        Dispatch
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => openEdit(c)}>
                                                                        <Pencil className="size-3.5" />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem variant="destructive" onClick={() => cancelChallan(c.id)}>
                                                                        <Trash2 className="size-3.5" />
                                                                        Cancel
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            {c.status === 'dispatched' && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => deliverChallan(c.id)}>
                                                                        <Send className="size-3.5" />
                                                                        Mark Delivered
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => returnToPending(c.id)}>
                                                                        <Undo2 className="size-3.5" />
                                                                        Return to Pending
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem variant="destructive" onClick={() => cancelChallan(c.id)}>
                                                                        <Trash2 className="size-3.5" />
                                                                        Cancel
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            {c.status === 'delivered' && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => returnToDispatched(c.id)}>
                                                                        <Undo2 className="size-3.5" />
                                                                        Return to Dispatched
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem variant="destructive" onClick={() => cancelChallan(c.id)}>
                                                                        <Trash2 className="size-3.5" />
                                                                        Cancel
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem variant="destructive" onClick={() => { setDeleting(c); setDeleteOpen(true); }}>
                                                                <Trash2 className="size-3.5" />
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

                <div className="flex items-center justify-between gap-2 border-t border-sidebar-border/70 pt-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                            {from}–{to} of {total}
                        </span>
                        <select
                            value={limit}
                            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                            className="flex h-7 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                        >
                            {[10, 20, 50, 100].map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                        <span className="text-xs text-muted-foreground">per page</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                            <ChevronLeft className="mr-1 size-3.5" /> Previous
                        </Button>
                        <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                            Next <ChevronRight className="ml-1 size-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
                <DialogContent className="sm:max-w-2xl">
                    <ChallanForm
                        title="New Challan"
                        submitLabel="Create Challan"
                        onSubmit={handleCreate}
                        onCancel={() => { setCreateOpen(false); resetForm(); }}
                        {...formProps}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { resetForm(); setEditing(null); } }}>
                <DialogContent className="sm:max-w-2xl">
                    <ChallanForm
                        title="Edit Challan"
                        submitLabel="Save Changes"
                        onSubmit={handleUpdate}
                        onCancel={() => { setEditOpen(false); resetForm(); setEditing(null); }}
                        {...formProps}
                    />
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <FileText className="size-4.5 text-muted-foreground" />
                            {viewing?.challan_number || 'Challan Details'}
                        </DialogTitle>
                    </DialogHeader>
                    {viewing && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">PO</span>
                                    <span className="font-medium">{viewing.po_number || '—'}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Party</span>
                                    <span>{viewing.party_name || '—'}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</span>
                                    <span>{fmtDate(viewing.date)}</span>
                                </div>
                                <div>
                                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColors[viewing.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {viewing.status}
                                    </span>
                                </div>
                            </div>

                            {viewing.address && (
                                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Delivery Address</span>
                                    <p className="text-foreground/90">{viewing.address}</p>
                                </div>
                            )}

                            <div className="overflow-hidden rounded-lg border border-border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/50">
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Item</th>
                                            <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Qty</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unit Price</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewing.items.filter((it) => it.quantity > 0).map((it, i) => {
                                            const line = it.quantity * (it.unit_price || 0);
                                            return (
                                                <tr key={i} className="border-t border-border first:border-t-0">
                                                    <td className="px-3 py-2 text-xs">{it.product_name} ({it.meal_type})</td>
                                                    <td className="px-3 py-2 text-center text-xs tabular-nums">{it.quantity}</td>
                                                    <td className="px-3 py-2 text-right text-xs tabular-nums">৳{fmt$(it.unit_price || 0)}</td>
                                                    <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">৳{fmt$(line)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="flex items-center justify-end border-t border-border bg-muted/40 px-3 py-2.5">
                                    <span className="text-sm font-bold tabular-nums">Total: ৳{fmt$(viewing.total_amount || 0)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-red-50">
                            <AlertTriangle className="size-5 text-red-600" />
                        </div>
                        <DialogTitle>Delete Challan</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong className="text-foreground">{deleting?.challan_number}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" disabled={processing} onClick={handleDelete}>
                            {processing ? 'Deleting…' : 'Delete Challan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
