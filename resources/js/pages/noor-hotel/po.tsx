import { Head } from '@inertiajs/react';
import {
    Pencil,
    Plus,
    Trash2,
    Eye,
    X,
    Building2,
    FileText,
    Package,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ClipboardList,
    Printer,
    Mail,
    FileDown,
    Search,
    Paperclip,
    Truck,
    Calendar,
    CalendarClock,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type Party = { id: number; party_name: string };

type ProductMeal = {
    id: number;
    meal_type: string;
    quantity: number;
    unit_price: number;
    delivered_quantity: number;
    description: string;
};

type Product = {
    id: number;
    code: string;
    name: string;
    unit: string;
    vat_rate: number;
    unit_price: number;
    party_id: number;
    party_name: string;
    customer_po_number: string;
    description: string;
    attachment_path?: string | null;
    attachment_url?: string | null;
    reminder_at?: string | null;
    reminder_notified_at?: string | null;
    meals: ProductMeal[];
    total_ordered: number;
    total_delivered: number;
    meals_subtotal?: number;
    challans_count?: number;
    invoiced_challans_count?: number;
};

type MealRow = {
    meal_type: string;
    quantity: number;
    unit_price: number;
    description: string;
};

type ChallanFormItem = {
    product_meal_id: number;
    meal_type: string;
    unit_price: number;
    quantity: number;
    max: number;
    description?: string;
};

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
    evening_snacks: 'bg-violet-100 text-violet-700',
    hot_meal: 'bg-red-100 text-red-700',
};

const formatMealType = (type: string) =>
    mealLabels[type] ||
    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const fmtMoney = (n: number | string) => Number(n || 0).toFixed(2);

const pad2 = (n: number) => String(n).padStart(2, '0');

const toDatetimeLocal = (value?: string | null): string => {
    if (!value) {
        return '';
    }

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
        return '';
    }

    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const formatDateTime = (value?: string | null): string => {
    if (!value) {
        return '';
    }

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
        return '';
    }

    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const googleCalendarUrl = (product: Product): string => {
    if (!product.reminder_at) {
        return '';
    }

    const start = new Date(product.reminder_at);

    if (Number.isNaN(start.getTime())) {
        return '';
    }

    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) =>
        `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}00Z`;

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `PO ${product.code} - ${product.name}`,
        dates: `${fmt(start)}/${fmt(end)}`,
        details: `Reminder for purchase order ${product.code} (${product.name}).`,
        location: product.party_name || '',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const reminderStatus = (
    product: Product,
    now: number,
): { label: string; className: string } => {
    if (product.reminder_notified_at) {
        return {
            label: 'Notified',
            className: 'border-slate-200 bg-slate-50 text-slate-600',
        };
    }

    const due = new Date(product.reminder_at as string).getTime() <= now;

    return due
        ? {
              label: 'Overdue',
              className: 'border-red-200 bg-red-50 text-red-700',
          }
        : {
              label: formatDateTime(product.reminder_at),
              className: 'border-blue-200 bg-blue-50 text-blue-700',
          };
};

const statusFilters = [
    { v: 'all', l: 'All' },
    { v: 'pending', l: 'Waiting for Challan' },
    { v: 'waiting', l: 'Waiting for Invoice' },
    { v: 'delivered', l: 'Delivered' },
];

function PartyInitials({ nameStr }: { nameStr?: string }) {
    if (!nameStr) {
        return <>—</>;
    }

    const parts = nameStr.trim().split(/\s+/);

    return (
        <>
            {parts
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join('')}
        </>
    );
}

function MealFormFieldsInner({
    meals,
    vatRate,
    addMealRow,
    removeMealRow,
    updateMeal,
}: {
    meals: MealRow[];
    vatRate: string;
    addMealRow: () => void;
    removeMealRow: (idx: number) => void;
    updateMeal: (
        idx: number,
        field: keyof MealRow,
        value: string | number,
    ) => void;
}) {
    const subtotal = meals.reduce(
        (sum, m) => sum + m.quantity * m.unit_price,
        0,
    );
    const vat =
        Math.round(((subtotal * parseFloat(vatRate || '0')) / 100) * 100) / 100;
    const total = subtotal + vat;

    return (
        <div className="grid gap-2.5">
            <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <Package className="size-3.5" />
                    Order Items
                </Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMealRow}
                    className="h-7 gap-1 text-xs"
                >
                    <Plus className="size-3.5" />
                    Add Item
                </Button>
            </div>
            <div className="space-y-2 rounded-lg border border-border">
                {meals.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                        No order items yet. Click &quot;Add Item&quot; to add
                        one.
                    </p>
                ) : (
                    meals.map((m, idx) => (
                        <div
                            key={idx}
                            className={`space-y-2 p-3 ${idx !== 0 ? 'border-t border-border' : ''}`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground tabular-nums">
                                    {idx + 1}
                                </span>
                                <div className="w-32 shrink-0">
                                    <Select
                                        value={m.meal_type}
                                        onValueChange={(v) =>
                                            updateMeal(idx, 'meal_type', v)
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Select meal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="breakfast">
                                                Breakfast
                                            </SelectItem>
                                            <SelectItem value="lunch">
                                                Lunch
                                            </SelectItem>
                                            <SelectItem value="dinner">
                                                Dinner
                                            </SelectItem>
                                            <SelectItem value="snacks">
                                                Snacks
                                            </SelectItem>
                                            <SelectItem value="morning_snacks">
                                                Morning Snacks
                                            </SelectItem>
                                            <SelectItem value="evening_snacks">
                                                Evening Snacks
                                            </SelectItem>
                                            <SelectItem value="hot_meal">
                                                Hot Meal
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    placeholder="Qty"
                                    value={m.quantity || ''}
                                    onChange={(e) =>
                                        updateMeal(
                                            idx,
                                            'quantity',
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                    onWheel={(e) =>
                                        (e.target as HTMLInputElement).blur()
                                    }
                                />
                                <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    placeholder="Unit Price"
                                    step="0.01"
                                    value={m.unit_price || ''}
                                    onChange={(e) =>
                                        updateMeal(
                                            idx,
                                            'unit_price',
                                            parseFloat(e.target.value) || 0,
                                        )
                                    }
                                    onWheel={(e) =>
                                        (e.target as HTMLInputElement).blur()
                                    }
                                />
                                <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums">
                                    Tk {(m.quantity * m.unit_price).toFixed(2)}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeMealRow(idx)}
                                >
                                    <X className="size-3.5" />
                                </Button>
                            </div>
                            <textarea
                                className="ml-8 flex w-[calc(100%-2rem)] rounded-md border border-input bg-transparent px-2 py-1.5 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                rows={2}
                                placeholder="Description (optional)"
                                value={m.description}
                                onChange={(e) =>
                                    updateMeal(
                                        idx,
                                        'description',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                    ))
                )}
            </div>
            <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">
                        Tk {subtotal.toFixed(2)}
                    </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>VAT ({vatRate || 0}%)</span>
                    <span className="tabular-nums">Tk {vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 text-sm font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">Tk {total.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}

function ProductForm({
    title,
    submitLabel,
    onSubmit,
    processing,
    errors,
    name,
    setName,
    unit,
    setUnit,
    vatRate,
    setVatRate,
    partyId,
    setPartyId,
    partySearch,
    setPartySearch,
    partyDropdownOpen,
    setPartyDropdownOpen,
    filteredParties,
    customerPoNumber,
    setCustomerPoNumber,
    description,
    setDescription,
    reminderAt,
    setReminderAt,
    meals,
    setMeals,
    parties,
    onCancel,
    attachment,
    setAttachment,
    existingAttachmentUrl,
    attachmentInputRef,
    removeExistingAttachment,
}: {
    title: string;
    submitLabel: string;
    onSubmit: () => void;
    processing: boolean;
    errors: Record<string, string>;
    name: string;
    setName: (v: string) => void;
    unit: string;
    setUnit: (v: string) => void;
    vatRate: string;
    setVatRate: (v: string) => void;
    partyId: string;
    setPartyId: (v: string) => void;
    partySearch: string;
    setPartySearch: (v: string) => void;
    partyDropdownOpen: boolean;
    setPartyDropdownOpen: (v: boolean) => void;
    filteredParties: Party[];
    customerPoNumber: string;
    setCustomerPoNumber: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    reminderAt: string;
    setReminderAt: (v: string) => void;
    meals: MealRow[];
    setMeals: (v: MealRow[]) => void;
    parties: Party[];
    onCancel: () => void;
    attachment: File | null;
    setAttachment: (v: File | null) => void;
    existingAttachmentUrl: string | null;
    attachmentInputRef: RefObject<HTMLInputElement | null>;
    removeExistingAttachment: () => void;
}) {
    const mealsRef = useRef(meals);
    mealsRef.current = meals;

    const addMealRow = useCallback(() => {
        setMeals([
            ...mealsRef.current,
            { meal_type: '', quantity: 0, unit_price: 0, description: '' },
        ]);
    }, [setMeals]);

    const removeMealRow = useCallback(
        (idx: number) => {
            const next = mealsRef.current.filter((_, i) => i !== idx);
            setMeals(next);
        },
        [setMeals],
    );

    const updateMeal = useCallback(
        (idx: number, field: keyof MealRow, value: string | number) => {
            setMeals(
                mealsRef.current.map((m, i) =>
                    i === idx ? { ...m, [field]: value } : m,
                ),
            );
        },
        [setMeals],
    );

    return (
        <>
            <DialogHeader className="space-y-1 border-b border-border pb-4">
                <DialogTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="size-4.5 text-muted-foreground" />
                    {title}
                </DialogTitle>
                <DialogDescription className="text-xs">
                    Fields marked with * are required.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Name *
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Party *
                        </Label>
                        <div className="relative">
                            <Input
                                placeholder="Search party..."
                                value={partySearch}
                                onChange={(e) => {
                                    setPartySearch(e.target.value);
                                    setPartyDropdownOpen(true);
                                }}
                                onFocus={() => setPartyDropdownOpen(true)}
                            />
                            {partyDropdownOpen && (
                                <>
                                    <div className="absolute z-50 mt-1 max-h-48 min-w-80 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                                        {filteredParties.length === 0 ? (
                                            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                                                No parties found
                                            </div>
                                        ) : (
                                            filteredParties.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className={`w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent ${partyId === String(p.id) ? 'bg-accent font-medium' : ''}`}
                                                    onClick={() => {
                                                        setPartyId(
                                                            String(p.id),
                                                        );
                                                        setPartySearch(
                                                            p.party_name,
                                                        );
                                                        setPartyDropdownOpen(
                                                            false,
                                                        );
                                                    }}
                                                >
                                                    {p.party_name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() =>
                                            setPartyDropdownOpen(false)
                                        }
                                    />
                                </>
                            )}
                        </div>
                        <input type="hidden" name="party_id" value={partyId} />
                        <InputError message={errors.party_id} />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Unit *
                        </Label>
                        <Select value={unit} onValueChange={setUnit}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[
                                    'pcs',
                                    'kg',
                                    'g',
                                    'liter',
                                    'ml',
                                    'box',
                                    'pack',
                                    'dozen',
                                    'pair',
                                    'set',
                                    'roll',
                                    'meter',
                                ].map((u) => (
                                    <SelectItem key={u} value={u}>
                                        {u}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.unit} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                            VAT Rate %
                        </Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={vatRate}
                            onChange={(e) => setVatRate(e.target.value)}
                            onWheel={(e) =>
                                (e.target as HTMLInputElement).blur()
                            }
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Customer PO No.
                        </Label>
                        <Input
                            value={customerPoNumber}
                            onChange={(e) =>
                                setCustomerPoNumber(e.target.value)
                            }
                            placeholder="Optional"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Reminder
                        </Label>
                        <Input
                            type="datetime-local"
                            value={reminderAt}
                            onChange={(e) => setReminderAt(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Admins are notified when this time is reached.
                        </p>
                        <InputError message={errors.reminder_at} />
                    </div>
                </div>
                <MealFormFieldsInner
                    meals={meals}
                    vatRate={vatRate}
                    addMealRow={addMealRow}
                    removeMealRow={removeMealRow}
                    updateMeal={updateMeal}
                />
                <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        Description
                    </Label>
                    <textarea
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        rows={2}
                        placeholder="Optional notes about this order"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        Attachment
                    </Label>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            ref={attachmentInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                            onChange={(e) =>
                                setAttachment(e.target.files?.[0] || null)
                            }
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => attachmentInputRef.current?.click()}
                        >
                            <Paperclip className="mr-1.5 size-3" />
                            {attachment ? attachment.name : 'Choose File'}
                        </Button>
                        {attachment && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 text-xs text-red-500 hover:text-red-600"
                                onClick={() => {
                                    setAttachment(null);

                                    if (attachmentInputRef.current) {
                                        attachmentInputRef.current.value = '';
                                    }
                                }}
                            >
                                Remove
                            </Button>
                        )}
                        {!attachment && existingAttachmentUrl && (
                            <>
                                <a
                                    href={existingAttachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
                                >
                                    <Paperclip className="size-3" />
                                    Current file
                                </a>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 text-xs text-red-500 hover:text-red-600"
                                    onClick={removeExistingAttachment}
                                >
                                    Remove
                                </Button>
                            </>
                        )}
                    </div>
                    <InputError message={errors.attachment} />
                    <p className="text-[10px] text-muted-foreground">
                        {existingAttachmentUrl
                            ? 'Choose a new file to replace the current one.'
                            : 'PDF, JPG, PNG, DOC up to 10MB'}
                    </p>
                </div>
            </div>
            <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    disabled={processing}
                    onClick={onSubmit}
                    className="min-w-28"
                >
                    {processing ? 'Saving…' : submitLabel}
                </Button>
            </DialogFooter>
        </>
    );
}

export default function PurchaseOrders({ parties }: { parties: Party[] }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [partyFilter, setPartyFilter] = useState('');
    const [partyFilterOpen, setPartyFilterOpen] = useState(false);
    const [partyFilterSearch, setPartyFilterSearch] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [challanOpen, setChallanOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(
        null,
    );
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [now] = useState(() => Date.now());

    const [challanProduct, setChallanProduct] = useState<Product | null>(null);
    const [challanDate, setChallanDate] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [challanAddress, setChallanAddress] = useState('');
    const [challanNotes, setChallanNotes] = useState('');
    const [challanItems, setChallanItems] = useState<ChallanFormItem[]>([]);
    const [challanProcessing, setChallanProcessing] = useState(false);
    const [challanErrors, setChallanErrors] = useState<Record<string, string>>(
        {},
    );

    const [name, setName] = useState('');
    const [unit, setUnit] = useState('pcs');
    const [vatRate, setVatRate] = useState('');
    const [partyId, setPartyId] = useState('');
    const [partySearch, setPartySearch] = useState('');
    const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
    const [customerPoNumber, setCustomerPoNumber] = useState('');
    const [description, setDescription] = useState('');
    const [reminderAt, setReminderAt] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<
        null | string
    >(null);
    const [attachmentRemoved, setAttachmentRemoved] = useState(false);
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const [meals, setMeals] = useState<MealRow[]>([]);

    const filteredParties = parties.filter((p) =>
        p.party_name.toLowerCase().includes(partySearch.toLowerCase()),
    );

    const filteredFilterParties = parties.filter((p) =>
        p.party_name.toLowerCase().includes(partyFilterSearch.toLowerCase()),
    );

    const fetchProducts = useCallback(async () => {
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

            if (search.trim()) {
                params.set('search', search.trim());
            }

            const res = await fetch(`/api/products?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setProducts(data.items || []);
            setTotal(data.total || 0);
        } catch {
            toast.error('Failed to load purchase orders');
        }
    }, [page, limit, filter, partyFilter, search]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const resetForm = () => {
        setName('');
        setUnit('pcs');
        setVatRate('');
        setPartyId('');
        setPartySearch('');
        setCustomerPoNumber('');
        setDescription('');
        setReminderAt('');
        setAttachment(null);
        setExistingAttachmentUrl(null);
        setAttachmentRemoved(false);

        if (attachmentInputRef.current) {
            attachmentInputRef.current.value = '';
        }

        setMeals([]);
        setErrors({});
    };

    const openCreate = () => {
        resetForm();
        setCreateOpen(true);
    };

    const openEdit = async (product: Product) => {
        try {
            const res = await fetch(`/api/products/${product.id}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const p = await res.json();
            setEditingProduct(p);
            setName(p.name);
            setUnit(p.unit);
            setVatRate(String(p.vat_rate));
            setPartyId(p.party_id ? String(p.party_id) : '');
            setPartySearch(p.party?.party_name || '');
            setCustomerPoNumber(p.customer_po_number || '');
            setDescription(p.description || '');
            setReminderAt(toDatetimeLocal(p.reminder_at));
            setAttachment(null);
            setExistingAttachmentUrl(p.attachment_url || null);
            setAttachmentRemoved(false);

            if (attachmentInputRef.current) {
                attachmentInputRef.current.value = '';
            }

            setMeals(
                p.meals?.length
                    ? p.meals.map((m: ProductMeal) => ({
                          meal_type: m.meal_type,
                          quantity: m.quantity,
                          unit_price: m.unit_price,
                          description: m.description || '',
                      }))
                    : [],
            );
            setErrors({});
            setEditOpen(true);
        } catch {
            toast.error('Failed to load product');
        }
    };

    const openView = async (product: Product) => {
        try {
            const res = await fetch(`/api/products/${product.id}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const p = await res.json();
            setViewingProduct(p);
            setViewOpen(true);
        } catch {
            toast.error('Failed to load product');
        }
    };

    const openDelete = (product: Product) => {
        setDeletingProduct(product);
        setDeleteOpen(true);
    };

    const printPo = async (product: Product) => {
        try {
            const res = await fetch(`/api/products/${product.id}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            const p = data.data || data.product || data;

            if (!p) {
                toast.error('Failed to load product');

                return;
            }

            const meals = p.meals || [];
            const subtotal = meals.reduce(
                (s: number, m: ProductMeal) => s + m.quantity * m.unit_price,
                0,
            );
            const vatRate = p.vat_rate || 0;
            const vat = (subtotal * vatRate) / 100;
            const total = subtotal + vat;

            const itemRows = meals
                .map((m: ProductMeal, i: number) => {
                    const lineTotal = m.quantity * m.unit_price;
                    const remaining = Math.max(
                        0,
                        m.quantity - (m.delivered_quantity || 0),
                    );

                    return `<tr>
                        <td style="padding:8px 12px;border:1px solid #e2e8f0;">${i + 1}</td>
                        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-transform:capitalize;">${m.meal_type}</td>
                        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">${m.quantity}</td>
                        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;">Tk ${Number(m.unit_price).toFixed(2)}</td>
                        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;">Tk ${lineTotal.toFixed(2)}</td>
                        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">${m.delivered_quantity || 0}</td>
                        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">${remaining}</td>
                        <td style="padding:8px 12px;border:1px solid #e2e8f0;">${m.description || '-'}</td>
                    </tr>`;
                })
                .join('');

            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>Purchase Order ${p.code}</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; margin: 0; padding: 0; }
        h1 { font-size: 26px; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 2px; text-align: center; }
        .underline { border-bottom: 3px solid #2563eb; width: 200px; margin: 6px auto 0; }
        .sub { color: #64748b; margin: 4px 0 0; font-size: 12px; text-align: center; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        table.info td { border: none; padding: 4px 0; vertical-align: top; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.items th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        table.items td { padding: 8px 12px; border: 1px solid #e2e8f0; }
        .totals { text-align: right; font-size: 14px; margin-top: 12px; }
        .totals div { margin-bottom: 4px; }
        .totals .grand { font-size: 16px; border-top: 2px solid #e2e8f0; padding-top: 6px; margin-top: 6px; }
    </style>
</head>
<body>
    <div style="text-align:center;margin-bottom:20px;">
        <h1>PURCHASE ORDER</h1>
        <div class="underline"></div>
        <p class="sub">Noor Hotel PRG</p>
    </div>
    <table class="info">
        <tr>
            <td style="width:60%;">
                <strong>Party:</strong> ${p.party_name || '-'}<br/>
                <strong>PO Code:</strong> ${p.code}<br/>
                <strong>Customer PO:</strong> ${p.customer_po_number || 'N/A'}
            </td>
            <td style="width:40%;text-align:right;">
                <strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}<br/>
                <strong>Unit:</strong> ${p.unit}<br/>
                <strong>VAT Rate:</strong> ${vatRate}%
            </td>
        </tr>
    </table>
    ${p.description ? `<div style="margin-bottom:16px;"><span style="color:#64748b;font-weight:600;">Description:</span><p style="margin:4px 0">${p.description}</p></div>` : ''}
    <table class="items">
        <thead>
            <tr>
                <th style="width:40px;">#</th>
                <th>Meal Type</th>
                <th style="width:80px;text-align:center;">Ordered</th>
                <th style="width:100px;text-align:right;">Unit Price</th>
                <th style="width:100px;text-align:right;">Amount</th>
                <th style="width:80px;text-align:center;">Delivered</th>
                <th style="width:80px;text-align:center;">Remaining</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
        <div>Subtotal: <strong>Tk ${subtotal.toFixed(2)}</strong></div>
        <div>VAT (${vatRate}%): <strong>Tk ${vat.toFixed(2)}</strong></div>
        <div class="grand">Total (inc. VAT): <strong>Tk ${total.toFixed(2)}</strong></div>
    </div>
    <div style="position:fixed;bottom:15mm;left:15mm;right:15mm;">
        <table style="width:100%;border:none;">
            <tr>
                <td style="width:45%;border:none;text-align:center;padding:0;">
                    <div style="height:40px;"></div>
                    <div style="border-top:1px solid #1e293b;"></div>
                    <div style="padding-top:6px;font-weight:bold;font-size:12px;">Prepared By</div>
                </td>
                <td style="width:10%;border:none;"></td>
                <td style="width:45%;border:none;text-align:center;padding:0;">
                    <div style="height:40px;"></div>
                    <div style="border-top:1px solid #1e293b;"></div>
                    <div style="padding-top:6px;font-weight:bold;font-size:12px;">Approved By</div>
                </td>
            </tr>
        </table>
        <div style="text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding:8px 0;">
            Generated on ${new Date().toLocaleDateString('en-GB')} &mdash; Noor Hotel PRG
        </div>
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
            toast.error('Failed to load product');
        }
    };

    const emailPo = (product: Product) => {
        const subject = encodeURIComponent(
            `Purchase Order - ${product.code} (${product.name})`,
        );
        const body = encodeURIComponent(
            `Please find attached Purchase Order ${product.code} for ${product.name}.\n\nParty: ${product.party_name || 'N/A'}\nCustomer PO: ${product.customer_po_number || 'N/A'}\n\nThank you.`,
        );
        window.open(`mailto:?subject=${subject}&body=${body}`);
    };

    const buildFormData = () => {
        const fd = new FormData();
        fd.append('name', name);
        fd.append('unit', unit);
        fd.append('vat_rate', String(parseFloat(vatRate || '0')));

        if (partyId) {
            fd.append('party_id', partyId);
        }

        if (customerPoNumber) {
            fd.append('customer_po_number', customerPoNumber);
        }

        if (description) {
            fd.append('description', description);
        }

        if (reminderAt) {
            fd.append('reminder_at', new Date(reminderAt).toISOString());
        }

        if (attachment) {
            fd.append('attachment', attachment);
        } else if (attachmentRemoved) {
            fd.append('attachment_remove', '1');
        }

        const validMeals = meals.filter(
            (m) => m.quantity > 0 || m.unit_price > 0 || m.description,
        );
        validMeals.forEach((m, i) => {
            fd.append(`meals[${i}][meal_type]`, m.meal_type);
            fd.append(`meals[${i}][quantity]`, String(m.quantity));
            fd.append(`meals[${i}][unit_price]`, String(m.unit_price));

            if (m.description) {
                fd.append(`meals[${i}][description]`, m.description);
            }
        });

        return fd;
    };

    const handleCreate = async () => {
        setProcessing(true);
        setErrors({});

        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: buildFormData(),
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                setCreateOpen(false);
                resetForm();

                if (page === 1) {
                    setProducts((prev) => [data.product, ...prev].slice(0, 10));
                }

                setTotal((prev) => prev + 1);
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
        if (!editingProduct) {
            return;
        }

        setProcessing(true);
        setErrors({});

        try {
            const res = await fetch(`/api/products/${editingProduct.id}`, {
                method: 'PUT',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: buildFormData(),
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                setEditOpen(false);
                resetForm();
                setProducts((prev) =>
                    prev.map((p) =>
                        p.id === editingProduct.id
                            ? { ...p, ...data.product }
                            : p,
                    ),
                );
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
        if (!deletingProduct) {
            return;
        }

        setProcessing(true);

        try {
            const res = await fetch(`/api/products/${deletingProduct.id}`, {
                method: 'DELETE',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                setDeleteOpen(false);
                setDeletingProduct(null);
                setProducts((prev) =>
                    prev.filter((p) => p.id !== deletingProduct.id),
                );
                setTotal((prev) => {
                    const next = Math.max(0, prev - 1);

                    return next;
                });

                if (products.length === 1 && page > 1) {
                    setPage((p) => p - 1);
                }
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        } finally {
            setProcessing(false);
        }
    };

    const openCreateChallan = (product: Product) => {
        const rows: ChallanFormItem[] = (product.meals || [])
            .map((m) => {
                const remaining = Math.max(
                    0,
                    m.quantity - (m.delivered_quantity || 0),
                );

                if (remaining <= 0) {
                    return null;
                }

                return {
                    product_meal_id: m.id,
                    meal_type: m.meal_type,
                    unit_price: m.unit_price,
                    quantity: remaining,
                    max: remaining,
                    description: m.description,
                };
            })
            .filter(Boolean) as ChallanFormItem[];

        setChallanProduct(product);
        setChallanDate(new Date().toISOString().slice(0, 10));
        setChallanAddress('');
        setChallanNotes('');
        setChallanItems(rows);
        setChallanErrors({});
        setChallanOpen(true);
    };

    const updateChallanItemQty = (idx: number, qty: number) => {
        setChallanItems((prev) =>
            prev.map((it, i) =>
                i === idx ? { ...it, quantity: Math.min(qty, it.max) } : it,
            ),
        );
    };

    const challanGrandTotal = challanItems.reduce(
        (s, it) =>
            s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
        0,
    );

    const createChallan = async () => {
        if (!challanProduct) {
            return;
        }

        if (!challanAddress.trim()) {
            toast.error('Delivery address is required');

            return;
        }

        if (challanItems.length === 0) {
            toast.error('This PO has no remaining items to dispatch');

            return;
        }

        setChallanProcessing(true);
        setChallanErrors({});

        try {
            const res = await fetch('/api/challans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    product_id: challanProduct.id,
                    date: challanDate,
                    address: challanAddress,
                    notes: challanNotes,
                    items: challanItems.map((it) => ({
                        product_meal_id: it.product_meal_id,
                        quantity: it.quantity,
                    })),
                }),
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || 'Challan created');
                setChallanOpen(false);
                fetchProducts();
            } else if (res.status === 422) {
                setChallanErrors(data.errors || {});
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        } finally {
            setChallanProcessing(false);
        }
    };

    const getDeliveryStatus = (p: Product) => {
        const ordered = p.total_ordered || 0;

        if (ordered === 0) {
            return {
                label: 'No Items',
                dot: 'bg-slate-400',
                color: 'bg-slate-50 text-slate-600 border-slate-200',
            };
        }

        if ((p.invoiced_challans_count || 0) > 0) {
            return {
                label: 'Delivered',
                dot: 'bg-emerald-500',
                color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            };
        }

        if ((p.challans_count || 0) > 0) {
            return {
                label: 'Waiting for Invoice',
                dot: 'bg-amber-500',
                color: 'bg-amber-50 text-amber-700 border-amber-200',
            };
        }

        return {
            label: 'Waiting for Challan',
            dot: 'bg-blue-500',
            color: 'bg-blue-50 text-blue-700 border-blue-200',
        };
    };

    const formProps = {
        processing,
        errors,
        name,
        setName,
        unit,
        setUnit,
        vatRate,
        setVatRate,
        partyId,
        setPartyId,
        partySearch,
        setPartySearch,
        partyDropdownOpen,
        setPartyDropdownOpen,
        filteredParties,
        customerPoNumber,
        setCustomerPoNumber,
        description,
        setDescription,
        reminderAt,
        setReminderAt,
        meals,
        setMeals,
        parties,
        attachment,
        setAttachment,
        existingAttachmentUrl,
        attachmentInputRef,
        removeExistingAttachment: () => {
            setAttachmentRemoved(true);
            setExistingAttachmentUrl(null);
        },
    };

    const totalPages = Math.ceil(total / limit);
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    const exportToExcel = () => {
        const data = products.map((p) => {
            const meals = p.meals || [];

            return {
                Code: p.code,
                Name: p.name,
                Party: p.party_name || '',
                'Customer PO': p.customer_po_number || '',
                Unit: p.unit,
                'VAT Rate': `${p.vat_rate}%`,
                Ordered: meals.reduce((s, m) => s + m.quantity, 0),
                Delivered: meals.reduce(
                    (s, m) => s + (m.delivered_quantity || 0),
                    0,
                ),
                Status: getDeliveryStatus(p).label,
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'PurchaseOrders');
        XLSX.writeFile(wb, 'purchase_orders.xlsx');
    };

    return (
        <>
            <Head title="Purchase Orders" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <ClipboardList className="size-5 text-foreground/80" />
                        </div>
                        <Heading
                            variant="small"
                            title="Purchase Orders"
                            description="Manage supplier orders and delivery status"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={exportToExcel}>
                            <FileDown className="mr-1.5 size-4" />
                            Export Excel
                        </Button>
                        <Button onClick={openCreate}>
                            <Plus className="mr-1.5 size-4" />
                            New Purchase Order
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
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
                        <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by PO, name or customer PO..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="h-8 w-56 pl-8 text-xs"
                        />
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setPartyFilterOpen((v) => !v)}
                            className="flex h-8 w-56 items-center justify-between gap-2 overflow-hidden rounded-md border border-input bg-transparent px-2 text-xs shadow-xs transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                            <span className="truncate">
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
                                <div className="absolute z-50 mt-1 w-full min-w-80 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md">
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
                                            className={`w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-sm px-3 py-2 text-left text-xs transition-colors hover:bg-accent ${partyFilter === '' ? 'bg-accent font-medium' : ''}`}
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
                                            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                                                No parties found
                                            </div>
                                        ) : (
                                            filteredFilterParties.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className={`w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-sm px-3 py-2 text-left text-xs transition-colors hover:bg-accent ${partyFilter === String(p.id) ? 'bg-accent font-medium' : ''}`}
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
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                            setFilter('all');
                            setSearch('');
                            setPartyFilter('');
                            setPage(1);
                        }}
                    >
                        Clear
                    </Button>
                    <span className="ml-auto text-xs font-medium text-muted-foreground">
                        {total} order{total === 1 ? '' : 's'} total
                    </span>
                </div>

                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Code
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Customer PO
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Party
                                    </th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Ordered
                                    </th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Delivered
                                    </th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Remaining
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Reminder
                                    </th>
                                    <th className="px-4 py-3 text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={10}
                                            className="px-4 py-16 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Package className="size-8 opacity-40" />
                                                <p className="text-sm font-medium">
                                                    No purchase orders found
                                                </p>
                                                <p className="text-xs">
                                                    Try adjusting the filter or
                                                    create a new order.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((p) => {
                                        const ordered = p.total_ordered || 0;
                                        const delivered =
                                            p.total_delivered || 0;
                                        const remaining = Math.max(
                                            0,
                                            ordered - delivered,
                                        );
                                        const status = getDeliveryStatus(p);
                                        const pct =
                                            ordered > 0
                                                ? Math.round(
                                                      (delivered / ordered) *
                                                          100,
                                                  )
                                                : 0;

                                        return (
                                            <tr
                                                key={p.id}
                                                className="border-b border-sidebar-border/70 transition-colors last:border-0 hover:bg-muted/30 dark:border-sidebar-border"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                                                            {p.code}
                                                        </span>
                                                        {p.attachment_url && (
                                                            <a
                                                                href={
                                                                    p.attachment_url
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                title="Open attachment"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                                className="text-muted-foreground transition-colors hover:text-foreground"
                                                            >
                                                                <Paperclip className="size-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {p.name}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    {p.customer_po_number ||
                                                        '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                                                            <PartyInitials
                                                                nameStr={
                                                                    p.party_name
                                                                }
                                                            />
                                                        </span>
                                                        <span className="text-xs text-foreground/90">
                                                            {p.party_name ||
                                                                '—'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs tabular-nums">
                                                    {ordered}
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs font-medium text-emerald-600 tabular-nums">
                                                    {delivered}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 text-right text-xs tabular-nums ${remaining > 0 ? 'font-medium text-red-600' : 'text-muted-foreground'}`}
                                                >
                                                    {remaining}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span
                                                            className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.color}`}
                                                        >
                                                            <span
                                                                className={`size-1.5 rounded-full ${status.dot}`}
                                                            />
                                                            {status.label}
                                                        </span>
                                                        {ordered > 0 && (
                                                            <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
                                                                <div
                                                                    className={`h-1 rounded-full ${status.dot}`}
                                                                    style={{
                                                                        width: `${pct}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {p.reminder_at ? (
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${reminderStatus(p, now).className}`}
                                                        >
                                                            <CalendarClock className="size-3" />
                                                            {
                                                                reminderStatus(
                                                                    p,
                                                                    now,
                                                                ).label
                                                            }
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground/40">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-7 text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <svg
                                                                        className="size-4"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <circle
                                                                            cx="12"
                                                                            cy="5"
                                                                            r="1.5"
                                                                        />
                                                                        <circle
                                                                            cx="12"
                                                                            cy="12"
                                                                            r="1.5"
                                                                        />
                                                                        <circle
                                                                            cx="12"
                                                                            cy="19"
                                                                            r="1.5"
                                                                        />
                                                                    </svg>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                align="end"
                                                                className="w-36"
                                                            >
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        openView(
                                                                            p,
                                                                        )
                                                                    }
                                                                >
                                                                    <Eye className="size-3.5" />
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        openEdit(
                                                                            p,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="size-3.5" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        printPo(
                                                                            p,
                                                                        )
                                                                    }
                                                                >
                                                                    <Printer className="size-3.5" />
                                                                    Print PO
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        emailPo(
                                                                            p,
                                                                        )
                                                                    }
                                                                >
                                                                    <Mail className="size-3.5" />
                                                                    Email
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        openCreateChallan(
                                                                            p,
                                                                        )
                                                                    }
                                                                >
                                                                    <Truck className="size-3.5" />
                                                                    Create
                                                                    Challan
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        openDelete(
                                                                            p,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {total > 0 && (
                    <div className="flex items-center justify-between gap-2 border-t border-sidebar-border/70 pt-4 dark:border-sidebar-border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                                Showing {from}–{to} of {total}
                            </span>
                            <div className="flex items-center gap-1">
                                <span>per page:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="flex h-8 w-20 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
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

            {/* Create Dialog */}
            <Dialog
                open={createOpen}
                onOpenChange={(v) => {
                    setCreateOpen(v);

                    if (!v) {
                        resetForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <ProductForm
                        title="New Purchase Order"
                        submitLabel="Create Order"
                        onSubmit={handleCreate}
                        onCancel={() => {
                            setCreateOpen(false);
                            resetForm();
                        }}
                        {...formProps}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog
                open={editOpen}
                onOpenChange={(v) => {
                    setEditOpen(v);

                    if (!v) {
                        resetForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <ProductForm
                        title="Edit Purchase Order"
                        submitLabel="Save Changes"
                        onSubmit={handleUpdate}
                        onCancel={() => {
                            setEditOpen(false);
                            resetForm();
                        }}
                        {...formProps}
                    />
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <FileText className="size-4.5 text-muted-foreground" />
                            Purchase Order Details
                        </DialogTitle>
                    </DialogHeader>
                    {viewingProduct && (
                        <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
                            <div className="rounded-lg border border-border">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4 md:grid-cols-3">
                                    <div>
                                        <span className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            Code
                                        </span>
                                        <span className="font-mono text-sm">
                                            {viewingProduct.code}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            Name
                                        </span>
                                        <span className="text-sm font-medium">
                                            {viewingProduct.name}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            Customer PO
                                        </span>
                                        <span className="text-sm">
                                            {viewingProduct.customer_po_number ||
                                                '—'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            <Building2 className="size-3" />{' '}
                                            Party
                                        </span>
                                        <span className="text-sm">
                                            {viewingProduct.party_name || '—'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            Unit
                                        </span>
                                        <span className="text-sm">
                                            {viewingProduct.unit}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            VAT Rate
                                        </span>
                                        <span className="text-sm">
                                            {viewingProduct.vat_rate}%
                                        </span>
                                    </div>
                                </div>
                                {viewingProduct.description && (
                                    <div className="border-t border-border p-4">
                                        <span className="mb-1 block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            Description
                                        </span>
                                        <p className="text-sm text-foreground/90">
                                            {viewingProduct.description}
                                        </p>
                                    </div>
                                )}
                                {viewingProduct.attachment_url && (
                                    <div className="border-t border-border p-4">
                                        <span className="mb-1.5 block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            Attachment
                                        </span>
                                        <a
                                            href={viewingProduct.attachment_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:bg-accent"
                                        >
                                            <Paperclip className="size-3.5" />
                                            Open attachment
                                        </a>
                                    </div>
                                )}
                                {viewingProduct.reminder_at && (
                                    <div className="border-t border-border p-4">
                                        <span className="mb-1.5 block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            Reminder
                                        </span>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="inline-flex items-center gap-1.5 text-sm text-foreground/90">
                                                <CalendarClock className="size-3.5 text-muted-foreground" />
                                                {formatDateTime(
                                                    viewingProduct.reminder_at,
                                                )}
                                            </span>
                                            <a
                                                href={googleCalendarUrl(
                                                    viewingProduct,
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:bg-accent"
                                            >
                                                <Calendar className="size-3.5" />
                                                Add to Google Calendar
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {viewingProduct.meals?.length > 0 && (
                                <div className="overflow-hidden rounded-lg border border-border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/50">
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                                    Type
                                                </th>
                                                <th className="px-3 py-2 text-right text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                                    Ordered
                                                </th>
                                                <th className="px-3 py-2 text-right text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                                    Unit Price
                                                </th>
                                                <th className="px-3 py-2 text-right text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                                    Amount
                                                </th>
                                                <th className="px-3 py-2 text-right text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                                    Delivered
                                                </th>
                                                <th className="px-3 py-2 text-right text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                                    Remaining
                                                </th>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                                    Description
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewingProduct.meals.map(
                                                (m, i) => {
                                                    const line =
                                                        m.quantity *
                                                        m.unit_price;
                                                    const remaining = Math.max(
                                                        0,
                                                        m.quantity -
                                                            (m.delivered_quantity ||
                                                                0),
                                                    );

                                                    return (
                                                        <tr
                                                            key={i}
                                                            className="border-t border-border first:border-t-0"
                                                        >
                                                            <td className="px-3 py-2 text-xs capitalize">
                                                                {m.meal_type}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-xs tabular-nums">
                                                                {m.quantity}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-xs tabular-nums">
                                                                Tk{' '}
                                                                {m.unit_price}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">
                                                                Tk{' '}
                                                                {line.toFixed(
                                                                    2,
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-xs font-medium text-emerald-600 tabular-nums">
                                                                {m.delivered_quantity ||
                                                                    0}
                                                            </td>
                                                            <td
                                                                className={`px-3 py-2 text-right text-xs tabular-nums ${remaining > 0 ? 'font-medium text-red-600' : 'text-muted-foreground'}`}
                                                            >
                                                                {remaining}
                                                            </td>
                                                            <td className="max-w-[180px] px-3 py-2 text-xs break-words text-muted-foreground">
                                                                {m.description ||
                                                                    '—'}
                                                            </td>
                                                        </tr>
                                                    );
                                                },
                                            )}
                                        </tbody>
                                    </table>
                                    <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2.5">
                                        <span className="text-xs text-muted-foreground">
                                            {viewingProduct.meals.length} item
                                            {viewingProduct.meals.length === 1
                                                ? ''
                                                : 's'}{' '}
                                            ·{' '}
                                            {viewingProduct.meals.reduce(
                                                (s, m) => s + m.quantity,
                                                0,
                                            )}{' '}
                                            ordered ·{' '}
                                            {viewingProduct.meals.reduce(
                                                (s, m) =>
                                                    s +
                                                    (m.delivered_quantity || 0),
                                                0,
                                            )}{' '}
                                            delivered
                                        </span>
                                        <span className="text-sm font-bold tabular-nums">
                                            Subtotal: Tk{' '}
                                            {(
                                                viewingProduct.meals_subtotal ||
                                                0
                                            ).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Challan Dialog */}
            <Dialog open={challanOpen} onOpenChange={setChallanOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="space-y-1 border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Truck className="size-4.5 text-muted-foreground" />
                            Create Challan
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Create a delivery challan from this purchase order.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
                        {challanProduct && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                                    <div>
                                        <span className="text-[10px] font-semibold text-blue-400 uppercase">
                                            PO Code
                                        </span>
                                        <p className="font-mono text-blue-800">
                                            {challanProduct.code}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-blue-400 uppercase">
                                            Name
                                        </span>
                                        <p className="text-blue-800">
                                            {challanProduct.name}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-blue-400 uppercase">
                                            Party
                                        </span>
                                        <p className="text-blue-800">
                                            {challanProduct.party_name || '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-blue-400 uppercase">
                                            Customer PO
                                        </span>
                                        <p className="text-blue-800">
                                            {challanProduct.customer_po_number ||
                                                '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Date *
                            </Label>
                            <Input
                                type="date"
                                value={challanDate}
                                onChange={(e) => setChallanDate(e.target.value)}
                            />
                            <InputError message={challanErrors.date} />
                        </div>

                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Delivery Address *
                            </Label>
                            <textarea
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                rows={2}
                                placeholder="Enter delivery address..."
                                value={challanAddress}
                                onChange={(e) =>
                                    setChallanAddress(e.target.value)
                                }
                            />
                            <InputError message={challanErrors.address} />
                        </div>

                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Notes
                            </Label>
                            <textarea
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                rows={2}
                                placeholder="Additional notes..."
                                value={challanNotes}
                                onChange={(e) =>
                                    setChallanNotes(e.target.value)
                                }
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Items *
                            </Label>
                            {challanItems.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                                    This PO is fully delivered. No remaining
                                    items to dispatch.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {challanItems.map((it, idx) => (
                                        <div
                                            key={it.product_meal_id}
                                            className="rounded-lg border border-border bg-muted/30 p-3"
                                        >
                                            <div className="mb-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${mealBadge[it.meal_type] || 'bg-slate-100 text-slate-600'}`}
                                                    >
                                                        {formatMealType(
                                                            it.meal_type,
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ৳
                                                        {fmtMoney(
                                                            it.unit_price,
                                                        )}
                                                        /unit
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Max:{' '}
                                                    <strong>{it.max}</strong>
                                                </div>
                                            </div>
                                            {it.description && (
                                                <p className="mb-2 text-xs text-muted-foreground">
                                                    {it.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Label className="w-20 text-xs text-muted-foreground">
                                                    Dispatch Qty
                                                </Label>
                                                <Input
                                                    type="number"
                                                    className="h-8 flex-1 text-xs"
                                                    value={it.quantity}
                                                    min={0}
                                                    max={it.max}
                                                    onChange={(e) =>
                                                        updateChallanItemQty(
                                                            idx,
                                                            parseInt(
                                                                e.target.value,
                                                            ) || 0,
                                                        )
                                                    }
                                                    onWheel={(e) =>
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).blur()
                                                    }
                                                />
                                                <span className="w-24 text-right text-xs font-semibold tabular-nums">
                                                    ৳
                                                    {fmtMoney(
                                                        it.quantity *
                                                            it.unit_price,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                        <div className="flex justify-between text-sm font-bold text-emerald-800">
                                            <span>Total Delivery Amount:</span>
                                            <span className="tabular-nums">
                                                ৳{fmtMoney(challanGrandTotal)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <InputError message={challanErrors.items} />
                        </div>
                    </div>
                    <DialogFooter className="border-t border-border pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setChallanOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={
                                challanProcessing || challanItems.length === 0
                            }
                            onClick={createChallan}
                            className="min-w-28"
                        >
                            {challanProcessing ? 'Saving…' : 'Create Challan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-red-50">
                            <AlertTriangle className="size-5 text-red-600" />
                        </div>
                        <DialogTitle>Delete Purchase Order</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete{' '}
                            <strong className="text-foreground">
                                {deletingProduct?.name}
                            </strong>{' '}
                            ({deletingProduct?.code})? This action cannot be
                            undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={processing}
                            onClick={handleDelete}
                        >
                            {processing ? 'Deleting…' : 'Delete Order'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
