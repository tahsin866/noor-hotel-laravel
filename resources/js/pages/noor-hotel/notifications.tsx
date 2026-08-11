import { Head, router } from '@inertiajs/react';
import { Bell, BellRing, CheckCheck, ChevronLeft, ChevronRight, MailOpen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';

type NotificationRow = {
    id: string;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string | null;
};

type Pagination = {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
};

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

export default function Notifications({
    notifications,
    unread_count,
}: {
    notifications: { data: NotificationRow[]; pagination: Pagination };
    unread_count: number;
}) {
    const [busy, setBusy] = useState<string | null>(null);

    const goToPage = (page: number) => {
        router.get('/notifications', { page }, { preserveState: true, preserveScroll: true });
    };

    const markRead = (id: string) => {
        setBusy(id);
        router.post(
            `/notifications/${id}/read`,
            {},
            {
                onSuccess: () => {
                    setBusy(null);
                    toast.success('Notification marked as read');
                },
                onError: () => {
                    setBusy(null);
                    toast.error('Failed to update notification');
                },
            }
        );
    };

    const markAllRead = () => {
        setBusy('all');
        router.post(
            '/notifications/read-all',
            {},
            {
                onSuccess: () => {
                    setBusy(null);
                    toast.success('All notifications marked as read');
                },
                onError: () => {
                    setBusy(null);
                    toast.error('Failed to update notifications');
                },
            }
        );
    };

    const remove = (id: string) => {
        if (!window.confirm('Delete this notification?')) {
            return;
        }

        setBusy(id);
        router.delete(`/notifications/${id}`, {
            onSuccess: () => {
                setBusy(null);
                toast.success('Notification deleted');
            },
            onError: () => {
                setBusy(null);
                toast.error('Failed to delete notification');
            },
        });
    };

    const { current_page: currentPage, last_page: lastPage, total } = notifications.pagination;

    return (
        <>
            <Head title="Notifications" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <Bell className="size-5 text-foreground/80" />
                        </div>
                        <Heading variant="small" title="Notifications" description="View your notifications" />
                    </div>
                    <Button variant="outline" size="sm" onClick={markAllRead} disabled={busy !== null || unread_count === 0}>
                        <CheckCheck className="mr-1.5 size-4" />
                        Mark all as read
                    </Button>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BellRing className="size-3.5" />
                    {unread_count} unread of {total} total
                </div>

                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                    {notifications.data.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-muted-foreground">
                            <Bell className="size-8 opacity-40" />
                            <p className="text-sm font-medium">No notifications</p>
                            <p className="text-xs">New notifications will appear here.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {notifications.data.map((n) => (
                                <li
                                    key={n.id}
                                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30 ${n.read_at ? 'bg-background' : 'bg-blue-50/40 dark:bg-blue-950/20'}`}
                                >
                                    <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${n.read_at ? 'bg-muted text-muted-foreground' : 'bg-blue-100 text-blue-700'}`}>
                                        <MailOpen className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className={`text-sm ${n.read_at ? 'text-foreground/80' : 'font-semibold text-foreground'}`}>{n.title}</p>
                                            <span className="text-[10px] text-muted-foreground">{fmtDateTime(n.created_at)}</span>
                                        </div>
                                        {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        {!n.read_at && (
                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy === n.id} onClick={() => markRead(n.id)}>
                                                Mark read
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 px-0 text-red-600"
                                            title="Delete notification"
                                            disabled={busy === n.id}
                                            onClick={() => remove(n.id)}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {total > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                            Showing {(currentPage - 1) * notifications.pagination.per_page + 1}–
                            {Math.min(currentPage * notifications.pagination.per_page, total)} of {total}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={currentPage <= 1}
                                onClick={() => goToPage(currentPage - 1)}
                                className="flex h-7 items-center gap-1 rounded-md border border-input px-2.5 text-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft className="size-3.5" />
                                Prev
                            </button>
                            <span className="px-2 text-xs text-muted-foreground">{currentPage} / {lastPage}</span>
                            <button
                                type="button"
                                disabled={currentPage >= lastPage}
                                onClick={() => goToPage(currentPage + 1)}
                                className="flex h-7 items-center gap-1 rounded-md border border-input px-2.5 text-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                                <ChevronRight className="size-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
