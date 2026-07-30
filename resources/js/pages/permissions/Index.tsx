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
import { toast } from 'sonner';
import { Plus, Trash2, Lock } from 'lucide-react';
import { useState } from 'react';

type Permission = {
    id: number;
    name: string;
    guard: string;
};

export default function PermissionsIndex({ permissions }: { permissions: Permission[] }) {
    const [addOpen, setAddOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [selectedPerm, setSelectedPerm] = useState<Permission | null>(null);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const openDelete = (permission: Permission) => {
        setSelectedPerm(permission);
        setDeleteConfirmOpen(true);
    };

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        setProcessing(true);
        setErrors({});

        try {
            const response = await fetch('/admin/permissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ name: formData.get('name') }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Permission created successfully');
                setAddOpen(false);
                form.reset();
                router.reload();
            } else if (response.status === 422) {
                setErrors(data.errors || {});
                toast.error('Please check the form for errors');
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
        if (!selectedPerm) return;
        setProcessing(true);

        try {
            const response = await fetch(`/admin/permissions/${selectedPerm.id}`, {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Permission deleted successfully');
                setDeleteConfirmOpen(false);
                setSelectedPerm(null);
                router.reload();
            } else {
                toast.error(data.message || 'Something went wrong.');
            }
        } catch {
            toast.error('Something went wrong.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>
            <Head title="Permissions Management" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <Lock className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Permissions" description="Manage available permissions" />
                    </div>
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-1.5 size-4" />
                                New Permission
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Permission</DialogTitle>
                                <DialogDescription>Define a new permission that can be assigned to roles.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreate}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Permission Name</Label>
                                        <Input id="name" name="name" placeholder="e.g. manage_invoices" disabled={processing} />
                                        <InputError message={errors.name} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={processing}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Saving...' : 'Create Permission'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-3">
                    {permissions.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-sidebar-border/70 p-12 text-center">
                            <Lock className="mx-auto size-8 text-muted-foreground opacity-40" />
                            <p className="mt-2 text-sm font-medium text-muted-foreground">No permissions yet</p>
                            <p className="text-xs text-muted-foreground">Create permissions to assign them to roles.</p>
                        </div>
                    ) : (
                        permissions.map((perm) => (
                            <div key={perm.id} className="flex items-center justify-between rounded-xl border border-sidebar-border/70 px-4 py-3">
                                <span className="font-mono text-sm">{perm.name.replace(/_/g, ' ')}</span>
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => openDelete(perm)}>
                                    <Trash2 className="size-4 text-red-500" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Permission</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the permission <strong>{selectedPerm?.name}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                            {processing ? 'Deleting...' : 'Delete Permission'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
