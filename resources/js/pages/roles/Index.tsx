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
import { Pencil, Plus, Trash2, Shield } from 'lucide-react';
import { useState } from 'react';

type PropRole = {
    id: number;
    name: string;
    guard: string;
    permissions: {
        id: number;
        name: string;
        guard: string;
    }[];
};

type PropPermission = {
    id: number;
    name: string;
};

export default function RolesIndex({ roles, permissions }: { roles: PropRole[]; permissions: PropPermission[] }) {
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<PropRole | null>(null);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedPerms, setSelectedPerms] = useState<number[]>([]);

    const openEdit = (role: PropRole) => {
        setSelectedRole(role);
        setSelectedPerms(role.permissions.map((p) => p.id));
        setErrors({});
        setEditOpen(true);
    };

    const openDelete = (role: Role) => {
        setSelectedRole(role);
        setDeleteConfirmOpen(true);
    };

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        setProcessing(true);
        setErrors({});

        try {
            const body = {
                name: formData.get('name'),
                permissions: selectedPerms,
            };

            const response = await fetch('/admin/roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Role created successfully');
                setAddOpen(false);
                form.reset();
                setSelectedPerms([]);
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

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedRole) return;
        setProcessing(true);
        setErrors({});

        try {
            const body = {
                name: selectedRole.name,
                permissions: selectedPerms,
            };

            const response = await fetch(`/admin/roles/${selectedRole.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Role updated successfully');
                setEditOpen(false);
                setSelectedRole(null);
                setSelectedPerms([]);
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
        if (!selectedRole) return;
        setProcessing(true);

        try {
            const response = await fetch(`/admin/roles/${selectedRole.id}`, {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Role deleted successfully');
                setDeleteConfirmOpen(false);
                setSelectedRole(null);
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

    const togglePermission = (permId: number) => {
        setSelectedPerms((prev) =>
            prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
        );
    };

    return (
        <>
            <Head title="Roles Management" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <Shield className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Roles" description="Manage roles and their permissions" />
                    </div>
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-1.5 size-4" />
                                New Role
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Role</DialogTitle>
                                <DialogDescription>Define a new role and assign permissions.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreate}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Role Name</Label>
                                        <Input id="name" name="name" placeholder="e.g. manager" disabled={processing} />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Permissions</Label>
                                        <div className="max-h-60 overflow-y-auto rounded-md border border-input bg-muted/30 p-3">
                                            {permissions.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No permissions available.</p>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {permissions.map((perm) => (
                                                        <label key={perm.id} className="flex items-center gap-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedPerms.includes(perm.id)}
                                                                onChange={() => togglePermission(perm.id)}
                                                                className="size-4 rounded border-gray-300"
                                                            />
                                                            {perm.name.replace(/_/g, ' ')}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={processing}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Saving...' : 'Create Role'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-4">
                    {roles.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-sidebar-border/70 p-12 text-center">
                            <Shield className="mx-auto size-8 text-muted-foreground opacity-40" />
                            <p className="mt-2 text-sm font-medium text-muted-foreground">No roles yet</p>
                            <p className="text-xs text-muted-foreground">Create your first role to get started.</p>
                        </div>
                    ) : (
                        roles.map((role) => (
                            <div key={role.id} className="rounded-xl border border-sidebar-border/70 p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold">{role.name}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'} assigned
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(role)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openDelete(role)}>
                                            <Trash2 className="size-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {role.permissions.map((perm) => (
                                        <span key={perm.id} className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium">
                                            {perm.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Role</DialogTitle>
                        <DialogDescription>Update role name and assigned permissions.</DialogDescription>
                    </DialogHeader>
                    {selectedRole && (
                        <form onSubmit={handleUpdate}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Role Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={selectedRole.name}
                                        onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                                        disabled={processing}
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Permissions</Label>
                                    <div className="max-h-60 overflow-y-auto rounded-md border border-input bg-muted/30 p-3">
                                        {permissions.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">No permissions available.</p>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {permissions.map((perm) => (
                                                    <label key={perm.id} className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPerms.includes(perm.id)}
                                                            onChange={() => togglePermission(perm.id)}
                                                            className="size-4 rounded border-gray-300"
                                                        />
                                                        {perm.name.replace(/_/g, ' ')}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={processing}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Saving...' : 'Update Role'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Role</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the role <strong>{selectedRole?.name}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                            {processing ? 'Deleting...' : 'Delete Role'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
