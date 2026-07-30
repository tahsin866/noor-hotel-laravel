import { Head, router } from '@inertiajs/react';
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
    DialogTrigger,
} from '@/components/ui/dialog';
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
    ChevronLeft,
    ChevronRight,
    FileDown,
    Pencil,
    Plus,
    Printer,
    Search,
    Trash2,
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
    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const applyFilters = (overrides: Partial<Filters> = {}) => {
        const params: Record<string, string | number> = {};
        const merged = { ...filters, ...overrides };

        if (merged.search) params.search = merged.search;
        if (merged.party_type) params.party_type = merged.party_type;
        if (merged.agreement_type) params.agreement_type = merged.agreement_type;
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
        if (filters.agreement_type) params.agreement_type = filters.agreement_type;
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

    const PartyFormFields = ({ prefix, party }: { prefix?: string; party?: Party }) => (
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
                <Label htmlFor={`${prefix}contact_person`}>Contact Person</Label>
                <Input
                    id={`${prefix}contact_person`}
                    name="contact_person"
                    placeholder="Enter contact person name"
                    defaultValue={party?.contact_person}
                />
                <InputError message={errors.contact_person} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${prefix}contact_person_designation`}>Contact Person Designation</Label>
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
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter full address"
                    defaultValue={party?.address}
                />
                <InputError message={errors.address} />
            </div>

            <div className="grid gap-2">
                <Label>Agreement Type</Label>
                <Select name="agreement_type" defaultValue={party?.agreement_type}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select agreement type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="no-agreement">No Agreement</SelectItem>
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
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                            <DialogContent className="sm:max-w-2xl max-h-screen overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Add New Party</DialogTitle>
                                    <DialogDescription>
                                        Fill in the party details below.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAdd} className="space-y-4">
                                    <PartyFormFields prefix="add-" />
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={processing}>
                                            {processing ? 'Saving...' : 'Save Party'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            ref={searchRef}
                            placeholder="Search by name, contact, phone or email..."
                            value={filters.search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Select
                        value={filters.party_type}
                        onValueChange={(value) => {
                            setFilters((prev) => ({ ...prev, party_type: value }));
                            applyFilters({ party_type: value });
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Party Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Types</SelectItem>
                            <SelectItem value="supplier">Supplier</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                            <SelectItem value="hotel">Hotel</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.agreement_type}
                        onValueChange={(value) => {
                            setFilters((prev) => ({ ...prev, agreement_type: value }));
                            applyFilters({ agreement_type: value });
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Agreement" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Agreements</SelectItem>
                            <SelectItem value="no-agreement">No Agreement</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <Input
                        type="date"
                        value={filters.end_date_from}
                        onChange={(e) => {
                            setFilters((prev) => ({ ...prev, end_date_from: e.target.value }));
                            applyFilters({ end_date_from: e.target.value });
                        }}
                    />

                    <Input
                        type="date"
                        value={filters.end_date_to}
                        onChange={(e) => {
                            setFilters((prev) => ({ ...prev, end_date_to: e.target.value }));
                            applyFilters({ end_date_to: e.target.value });
                        }}
                    />

                    {hasActiveFilters ? (
                        <Button variant="outline" onClick={clearFilters}>
                            <X className="mr-2 size-4" />
                            Reset Filters
                        </Button>
                    ) : (
                        <div />
                    )}
                </div>

                {/* Parties Table */}
                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                                <th className="px-4 py-3 text-left font-medium">Party Name</th>
                                <th className="px-4 py-3 text-left font-medium">Type</th>
                                <th className="px-4 py-3 text-left font-medium">Contact Person</th>
                                <th className="px-4 py-3 text-left font-medium">Designation</th>
                                <th className="px-4 py-3 text-left font-medium">Phone</th>
                                <th className="px-4 py-3 text-left font-medium">Email</th>
                                <th className="px-4 py-3 text-left font-medium">Agreement</th>
                                <th className="px-4 py-3 text-left font-medium">End Date</th>
                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parties.data.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                                        No parties found.
                                    </td>
                                </tr>
                            ) : (
                                parties.data.map((party) => (
                                    <tr key={party.id} className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border">
                                        <td className="px-4 py-3 font-medium">{party.party_name}</td>
                                        <td className="px-4 py-3 capitalize">{party.party_type}</td>
                                        <td className="px-4 py-3">{party.contact_person}</td>
                                        <td className="px-4 py-3">{party.contact_person_designation}</td>
                                        <td className="px-4 py-3">{party.phone}</td>
                                        <td className="px-4 py-3">{party.email}</td>
                                        <td className="px-4 py-3 capitalize">{party.agreement_type}</td>
                                        <td className="px-4 py-3">{party.end_date}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => printParty(party)}>
                                                    <Printer className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(party)}>
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => openDelete(party)}>
                                                    <Trash2 className="size-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {parties.total > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                                Showing {parties.from}–{parties.to} of {parties.total}
                            </span>

                            <div className="flex items-center gap-1">
                                <span>per page:</span>
                                <Select
                                    value={String(filters.per_page)}
                                    onValueChange={(value) => {
                                        const perPage = Number(value);
                                        setFilters((prev) => ({ ...prev, per_page: perPage }));
                                        const params: Record<string, string | number> = { per_page: perPage };
                                        if (filters.search) params.search = filters.search;
                                        if (filters.party_type) params.party_type = filters.party_type;
                                        if (filters.agreement_type) params.agreement_type = filters.agreement_type;
                                        if (filters.end_date_from) params.end_date_from = filters.end_date_from;
                                        if (filters.end_date_to) params.end_date_to = filters.end_date_to;
                                        router.get('/party', params, { preserveState: true, preserveScroll: true });
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={parties.current_page <= 1}
                                onClick={() => goToPage(parties.current_page - 1)}
                            >
                                <ChevronLeft className="size-4" />
                            </Button>

                            {Array.from({ length: parties.last_page }, (_, i) => i + 1)
                                .filter((page) => {
                                    const cur = parties.current_page;
                                    const last = parties.last_page;
                                    if (last <= 7) return true;
                                    if (page === 1 || page === last) return true;
                                    if (page >= cur - 1 && page <= cur + 1) return true;
                                    return false;
                                })
                                .map((page, idx, arr) => (
                                    <span key={page} className="flex items-center">
                                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                                            <span className="px-1 text-muted-foreground">...</span>
                                        )}
                                        <Button
                                            variant={parties.current_page === page ? 'default' : 'ghost'}
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
                                disabled={parties.current_page >= parties.last_page}
                                onClick={() => goToPage(parties.current_page + 1)}
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-2xl max-h-screen overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Party</DialogTitle>
                        <DialogDescription>
                            Update the party details below.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <input type="hidden" name="id" value={editingParty.id} />
                        <PartyFormFields prefix="edit-" party={editingParty} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
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
                            Are you sure you want to delete <strong>{deletingParty.party_name}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" disabled={processing} onClick={handleDelete}>
                            {processing ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
