import { Head, router } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
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
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    FileDown,
    Filter,
    Mail,
    MapPin,
    MoreHorizontal,
    Pencil,
    Phone,
    Plus,
    Printer,
    Search,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

type Party = {
    id: number;
    party_name: string;
    party_type: string;
    contact_person: string;
    contact_person_designation: string;
    phone: string;
    email: string;
    address: string;
    agreement_type: string;
    start_date: string;
    end_date: string;
    notes: string;
};

type PaginatedData<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
};

type Filters = {
    search: string;
    party_type: string;
    agreement_type: string;
    end_date_from: string;
    end_date_to: string;
    per_page: number;
};

const emptyParty: Party = {
    id: 0,
    party_name: '',
    party_type: '',
    contact_person: '',
    contact_person_designation: '',
    phone: '',
    email: '',
    address: '',
    agreement_type: '',
    start_date: '',
    end_date: '',
    notes: '',
};

const emptyFilters: Filters = {
    search: '',
    party_type: '',
    agreement_type: '',
    end_date_from: '',
    end_date_to: '',
    per_page: 10,
};

export default function Party({ parties }: { parties: PaginatedData<Party> }) {
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editingParty, setEditingParty] = useState<Party>(emptyParty);
    const [deletingParty, setDeletingParty] = useState<Party>(emptyParty);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [filters, setFilters] = useState<Filters>(emptyFilters);
    const searchRef = useRef<HTMLInputElement>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined,
    );

    const applyFilters = (overrides: Partial<Filters> = {}) => {
        const params: Record<string, string | number> = {};
        const merged = { ...filters, ...overrides };

        if (merged.search) params.search = merged.search;
        if (merged.party_type) params.party_type = merged.party_type;
        if (merged.agreement_type)
            params.agreement_type = merged.agreement_type;
        if (merged.end_date_from) params.end_date_from = merged.end_date_from;
        if (merged.end_date_to) params.end_date_to = merged.end_date_to;
        if (merged.per_page !== 10) params.per_page = merged.per_page;

        router.get('/party', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const goToPage = (page: number) => {
        const params: Record<string, string | number> = { page };
        if (filters.search) params.search = filters.search;
        if (filters.party_type) params.party_type = filters.party_type;
        if (filters.agreement_type)
            params.agreement_type = filters.agreement_type;
        if (filters.end_date_from) params.end_date_from = filters.end_date_from;
        if (filters.end_date_to) params.end_date_to = filters.end_date_to;
        if (filters.per_page !== 10) params.per_page = filters.per_page;

        router.get('/party', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchChange = (value: string) => {
        setFilters((prev) => ({ ...prev, search: value }));
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            applyFilters({ search: value });
        }, 400);
    };

    const clearFilters = () => {
        setFilters(emptyFilters);
        router.get('/party', {}, { preserveState: true, preserveScroll: true });
    };

    const hasActiveFilters =
        filters.search ||
        filters.party_type ||
        filters.agreement_type ||
        filters.end_date_from ||
        filters.end_date_to;

    useEffect(() => {
        return () => clearTimeout(searchTimer.current);
    }, []);

    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        setProcessing(true);
        setErrors({});

        try {
            const response = await fetch('/api/party', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(Object.fromEntries(formData)),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message);
                setAddOpen(false);
                form.reset();
                router.reload({ only: ['parties'] });
            } else if (response.status === 422) {
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

    const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        setProcessing(true);
        setErrors({});

        try {
            const response = await fetch(`/api/party/${editingParty.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(Object.fromEntries(formData)),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message);
                setEditOpen(false);
                setEditingParty(emptyParty);
                router.reload({ only: ['parties'] });
            } else if (response.status === 422) {
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
        setProcessing(true);

        try {
            const response = await fetch(`/api/party/${deletingParty.id}`, {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message);
                setDeleteOpen(false);
                setDeletingParty(emptyParty);
                router.reload({ only: ['parties'] });
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        } finally {
            setProcessing(false);
        }
    };

    const openEdit = (party: Party) => {
        setEditingParty(party);
        setErrors({});
        setEditOpen(true);
    };

    const openDelete = (party: Party) => {
        setDeletingParty(party);
        setDeleteOpen(true);
    };

    const printParty = (party: Party) => {
        window.open(`/api/party/${party.id}/print`, '_blank');
    };

    const PartyFormFields = ({
        prefix,
        party,
    }: {
        prefix?: string;
        party?: Party;
    }) => (
        <>
            <div className="grid gap-2">
                <Label htmlFor={`${prefix}party_name`}>Party Name</Label>
                <Input
                    id={`${prefix}party_name`}
                    name="party_name"
                    placeholder="Enter party name"
                    defaultValue={party?.party_name}
                    required
                />
                <InputError message={errors.party_name} />
            </div>

            <div className="grid gap-2">
                <Label>Party Type</Label>
                <Select name="party_type" defaultValue={party?.party_type}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select party type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                        <SelectItem value="hotel">Hotel</SelectItem>
                    </SelectContent>
                </Select>
                <InputError message={errors.party_type} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${prefix}contact_person`}>
                    Contact Person
                </Label>
                <Input
                    id={`${prefix}contact_person`}
                    name="contact_person"
                    placeholder="Enter contact person name"
                    defaultValue={party?.contact_person}
                />
                <InputError message={errors.contact_person} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${prefix}contact_person_designation`}>
                    Contact Person Designation
                </Label>
                <Input
                    id={`${prefix}contact_person_designation`}
                    name="contact_person_designation"
                    placeholder="Enter contact person designation"
                    defaultValue={party?.contact_person_designation}
                />
                <InputError message={errors.contact_person_designation} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor={`${prefix}phone`}>Phone</Label>
                    <Input
                        id={`${prefix}phone`}
                        name="phone"
                        type="tel"
                        placeholder="Enter phone number"
                        defaultValue={party?.phone}
                    />
                    <InputError message={errors.phone} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`${prefix}email`}>Email</Label>
                    <Input
                        id={`${prefix}email`}
                        name="email"
                        type="email"
                        placeholder="Enter email address"
                        defaultValue={party?.email}
                    />
                    <InputError message={errors.email} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${prefix}address`}>Address</Label>
                <textarea
                    id={`${prefix}address`}
                    name="address"
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter full address"
                    defaultValue={party?.address}
                />
                <InputError message={errors.address} />
            </div>

            <div className="grid gap-2">
                <Label>Agreement Type</Label>
                <Select
                    name="agreement_type"
                    defaultValue={party?.agreement_type}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select agreement type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="no-agreement">
                            No Agreement
                        </SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                </Select>
                <InputError message={errors.agreement_type} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor={`${prefix}start_date`}>Start Date</Label>
                    <Input
                        id={`${prefix}start_date`}
                        name="start_date"
                        type="date"
                        defaultValue={party?.start_date}
                    />
                    <InputError message={errors.start_date} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`${prefix}end_date`}>End Date</Label>
                    <Input
                        id={`${prefix}end_date`}
                        name="end_date"
                        type="date"
                        defaultValue={party?.end_date}
                    />
                    <InputError message={errors.end_date} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${prefix}notes`}>Notes</Label>
                <textarea
                    id={`${prefix}notes`}
                    name="notes"
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter any additional notes"
                    defaultValue={party?.notes}
                />
                <InputError message={errors.notes} />
            </div>
        </>
    );

    const exportToExcel = () => {
        const data = parties.data.map((p) => ({
            'Party Name': p.party_name,
            Type: p.party_type,
            'Contact Person': p.contact_person,
            Designation: p.contact_person_designation,
            Phone: p.phone,
            Email: p.email,
            Address: p.address,
            'Agreement Type': p.agreement_type,
            'Start Date': p.start_date,
            'End Date': p.end_date,
            Notes: p.notes,
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Parties');
        XLSX.writeFile(wb, 'parties.xlsx');
    };

    return (
        <>
            <Head title="Party Management" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        variant="small"
                        title="Party"
                        description="Manage party information and agreements"
                    />

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={exportToExcel}>
                            <FileDown className="mr-2 size-4" />
                            Export Excel
                        </Button>

                        <Dialog open={addOpen} onOpenChange={setAddOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 size-4" />
                                    Add Party
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-screen overflow-y-auto sm:max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Add New Party</DialogTitle>
                                    <DialogDescription>
                                        Fill in the party details below.
                                    </DialogDescription>
                                </DialogHeader>
                                <form
                                    onSubmit={handleAdd}
                                    className="space-y-4"
                                >
                                    <PartyFormFields prefix="add-" />
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setAddOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Saving...'
                                                : 'Save Party'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Filters */}
                <Card className="border-sidebar-border/70 py-0 dark:border-sidebar-border">
                    <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            {/* Search */}
                            <div className="relative w-full sm:max-w-md">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    ref={searchRef}
                                    placeholder="Search by name, contact, phone or email..."
                                    value={filters.search}
                                    onChange={(e) =>
                                        handleSearchChange(e.target.value)
                                    }
                                    className="h-10 pl-9"
                                />
                            </div>

                            {/* Search & Clear actions */}
                            <div className="flex items-center gap-2">
                                {(hasActiveFilters || filters.search) && (
                                    <Button
                                        variant="outline"
                                        onClick={clearFilters}
                                        className="h-10"
                                    >
                                        <X className="size-4" />
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-border" />

                        {/* Filter controls */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Party Type
                                </Label>
                                <Select
                                    value={filters.party_type}
                                    onValueChange={(value) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            party_type: value,
                                        }));
                                        applyFilters({ party_type: value });
                                    }}
                                >
                                    <SelectTrigger className="h-10 w-full">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">
                                            All Types
                                        </SelectItem>
                                        <SelectItem value="supplier">
                                            Supplier
                                        </SelectItem>
                                        <SelectItem value="customer">
                                            Customer
                                        </SelectItem>
                                        <SelectItem value="both">
                                            Both
                                        </SelectItem>
                                        <SelectItem value="hotel">
                                            Hotel
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Agreement
                                </Label>
                                <Select
                                    value={filters.agreement_type}
                                    onValueChange={(value) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            agreement_type: value,
                                        }));
                                        applyFilters({ agreement_type: value });
                                    }}
                                >
                                    <SelectTrigger className="h-10 w-full">
                                        <SelectValue placeholder="All Agreements" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">
                                            All Agreements
                                        </SelectItem>
                                        <SelectItem value="no-agreement">
                                            No Agreement
                                        </SelectItem>
                                        <SelectItem value="annual">
                                            Annual
                                        </SelectItem>
                                        <SelectItem value="monthly">
                                            Monthly
                                        </SelectItem>
                                        <SelectItem value="quarterly">
                                            Quarterly
                                        </SelectItem>
                                        <SelectItem value="custom">
                                            Custom
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    End Date From
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        value={filters.end_date_from}
                                        onChange={(e) => {
                                            setFilters((prev) => ({
                                                ...prev,
                                                end_date_from: e.target.value,
                                            }));
                                            applyFilters({
                                                end_date_from: e.target.value,
                                            });
                                        }}
                                        className="h-10"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    End Date To
                                </Label>
                                <Input
                                    type="date"
                                    value={filters.end_date_to}
                                    onChange={(e) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            end_date_to: e.target.value,
                                        }));
                                        applyFilters({
                                            end_date_to: e.target.value,
                                        });
                                    }}
                                    className="h-10"
                                />
                            </div>
                        </div>

                        {/* Active filter badges */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                    <Filter className="size-3.5" />
                                    Active filters:
                                </span>
                                {filters.party_type && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1"
                                    >
                                        <Users className="size-3" />
                                        {filters.party_type}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    party_type: '',
                                                }));
                                                applyFilters({
                                                    party_type: '',
                                                });
                                            }}
                                            className="ml-0.5 hover:text-foreground"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filters.agreement_type && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1"
                                    >
                                        {filters.agreement_type}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    agreement_type: '',
                                                }));
                                                applyFilters({
                                                    agreement_type: '',
                                                });
                                            }}
                                            className="ml-0.5 hover:text-foreground"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filters.end_date_from && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1"
                                    >
                                        <CalendarDays className="size-3" />
                                        From: {filters.end_date_from}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    end_date_from: '',
                                                }));
                                                applyFilters({
                                                    end_date_from: '',
                                                });
                                            }}
                                            className="ml-0.5 hover:text-foreground"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filters.end_date_to && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1"
                                    >
                                        <CalendarDays className="size-3" />
                                        To: {filters.end_date_to}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    end_date_to: '',
                                                }));
                                                applyFilters({
                                                    end_date_to: '',
                                                });
                                            }}
                                            className="ml-0.5 hover:text-foreground"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Parties Table */}
                <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                    {/* Table header bar */}
                    <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                        <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <Users className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Parties</p>
                                <p className="text-xs text-muted-foreground">
                                    {parties.total}{' '}
                                    {parties.total === 1 ? 'record' : 'records'}
                                </p>
                            </div>
                        </div>
                        <Badge
                            variant="outline"
                            className="text-muted-foreground"
                        >
                            {parties.total} total
                        </Badge>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/30">
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Party
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Type
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Contact
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Phone / Email
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Agreement
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        End Date
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {parties.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-16 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Search className="size-10 text-muted-foreground/40" />
                                                <p className="font-medium text-muted-foreground">
                                                    No parties found
                                                </p>
                                                <p className="text-sm text-muted-foreground/70">
                                                    Try adjusting your search or
                                                    filters.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    parties.data.map((party) => {
                                        const initials = (
                                            party.party_name || '?'
                                        )
                                            .split(' ')
                                            .slice(0, 2)
                                            .map((w) => w[0])
                                            .join('')
                                            .toUpperCase();

                                        const typeStyles: Record<
                                            string,
                                            string
                                        > = {
                                            supplier:
                                                'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                                            customer:
                                                'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
                                            both: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
                                            hotel: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                                        };

                                        return (
                                            <tr
                                                key={party.id}
                                                className="group transition-colors hover:bg-muted/30"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="size-9 border border-border/70 bg-emerald-50 dark:bg-emerald-950/40">
                                                            <AvatarFallback className="bg-transparent text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                                                {initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-foreground">
                                                                {
                                                                    party.party_name
                                                                }
                                                            </p>
                                                            {party.address && (
                                                                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                                                    <MapPin className="size-3 shrink-0" />
                                                                    {
                                                                        party.address
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${typeStyles[party.party_type] || 'bg-muted text-muted-foreground'}`}
                                                    >
                                                        {party.party_type}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="font-medium text-foreground">
                                                        {party.contact_person ||
                                                            '—'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {party.contact_person_designation ||
                                                            '—'}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {party.phone && (
                                                        <p className="flex items-center gap-1.5 text-foreground">
                                                            <Phone className="size-3.5 text-muted-foreground" />
                                                            {party.phone}
                                                        </p>
                                                    )}
                                                    {party.email && (
                                                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Mail className="size-3.5" />
                                                            {party.email}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Badge
                                                        variant="secondary"
                                                        className="rounded-full capitalize"
                                                    >
                                                        {party.agreement_type ||
                                                            '—'}
                                                    </Badge>
                                                </td>
                                                <td className="px-5 py-4 text-muted-foreground">
                                                    {party.end_date ? (
                                                        <span>
                                                            {party.end_date}
                                                        </span>
                                                    ) : (
                                                        <span>—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 text-muted-foreground hover:bg-accent hover:text-foreground"
                                                            >
                                                                <MoreHorizontal className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            className="w-40"
                                                        >
                                                            <DropdownMenuLabel>
                                                                Actions
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    printParty(
                                                                        party,
                                                                    )
                                                                }
                                                            >
                                                                <Printer className="size-4" />
                                                                Print
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    openEdit(
                                                                        party,
                                                                    )
                                                                }
                                                            >
                                                                <Pencil className="size-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    openDelete(
                                                                        party,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="size-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {parties.total > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                                Showing {parties.from}–{parties.to} of{' '}
                                {parties.total}
                            </span>

                            <div className="flex items-center gap-1">
                                <span>per page:</span>
                                <select
                                    value={String(filters.per_page)}
                                    onChange={(e) => {
                                        const perPage = Number(e.target.value);
                                        setFilters((prev) => ({
                                            ...prev,
                                            per_page: perPage,
                                        }));
                                        const params: Record<
                                            string,
                                            string | number
                                        > = { per_page: perPage };
                                        if (filters.search)
                                            params.search = filters.search;
                                        if (filters.party_type)
                                            params.party_type =
                                                filters.party_type;
                                        if (filters.agreement_type)
                                            params.agreement_type =
                                                filters.agreement_type;
                                        if (filters.end_date_from)
                                            params.end_date_from =
                                                filters.end_date_from;
                                        if (filters.end_date_to)
                                            params.end_date_to =
                                                filters.end_date_to;
                                        router.get('/party', params, {
                                            preserveState: true,
                                            preserveScroll: true,
                                        });
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

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={parties.current_page <= 1}
                                onClick={() =>
                                    goToPage(parties.current_page - 1)
                                }
                            >
                                <ChevronLeft className="size-4" />
                            </Button>

                            {Array.from(
                                { length: parties.last_page },
                                (_, i) => i + 1,
                            )
                                .filter((page) => {
                                    const cur = parties.current_page;
                                    const last = parties.last_page;
                                    if (last <= 7) return true;
                                    if (page === 1 || page === last)
                                        return true;
                                    if (page >= cur - 1 && page <= cur + 1)
                                        return true;
                                    return false;
                                })
                                .map((page, idx, arr) => (
                                    <span
                                        key={page}
                                        className="flex items-center"
                                    >
                                        {idx > 0 &&
                                            arr[idx - 1] !== page - 1 && (
                                                <span className="px-1 text-muted-foreground">
                                                    ...
                                                </span>
                                            )}
                                        <Button
                                            variant={
                                                parties.current_page === page
                                                    ? 'default'
                                                    : 'ghost'
                                            }
                                            size="sm"
                                            className="min-w-9"
                                            onClick={() => goToPage(page)}
                                        >
                                            {page}
                                        </Button>
                                    </span>
                                ))}

                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={
                                    parties.current_page >= parties.last_page
                                }
                                onClick={() =>
                                    goToPage(parties.current_page + 1)
                                }
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-h-screen overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Party</DialogTitle>
                        <DialogDescription>
                            Update the party details below.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <input
                            type="hidden"
                            name="id"
                            value={editingParty.id}
                        />
                        <PartyFormFields prefix="edit-" party={editingParty} />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Updating...' : 'Update Party'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Party</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete{' '}
                            <strong>{deletingParty.party_name}</strong>? This
                            action cannot be undone.
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
                            {processing ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
