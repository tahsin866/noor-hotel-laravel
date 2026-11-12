import type { Product } from '@/components/po/types';

export const poStatusFilters = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Waiting for Challan' },
    { value: 'waiting', label: 'Waiting for Invoice' },
    { value: 'delivered', label: 'Delivered' },
];

export type DeliveryStatus = {
    label: string;
    /** Background class for the dot and progress bar. */
    dot: string;
    /** Badge colour classes. */
    color: string;
};

/**
 * Where a PO stands: no items, waiting for a challan, waiting for an
 * invoice, or delivered (at least one challan has been invoiced).
 */
export function getDeliveryStatus(product: Product): DeliveryStatus {
    if ((product.total_ordered || 0) === 0) {
        return {
            label: 'No Items',
            dot: 'bg-slate-400',
            color: 'bg-slate-50 text-slate-600 border-slate-200',
        };
    }

    if ((product.invoiced_challans_count || 0) > 0) {
        return {
            label: 'Delivered',
            dot: 'bg-emerald-500',
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
    }

    if ((product.challans_count || 0) > 0) {
        return {
            label: 'Waiting for Invoice',
            dot: 'bg-amber-500',
            color: 'bg-amber-50 text-amber-700 border-amber-200',
        };
    }

    return {
        label: 'Waiting for Challan',
        dot: 'bg-blue-500',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
    };
}

/**
 * Net units still owed on a PO: remaining minus over-delivered.
 * Positive = still to deliver, negative = over-delivered.
 */
export function netRemainingOf(product: Product): number {
    const meals = product.meals ?? [];
    const remaining =
        product.total_remaining ??
        meals.reduce((sum, meal) => sum + (meal.remaining ?? 0), 0);
    const overDelivered =
        product.total_over_delivered ??
        meals.reduce((sum, meal) => sum + (meal.over_delivered ?? 0), 0);

    return remaining - overDelivered;
}
