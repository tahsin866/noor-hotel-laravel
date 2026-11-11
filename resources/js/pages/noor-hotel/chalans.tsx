import { Head, router } from '@inertiajs/react';
import { Plus, Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import ChallanForm from '@/components/challans/challan-form';
import { printChallans } from '@/components/challans/challan-print';
import { challanStatusMessages } from '@/components/challans/challan-status';
import ChallanTable from '@/components/challans/challan-table';
import {
    ChallanBulkBar,
    ChallanFilters,
} from '@/components/challans/challan-toolbar';
import ChallanViewDialog from '@/components/challans/challan-view-dialog';
import type {
    Challan,
    ChallanStatus,
    Party,
    Product,
} from '@/components/challans/types';
import { useChallanForm } from '@/components/challans/use-challan-form';
import { useChallanList } from '@/components/challans/use-challan-list';
import Heading from '@/components/heading';
import ConfirmDeleteDialog from '@/components/shared/confirm-delete-dialog';
import TablePagination from '@/components/shared/table-pagination';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/api';

const SOMETHING_WENT_WRONG = 'Something went wrong.';

async function fetchChallan(id: number): Promise<Challan | null> {
    const { body } = await apiRequest<Challan>(`/api/challans/${id}`);

    return body.data ?? null;
}

export default function Challans({
    products,
    parties,
}: {
    products: Product[];
    parties: Party[];
}) {
    const list = useChallanList();
    const form = useChallanForm(products);

    const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
    const [editing, setEditing] = useState<Challan | null>(null);
    const [viewing, setViewing] = useState<Challan | null>(null);
    const [deleting, setDeleting] = useState<Challan | null>(null);
    const [processing, setProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    /** Reload the list and the PO remaining quantities after any change. */
    const refreshAll = () => {
        list.refresh();
        router.reload({ only: ['products'] });
    };

    const closeForm = () => {
        setFormMode(null);
        setEditing(null);
        form.reset();
    };

    const openCreate = () => {
        form.reset();
        setFormMode('create');
    };

    const openEdit = async (challan: Challan) => {
        try {
            const fresh = await fetchChallan(challan.id);

            if (!fresh) {
                throw new Error('missing');
            }

            setEditing(fresh);
            form.fillFromChallan(fresh);
            setFormMode('edit');
        } catch {
            toast.error('Failed to load challan');
        }
    };

    const openView = async (challan: Challan) => {
        try {
            setViewing(await fetchChallan(challan.id));
        } catch {
            toast.error('Failed to load challan');
        }
    };

    const handleSubmit = async () => {
        const isEdit = formMode === 'edit';

        if (!form.productId || (!isEdit && form.items.length === 0)) {
            if (!isEdit) {
                toast.error('Select a PO and add items');
            }

            return;
        }

        if (isEdit && !editing) {
            return;
        }

        if (!form.date) {
            form.setErrors({ date: 'Please select the challan date.' });
            toast.error('Please select the challan date.');

            return;
        }

        setProcessing(true);
        form.setErrors({});

        try {
            const { ok, status, body } = await apiRequest(
                isEdit ? `/api/challans/${editing!.id}` : '/api/challans',
                { method: isEdit ? 'PUT' : 'POST', body: form.toPayload() },
            );

            if (ok) {
                toast.success(
                    body.message ||
                        (isEdit ? 'Challan updated' : 'Challan created'),
                );
                closeForm();
                refreshAll();
            } else if (status === 422) {
                form.setErrors(body.errors || {});
            } else {
                toast.error(body.message || SOMETHING_WENT_WRONG);
            }
        } catch {
            toast.error(SOMETHING_WENT_WRONG);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!deleting) {
            return;
        }

        setProcessing(true);

        try {
            const { ok, body } = await apiRequest(
                `/api/challans/${deleting.id}`,
                { method: 'DELETE' },
            );

            if (ok) {
                toast.success(body.message || 'Challan deleted');
                setDeleting(null);
                refreshAll();
            } else {
                toast.error(body.message || SOMETHING_WENT_WRONG);
            }
        } catch {
            toast.error(SOMETHING_WENT_WRONG);
        } finally {
            setProcessing(false);
        }
    };

    const patchStatus = (id: number, status: ChallanStatus) =>
        apiRequest(`/api/challans/${id}/status`, {
            method: 'PATCH',
            body: { status },
        });

    const changeStatus = async (challan: Challan, status: ChallanStatus) => {
        const isReturn =
            status === 'pending' ||
            (status === 'dispatched' && challan.status === 'delivered');

        try {
            const { ok, body } = await patchStatus(challan.id, status);

            if (ok) {
                toast.success(
                    isReturn
                        ? `Challan returned to ${status}`
                        : body.message || challanStatusMessages[status],
                );
                refreshAll();
            } else {
                toast.error(body.message || SOMETHING_WENT_WRONG);
            }
        } catch {
            toast.error(SOMETHING_WENT_WRONG);
        }
    };

    const bulkChangeStatus = async (status: ChallanStatus) => {
        for (const id of selectedIds) {
            await patchStatus(id, status);
        }

        toast.success(`${selectedIds.size} challan(s) ${status}`);
        setSelectedIds(new Set());
        refreshAll();
    };

    const printOne = async (challan: Challan) => {
        try {
            const fresh = await fetchChallan(challan.id);

            if (!fresh) {
                toast.error('Failed to load challan');

                return;
            }

            printChallans([fresh]);
        } catch {
            toast.error('Failed to load challan');
        }
    };

    const printSelected = async () => {
        try {
            const loaded: Challan[] = [];

            for (const id of selectedIds) {
                const challan = await fetchChallan(id);

                if (challan) {
                    loaded.push(challan);
                }
            }

            if (loaded.length === 0) {
                toast.error('Failed to load challans');

                return;
            }

            printChallans(loaded);
            setSelectedIds(new Set());
        } catch {
            toast.error('Failed to print challans');
        }
    };

    const toggleSelect = (id: number) =>
        setSelectedIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });

    const toggleSelectAll = () =>
        setSelectedIds(
            selectedIds.size === list.challans.length
                ? new Set()
                : new Set(list.challans.map((c) => c.id)),
        );

    return (
        <>
            <Head title="Challans" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <Truck className="size-5 text-foreground/80" />
                        </div>
                        <Heading
                            variant="small"
                            title="Challans"
                            description="Manage delivery challans"
                        />
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-1.5 size-4" />
                        New Challan
                    </Button>
                </div>

                <ChallanFilters
                    parties={parties}
                    status={list.status}
                    onStatusChange={list.setStatus}
                    search={list.search}
                    onSearchChange={list.setSearch}
                    partyId={list.partyId}
                    onPartyChange={list.setPartyId}
                    total={list.total}
                />

                <ChallanBulkBar
                    count={selectedIds.size}
                    onPrint={printSelected}
                    onStatusChange={bulkChangeStatus}
                    onClear={() => setSelectedIds(new Set())}
                />

                <ChallanTable
                    challans={list.challans}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    onView={openView}
                    onPrint={printOne}
                    onEdit={openEdit}
                    onDelete={setDeleting}
                    onStatusChange={changeStatus}
                />

                <TablePagination
                    page={list.page}
                    perPage={list.perPage}
                    total={list.total}
                    onPageChange={list.setPage}
                    onPerPageChange={list.setPerPage}
                />
            </div>

            <Dialog
                open={formMode !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <ChallanForm
                        title={
                            formMode === 'edit' ? 'Edit Challan' : 'New Challan'
                        }
                        submitLabel={
                            formMode === 'edit'
                                ? 'Save Changes'
                                : 'Create Challan'
                        }
                        form={form}
                        parties={parties}
                        processing={processing}
                        onSubmit={handleSubmit}
                        onCancel={closeForm}
                    />
                </DialogContent>
            </Dialog>

            <ChallanViewDialog
                open={viewing !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewing(null);
                    }
                }}
                challan={viewing}
            />

            <ConfirmDeleteDialog
                open={deleting !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleting(null);
                    }
                }}
                title="Delete Challan"
                itemLabel={deleting?.challan_number}
                confirmLabel="Delete Challan"
                processing={processing}
                onConfirm={handleDelete}
            />
        </>
    );
}
