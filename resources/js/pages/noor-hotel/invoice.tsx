import { Head } from '@inertiajs/react';
import { FileDown, Plus, Printer, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Heading from '@/components/heading';
import { exportInvoicesToExcel } from '@/components/invoices/invoice-export';
import InvoiceFilters from '@/components/invoices/invoice-filters';
import InvoiceForm from '@/components/invoices/invoice-form';
import { printInvoices } from '@/components/invoices/invoice-print';
import {
    formatTaka,
    invoiceStatusColors,
    invoiceStatusLabel,
} from '@/components/invoices/invoice-status';
import InvoiceTable from '@/components/invoices/invoice-table';
import InvoiceViewDialog from '@/components/invoices/invoice-view-dialog';
import type {
    Invoice,
    Party,
    Product,
    SelectableChallan,
} from '@/components/invoices/types';
import { useInvoiceForm } from '@/components/invoices/use-invoice-form';
import { useInvoiceList } from '@/components/invoices/use-invoice-list';
import ConfirmDeleteDialog from '@/components/shared/confirm-delete-dialog';
import StatusBadge from '@/components/shared/status-badge';
import TablePagination from '@/components/shared/table-pagination';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/api';

async function fetchInvoice(id: number): Promise<Invoice | null> {
    const { body } = await apiRequest<Invoice>(`/api/invoices/${id}`);

    return body.data ?? null;
}

export default function Invoices({
    parties,
    products,
    challans,
    focusInvoice = null,
}: {
    parties: Party[];
    products: Product[];
    challans: SelectableChallan[];
    focusInvoice?: { id: number; invoice_number: string } | null;
}) {
    const list = useInvoiceList(focusInvoice?.invoice_number ?? '');
    const form = useInvoiceForm({ parties, products, challans });

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Invoice | null>(null);
    const [viewing, setViewing] = useState<Invoice | null>(null);
    const [deleting, setDeleting] = useState<Invoice | null>(null);
    const [processing, setProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const closeForm = () => {
        setFormOpen(false);
        setEditing(null);
        form.reset();
    };

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const openEdit = async (invoice: Invoice) => {
        try {
            const fresh = await fetchInvoice(invoice.id);

            if (!fresh) {
                toast.error('Failed to load invoice');

                return;
            }

            setEditing(fresh);
            form.fillFromInvoice(fresh);
            setFormOpen(true);
        } catch {
            toast.error('Failed to load invoice');
        }
    };

    const openView = async (id: number) => {
        try {
            setViewing(await fetchInvoice(id));
        } catch {
            toast.error('Failed to load invoice');
        }
    };

    /** Open the linked invoice once, when arriving from another page. */
    const focusInvoiceId = focusInvoice?.id;

    useEffect(() => {
        if (!focusInvoiceId) {
            return;
        }

        let isCurrent = true;

        fetchInvoice(focusInvoiceId)
            .then((invoice) => {
                if (isCurrent) {
                    setViewing(invoice);
                }
            })
            .catch(() => toast.error('Failed to load invoice'));

        return () => {
            isCurrent = false;
        };
    }, [focusInvoiceId]);

    const handleSave = async () => {
        if (!form.isComplete) {
            toast.error(
                'Fill all required fields and select at least one challan',
            );

            return;
        }

        setProcessing(true);

        try {
            const { ok, body } = await apiRequest(
                editing ? `/api/invoices/${editing.id}` : '/api/invoices',
                {
                    method: editing ? 'PUT' : 'POST',
                    body: form.toPayload(),
                },
            );

            if (ok) {
                toast.success(
                    body.message ||
                        (editing ? 'Invoice updated' : 'Invoice created'),
                );
                closeForm();
                list.refresh();
            } else {
                toast.error(body.message || 'Something went wrong');
            }
        } catch {
            toast.error('Something went wrong');
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
                `/api/invoices/${deleting.id}`,
                { method: 'DELETE' },
            );

            if (ok) {
                toast.success(body.message || 'Invoice deleted');
                setDeleting(null);
                list.refresh();
            } else {
                toast.error(body.message || 'Failed to delete invoice');
            }
        } catch {
            toast.error('Failed to delete invoice');
        } finally {
            setProcessing(false);
        }
    };

    const markPrinted = async (ids: number[]) => {
        try {
            await Promise.all(
                ids.map((id) =>
                    apiRequest(`/api/invoices/${id}/mark-printed`, {
                        method: 'POST',
                    }),
                ),
            );
            list.refresh();
        } catch {
            toast.error('Failed to update print status');
        }
    };

    /** Load full invoices (with items), open the print dialog, mark printed. */
    const printByIds = async (ids: number[]) => {
        try {
            const loaded = (await Promise.all(ids.map(fetchInvoice))).filter(
                (invoice): invoice is Invoice => invoice !== null,
            );

            if (loaded.length === 0) {
                toast.error('Failed to load invoice');

                return;
            }

            printInvoices(loaded);
            markPrinted(loaded.map((invoice) => invoice.id));
        } catch {
            toast.error(
                ids.length > 1
                    ? 'Failed to print invoices'
                    : 'Failed to load invoice',
            );
        }
    };

    const printSelected = () => {
        if (selectedIds.length === 0) {
            toast.error('Select at least one invoice');

            return;
        }

        printByIds(selectedIds);
    };

    const toggleSelect = (id: number) =>
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        );

    const toggleSelectAll = () =>
        setSelectedIds(
            selectedIds.length === list.invoices.length
                ? []
                : list.invoices.map((invoice) => invoice.id),
        );

    return (
        <>
            <Head title="Invoices" />
            <div className="flex h-full flex-1 flex-col gap-5 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 pb-4 dark:border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50">
                            <Receipt className="size-5 text-foreground/80" />
                        </div>
                        <Heading
                            variant="small"
                            title="Invoices"
                            description="Manage invoices"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && (
                            <Button
                                onClick={printSelected}
                                className="bg-purple-500 hover:bg-purple-600"
                            >
                                <Printer className="mr-1.5 size-4" />
                                Print Selected ({selectedIds.length})
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => exportInvoicesToExcel(list.invoices)}
                        >
                            <FileDown className="mr-1.5 size-4" />
                            Export Excel
                        </Button>
                        <Button onClick={openCreate}>
                            <Plus className="mr-1.5 size-4" />
                            New Invoice
                        </Button>
                    </div>
                </div>

                <InvoiceFilters
                    parties={parties}
                    filters={list.filters}
                    onChange={list.setFilter}
                    onClear={list.clearFilters}
                    total={list.total}
                />

                <InvoiceTable
                    invoices={list.invoices}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    onView={(invoice) => openView(invoice.id)}
                    onEdit={openEdit}
                    onPrint={(invoice) => printByIds([invoice.id])}
                    onDelete={setDeleting}
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
                open={formOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <InvoiceForm
                        isEditing={editing !== null}
                        form={form}
                        parties={parties}
                        processing={processing}
                        onSubmit={handleSave}
                        onCancel={closeForm}
                    />
                </DialogContent>
            </Dialog>

            <InvoiceViewDialog
                open={viewing !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewing(null);
                    }
                }}
                invoice={viewing}
                onPrint={(invoice) => printByIds([invoice.id])}
            />

            <ConfirmDeleteDialog
                open={deleting !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleting(null);
                    }
                }}
                title="Delete Invoice"
                itemLabel={deleting?.invoice_number}
                confirmLabel="Delete Invoice"
                processing={processing}
                onConfirm={handleDelete}
            >
                {deleting && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-semibold">
                                {deleting.invoice_number}
                            </span>
                            <StatusBadge
                                status={deleting.status}
                                label={invoiceStatusLabel(deleting.status)}
                                colors={invoiceStatusColors}
                                bordered={false}
                            />
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            <span>{deleting.party_name || '—'}</span>
                            <span className="mx-2">|</span>
                            <span>Tk {formatTaka(deleting.total_amount)}</span>
                        </div>
                    </div>
                )}
            </ConfirmDeleteDialog>
        </>
    );
}
