import { Head, router } from '@inertiajs/react';
import { RotateCcw, Trash2, Trash as TrashIcon, Users, Package, Truck, FileText, Banknote } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';

type TrashRow = {
    id: number;
    name: string;
    sub: string | null;
    meta: string | null;
    deleted_at: string | null;
};

type TrashItems = {
    parties: TrashRow[];
    products: TrashRow[];
    challans: TrashRow[];
    invoices: TrashRow[];
    payments: TrashRow[];
};

const sections: Array<{ key: keyof TrashItems; label: string; icon: typeof Users }> = [
    { key: 'parties', label: 'Parties', icon: Users },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'challans', label: 'Challans', icon: Truck },
    { key: 'invoices', label: 'Invoices', icon: FileText },
    { key: 'payments', label: 'Payments', icon: Banknote },
];

function fmtDateTime(d: string | null) {
    if (!d) {
return '—';
}

    const [date, time] = d.split(' ');

    if (!date) {
return d;
}

    const [y, m, day] = date.split('-');

    return day && m && y ? `${day}/${m}/${y}${time ? ` ${time}` : ''}` : d;
}

export default function Trash({ items }: { items: TrashItems }) {
    const [busy, setBusy] = useState<string | null>(null);

    const restore = (model: string, id: number) => {
        setBusy(`${model}-${id}`);
        router.post(
            `/trash/${model}/${id}/restore`,
            {},
            {
                onSuccess: () => {
                    setBusy(null);
                    toast.success('Item restored');
                },
                onError: () => {
                    setBusy(null);
                    toast.error('Failed to restore item');
                },
            }
        );
    };

    const forceDelete = (model: string, id: number, name: string) => {
        if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) {
            return;
        }

        setBusy(`${model}-${id}`);
        router.delete(`/trash/${model}/${id}`, {
            onSuccess: () => {
                setBusy(null);
                toast.success('Item permanently deleted');
            },
            onError: () => {
                setBusy(null);
                toast.error('Failed to delete item');
            },
        });
    };

    const totalTrashed = sections.reduce((sum, s) => sum + items[s.key].length, 0);

    return (
        <>
            <Head title="Trash" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <TrashIcon className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Trash" description="Restore or permanently delete removed records" />
                    </div>
                    <div className="text-xs text-muted-foreground">{totalTrashed} item(s) in trash</div>
                </div>

                <div className="flex flex-col gap-5">
                    {sections.map((section) => {
                        const rows = items[section.key];

                        if (rows.length === 0) {
return null;
}

                        return (
                            <div key={section.key} className="overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                                <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                                    <section.icon className="size-4 text-muted-foreground" />
                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</span>
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                        {rows.length}
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/40">
                                                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                                                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Details</th>
                                                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status / Amount</th>
                                                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Deleted At</th>
                                                <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row) => (
                                                <tr key={`${section.key}-${row.id}`} className="border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                                                    <td className="px-4 py-2.5 text-xs font-semibold">{row.name}</td>
                                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.sub || '—'}</td>
                                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.meta || '—'}</td>
                                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDateTime(row.deleted_at)}</td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-xs text-emerald-700 dark:text-emerald-400"
                                                                disabled={busy === `${section.key}-${row.id}`}
                                                                onClick={() => restore(section.key, row.id)}
                                                            >
                                                                <RotateCcw className="mr-1 size-3.5" />
                                                                Restore
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 px-0 text-red-600"
                                                                title="Permanently delete"
                                                                disabled={busy === `${section.key}-${row.id}`}
                                                                onClick={() => forceDelete(section.key, row.id, row.name)}
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {totalTrashed === 0 && (
                    <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                        <TrashIcon className="size-8 opacity-40" />
                        <p className="text-sm font-medium">Trash is empty</p>
                        <p className="text-xs">Deleted records will appear here for restore or permanent removal.</p>
                    </div>
                )}
            </div>
        </>
    );
}
