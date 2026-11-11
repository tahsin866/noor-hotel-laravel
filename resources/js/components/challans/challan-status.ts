import type { ChallanStatus } from '@/components/challans/types';

export const challanStatusFilters: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'dispatched', label: 'Dispatched' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
];

export const challanStatusColors: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-700 border-blue-200',
    dispatched: 'bg-amber-100 text-amber-700 border-amber-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};

/** Fallback toast text when the server does not send a message. */
export const challanStatusMessages: Record<ChallanStatus, string> = {
    pending: 'Challan returned to pending',
    dispatched: 'Challan dispatched',
    delivered: 'Challan delivered',
    cancelled: 'Challan cancelled',
};
