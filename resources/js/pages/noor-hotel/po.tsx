import { Head } from '@inertiajs/react';
import { ClipboardList, FileDown, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Heading from '@/components/heading';
import { fetchProduct, saveProduct } from '@/components/po/po-api';
import PoChallanDialog from '@/components/po/po-challan-dialog';
import {
    emailPurchaseOrder,
    exportPurchaseOrdersToExcel,
} from '@/components/po/po-export';
import PoFilters from '@/components/po/po-filters';
import PoForm from '@/components/po/po-form';
import { printPurchaseOrder } from '@/components/po/po-print';
import PoTable from '@/components/po/po-table';
import PoViewDialog from '@/components/po/po-view-dialog';
import type { SummaryChallanData } from '@/components/po/summary-challan';
import SummaryChallanDialog from '@/components/po/summary-challan-dialog';
import type { Party, Product } from '@/components/po/types';
import { usePoForm } from '@/components/po/use-po-form';
import { usePoList } from '@/components/po/use-po-list';
import ConfirmDeleteDialog from '@/components/shared/confirm-delete-dialog';
import TablePagination from '@/components/shared/table-pagination';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/api';

const SOMETHING_WENT_WRONG = 'Something went wrong.';

export default function PurchaseOrders({
    parties,
    focusPo = null,
}: {
    parties: Party[];
    focusPo?: { id: number; code: string } | null;
}) {
    const list = usePoList(focusPo?.code ?? '');
    const form = usePoForm();

    const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
    const [editing, setEditing] = useState<Product | null>(null);
    const [viewing, setViewing] = useState<Product | null>(null);
    const [deleting, setDeleting] = useState<Product | null>(null);
    const [challanFor, setChallanFor] = useState<Product | null>(null);
    const [summaryData, setSummaryData] = useState<SummaryChallanData | null>(
        null,
    );
    const [processing, setProcessing] = useState(false);

    const closeForm = () => {
        setFormMode(null);
        setEditing(null);
        form.reset();
    };

    const openCreate = () => {
        form.reset();
        setFormMode('create');
    };

    const openEdit = async (product: Product) => {
        try {
            const fresh = await fetchProduct(product.id);
            setEditing(fresh);
            form.fillFromProduct(fresh);
            setFormMode('edit');
        } catch {
            toast.error('Failed to load product');
        }
    };

    const openView = (product: Pick<Product, 'id'>) =>
        fetchProduct(product.id)
            .then(setViewing)
            .catch(() => toast.error('Failed to load product'));

    const focusPoId = focusPo?.id;

    /** Open the linked PO once, when arriving from another page. */
    useEffect(() => {
        if (focusPoId) {
            fetchProduct(focusPoId)
                .then(setViewing)
                .catch(() => toast.error('Failed to load product'));
        }
    }, [focusPoId]);

    const printOne = async (product: Product) => {
        try {
            printPurchaseOrder(await fetchProduct(product.id));
        } catch {
            toast.error('Failed to load product');
        }
    };

    const openSummaryChallans = async (product: Product) => {
        try {
            const { body } = await apiRequest<SummaryChallanData>(
                `/api/products/${product.id}/summary-challan`,
            );

            if (!body.data) {
                toast.error('Failed to load summary challan');

                return;
            }

            setSummaryData(body.data);
        } catch {
            toast.error('Failed to load summary challan');
        }
    };

    const handleSubmit = async () => {
        const isEdit = formMode === 'edit';

        if (isEdit && !editing) {
            return;
        }

        setProcessing(true);
        form.setErrors({});

        try {
            const { ok, status, body } = await saveProduct(
                form.toFormData(),
                isEdit ? editing!.id : undefined,
            );

            if (ok) {
                toast.success(body.message);
                closeForm();
                list.refresh();
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
                `/api/products/${deleting.id}`,
                { method: 'DELETE' },
            );

            if (ok) {
                toast.success(body.message);
                setDeleting(null);

                if (list.products.length === 1 && list.page > 1) {
                    list.setPage(list.page - 1);
                } else {
                    list.refresh();
                }
            } else {
                toast.error(body.message || SOMETHING_WENT_WRONG);
            }
        } catch {
            toast.error(SOMETHING_WENT_WRONG);
        } finally {
            setProcessing(false);
        }
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
                        <Button
                            variant="outline"
                            onClick={() =>
                                exportPurchaseOrdersToExcel(list.products)
                            }
                        >
                            <FileDown className="mr-1.5 size-4" />
                            Export Excel
                        </Button>
                        <Button onClick={openCreate}>
                            <Plus className="mr-1.5 size-4" />
                            New Purchase Order
                        </Button>
                    </div>
                </div>

                <PoFilters
                    parties={parties}
                    status={list.status}
                    onStatusChange={list.setStatus}
                    search={list.search}
                    onSearchChange={list.setSearch}
                    partyId={list.partyId}
                    onPartyChange={list.setPartyId}
                    onClear={list.clearFilters}
                    total={list.total}
                />

                <PoTable
                    products={list.products}
                    onView={openView}
                    onEdit={openEdit}
                    onPrint={printOne}
                    onEmail={emailPurchaseOrder}
                    onCreateChallan={setChallanFor}
                    onSummaryChallans={openSummaryChallans}
                    onDelete={setDeleting}
                />

                {list.total > 0 && (
                    <TablePagination
                        page={list.page}
                        perPage={list.perPage}
                        total={list.total}
                        onPageChange={list.setPage}
                        onPerPageChange={list.setPerPage}
                    />
                )}
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
                    <PoForm
                        title={
                            formMode === 'edit'
                                ? 'Edit Purchase Order'
                                : 'New Purchase Order'
                        }
                        submitLabel={
                            formMode === 'edit'
                                ? 'Save Changes'
                                : 'Create Order'
                        }
                        form={form}
                        parties={parties}
                        processing={processing}
                        onSubmit={handleSubmit}
                        onCancel={closeForm}
                    />
                </DialogContent>
            </Dialog>

            <PoViewDialog
                open={viewing !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewing(null);
                    }
                }}
                product={viewing}
            />

            <PoChallanDialog
                product={challanFor}
                onClose={() => setChallanFor(null)}
                onCreated={list.refresh}
            />

            <ConfirmDeleteDialog
                open={deleting !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleting(null);
                    }
                }}
                title="Delete Purchase Order"
                itemLabel={
                    deleting ? `${deleting.name} (${deleting.code})` : undefined
                }
                confirmLabel="Delete Order"
                processing={processing}
                onConfirm={handleDelete}
            />

            <SummaryChallanDialog
                data={summaryData}
                onOpenChange={(open) => {
                    if (!open) {
                        setSummaryData(null);
                    }
                }}
            />
        </>
    );
}
