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
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { useState } from 'react';

type Role = {
    id: number;
    name: string;
};

type User = {
    id: number;
    name: string;
    email: string;
    roles: Role[];
};

export default function UsersIndex({ users, roles }: { users: User[]; roles: Role[] }) {
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    const openAdd = () => {
        setSelectedUser(null);
        setSelectedRoles([]);
        setPassword('');
        setPasswordConfirmation('');
        setErrors({});
        setAddOpen(true);
    };

    const openEdit = (user: User) => {
        setSelectedUser(user);
        setSelectedRoles(user.roles.map((r) => r.id));
        setPassword('');
        setPasswordConfirmation('');
        setErrors({});
        setEditOpen(true);
    };

    const openDelete = (user: User) => {
        setSelectedUser(user);
        setDeleteConfirmOpen(true);
    };

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        setProcessing(true);
        setErrors({});

        try {
            const response = await fetch('/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password: password,
                    password_confirmation: passwordConfirmation,
                    roles: selectedRoles,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('User created successfully');
                setAddOpen(false);
                form.reset();
                setSelectedRoles([]);
                setPassword('');
                setPasswordConfirmation('');
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
        if (!selectedUser) return;
        setProcessing(true);
        setErrors({});

        try {
            const body: Record<string, unknown> = {
                name: selectedUser.name,
                email: selectedUser.email,
                roles: selectedRoles,
            };

            if (password) {
                body.password = password;
                body.password_confirmation = passwordConfirmation;
            }

            const response = await fetch(`/admin/users/${selectedUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('User updated successfully');
                setEditOpen(false);
                setSelectedUser(null);
                setSelectedRoles([]);
                setPassword('');
                setPasswordConfirmation('');
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
        if (!selectedUser) return;
        setProcessing(true);

        try {
            const response = await fetch(`/admin/users/${selectedUser.id}`, {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('User deleted successfully');
                setDeleteConfirmOpen(false);
                setSelectedUser(null);
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

    const toggleRole = (roleId: number) => {
        setSelectedRoles((prev) =>
            prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
        );
    };

    return (
        <>
            <Head title="Users Management" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <UserCog className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Users" description="Manage users and their roles" />
                    </div>
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openAdd}>
                                <Plus className="mr-1.5 size-4" />
                                New User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create User</DialogTitle>
                                <DialogDescription>Create a new user and assign roles.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreate}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input id="name" name="name" placeholder="Full name" disabled={processing} />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" name="email" type="email" placeholder="email@example.com" disabled={processing} />
                                        <InputError message={errors.email} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={processing} />
                                        <InputError message={errors.password} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password_confirmation">Confirm Password</Label>
                                        <Input id="password_confirmation" type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} disabled={processing} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Roles</Label>
                                        <div className="max-h-40 overflow-y-auto rounded-md border border-input bg-muted/30 p-3">
                                            {roles.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No roles available.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {roles.map((role) => (
                                                        <label key={role.id} className="flex items-center gap-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedRoles.includes(role.id)}
                                                                onChange={() => toggleRole(role.id)}
                                                                className="size-4 rounded border-gray-300"
                                                            />
                                                            {role.name.replace(/_/g, ' ')}
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
                                        {processing ? 'Saving...' : 'Create User'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-3">
                    {users.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-sidebar-border/70 p-12 text-center">
                            <UserCog className="mx-auto size-8 text-muted-foreground opacity-40" />
                            <p className="mt-2 text-sm font-medium text-muted-foreground">No users yet</p>
                        </div>
                    ) : (
                        users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between rounded-xl border border-sidebar-border/70 px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {user.roles.map((role) => (
                                            <span key={role.id} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium">
                                                {role.name.replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(user)}>
                                        <Pencil className="size-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openDelete(user)}>
                                        <Trash2 className="size-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update user details and assigned roles.</DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <form onSubmit={handleUpdate}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={selectedUser.name}
                                        onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                                        disabled={processing}
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-email">Email</Label>
                                    <Input
                                        id="edit-email"
                                        type="email"
                                        value={selectedUser.email}
                                        onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                                        disabled={processing}
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-password">Password</Label>
                                    <Input
                                        id="edit-password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Leave blank to keep current"
                                        disabled={processing}
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-password_confirmation">Confirm Password</Label>
                                    <Input
                                        id="edit-password_confirmation"
                                        type="password"
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        disabled={processing}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Roles</Label>
                                    <div className="max-h-40 overflow-y-auto rounded-md border border-input bg-muted/30 p-3">
                                        {roles.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">No roles available.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {roles.map((role) => (
                                                    <label key={role.id} className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRoles.includes(role.id)}
                                                            onChange={() => toggleRole(role.id)}
                                                            className="size-4 rounded border-gray-300"
                                                        />
                                                        {role.name.replace(/_/g, ' ')}
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
                                    {processing ? 'Saving...' : 'Update User'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the user <strong>{selectedUser?.name}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                            {processing ? 'Deleting...' : 'Delete User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
