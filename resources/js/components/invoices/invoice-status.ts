export const invoiceStatusFilters: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Waiting for Payment' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
];

export const invoiceStatusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    pending: 'bg-amber-100 text-amber-700',
    partial: 'bg-amber-100 text-amber-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-red-100 text-red-700',
};

export const invoiceStatusLabels: Record<string, string> = {
    draft: 'Draft',
    pending: 'Waiting for Payment',
    partial: 'Partial',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
};

export const printStatusColors: Record<string, string> = {
    printed: 'bg-green-100 text-green-700',
    unprinted: 'bg-slate-100 text-slate-600',
};

export function invoiceStatusLabel(status: string): string {
    return invoiceStatusLabels[status] || status;
}

/** Whole-taka amount with thousands separators, as used on the invoice list. */
export function formatTaka(value: number | string | null | undefined): string {
    return Math.round(parseFloat(String(value || 0))).toLocaleString('en-US');
}
