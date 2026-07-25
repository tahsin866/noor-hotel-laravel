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
import { toast } from 'sonner';
import { Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Party = {
    id: number;
    party_name: string;
    party_type: string;
    contact_person: string;
    phone: string;
    email: string;
    address: string;
    agreement_type: string;
    start_date: string;
    end_date: string;
    notes: string;
};

const emptyParty: Party = {
    id: 0,
    party_name: '',
    party_type: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    agreement_type: '',
    start_date: '',
    end_date: '',
    notes: '',
};

export default function Party({ parties }: { parties: Party[] }) {
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editingParty, setEditingParty] = useState<Party>(emptyParty);
    const [deletingParty, setDeletingParty] = useState<Party>(emptyParty);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

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

    return (
        <>
            <Head title="Party Management" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        variant="small"
                        title="Party"
                        description="Manage party information and agreements"
                    />

                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 size-4" />
                                Add Party
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
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

                {/* Parties Table */}
                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 bg-muted/50 dark:border-sidebar-border">
                                <th className="px-4 py-3 text-left font-medium">Party Name</th>
                                <th className="px-4 py-3 text-left font-medium">Type</th>
                                <th className="px-4 py-3 text-left font-medium">Contact Person</th>
                                <th className="px-4 py-3 text-left font-medium">Phone</th>
                                <th className="px-4 py-3 text-left font-medium">Email</th>
                                <th className="px-4 py-3 text-left font-medium">Agreement</th>
                                <th className="px-4 py-3 text-left font-medium">End Date</th>
                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parties.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                        No parties found. Click "Add Party" to create one.
                                    </td>
                                </tr>
                            ) : (
                                parties.map((party) => (
                                    <tr key={party.id} className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border">
                                        <td className="px-4 py-3 font-medium">{party.party_name}</td>
                                        <td className="px-4 py-3 capitalize">{party.party_type}</td>
                                        <td className="px-4 py-3">{party.contact_person}</td>
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
            </div>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-2xl">
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
