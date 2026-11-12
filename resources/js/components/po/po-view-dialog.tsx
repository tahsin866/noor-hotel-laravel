import {
    Building2,
    Calendar,
    CalendarClock,
    FileText,
    Paperclip,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDateTime, googleCalendarUrl } from '@/components/po/po-reminder';
import { netRemainingOf } from '@/components/po/po-status';
import type { Product } from '@/components/po/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const fieldLabelClass =
    'block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase';

const linkButtonClass =
    'inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:bg-accent';

const mealHeadClass =
    'px-3 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase';

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
    return (
        <div>
            <span className={fieldLabelClass}>{label}</span>
            {children}
        </div>
    );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="border-t border-border p-4">
            <span className={`mb-1.5 ${fieldLabelClass}`}>{label}</span>
            {children}
        </div>
    );
}

function PoMealsTable({ product }: { product: Product }) {
    const meals = product.meals;
    const netRemaining = netRemainingOf(product);
    const totalOrdered = meals.reduce((sum, meal) => sum + meal.quantity, 0);
    const totalDelivered = meals.reduce(
        (sum, meal) => sum + (meal.delivered_quantity || 0),
        0,
    );

    return (
        <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className={`${mealHeadClass} text-left`}>Type</th>
                        <th className={`${mealHeadClass} text-right`}>
                            Ordered
                        </th>
                        <th className={`${mealHeadClass} text-right`}>
                            Unit Price
                        </th>
                        <th className={`${mealHeadClass} text-right`}>
                            Amount
                        </th>
                        <th className={`${mealHeadClass} text-right`}>
                            Delivered
                        </th>
                        <th className={`${mealHeadClass} text-right`}>
                            Remaining
                        </th>
                        <th className={`${mealHeadClass} text-left`}>
                            Description
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {meals.map((meal, i) => {
                        const remaining = meal.remaining ?? 0;
                        const overDelivered = meal.over_delivered ?? 0;

                        return (
                            <tr
                                key={i}
                                className="border-t border-border first:border-t-0"
                            >
                                <td className="px-3 py-2 text-xs capitalize">
                                    {meal.meal_type}
                                </td>
                                <td className="px-3 py-2 text-right text-xs tabular-nums">
                                    {meal.quantity}
                                </td>
                                <td className="px-3 py-2 text-right text-xs tabular-nums">
                                    Tk {meal.unit_price}
                                </td>
                                <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">
                                    Tk{' '}
                                    {(meal.quantity * meal.unit_price).toFixed(
                                        2,
                                    )}
                                </td>
                                <td className="px-3 py-2 text-right text-xs font-medium text-emerald-600 tabular-nums">
                                    {meal.delivered_quantity || 0}
                                </td>
                                <td
                                    className={`px-3 py-2 text-right text-xs tabular-nums ${remaining > 0 ? 'font-medium text-red-600' : overDelivered > 0 ? 'font-medium text-amber-600' : 'text-muted-foreground'}`}
                                    title={
                                        overDelivered > 0
                                            ? 'Delivered more than ordered'
                                            : undefined
                                    }
                                >
                                    {overDelivered > 0
                                        ? `-${overDelivered}`
                                        : remaining}
                                </td>
                                <td className="max-w-[180px] px-3 py-2 text-xs break-words text-muted-foreground">
                                    {meal.description || '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">
                    {meals.length} item{meals.length === 1 ? '' : 's'} ·{' '}
                    {totalOrdered} ordered · {totalDelivered} delivered
                </span>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span
                        className={
                            netRemaining > 0
                                ? 'font-medium text-red-600'
                                : netRemaining < 0
                                  ? 'font-medium text-amber-600'
                                  : 'text-emerald-600'
                        }
                    >
                        {netRemaining > 0
                            ? `${netRemaining} remaining`
                            : netRemaining < 0
                              ? `${Math.abs(netRemaining)} over-delivered`
                              : 'Fully delivered'}
                    </span>
                    <span className="text-sm font-bold tabular-nums">
                        Subtotal: Tk {(product.meals_subtotal || 0).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}

type PoViewDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
};

/**
 * Read-only purchase order details with its order lines.
 */
export default function PoViewDialog({
    open,
    onOpenChange,
    product,
}: PoViewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader className="space-y-1 border-b border-border pb-4">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <FileText className="size-4.5 text-muted-foreground" />
                        Purchase Order Details
                    </DialogTitle>
                </DialogHeader>
                {product && (
                    <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
                        <div className="rounded-lg border border-border">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4 md:grid-cols-3">
                                <Field label="Code">
                                    <span className="font-mono text-sm">
                                        {product.code}
                                    </span>
                                </Field>
                                <Field label="Name">
                                    <span className="text-sm font-medium">
                                        {product.name}
                                    </span>
                                </Field>
                                <Field label="Customer PO">
                                    <span className="text-sm">
                                        {product.customer_po_number || '—'}
                                    </span>
                                </Field>
                                <div>
                                    <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        <Building2 className="size-3" /> Party
                                    </span>
                                    <span className="text-sm">
                                        {product.party_name || '—'}
                                    </span>
                                </div>
                                <Field label="Unit">
                                    <span className="text-sm">
                                        {product.unit}
                                    </span>
                                </Field>
                                <Field label="VAT Rate">
                                    <span className="text-sm">
                                        {product.vat_rate}%
                                    </span>
                                </Field>
                            </div>
                            {product.description && (
                                <Section label="Description">
                                    <p className="text-sm text-foreground/90">
                                        {product.description}
                                    </p>
                                </Section>
                            )}
                            {product.attachment_url && (
                                <Section label="Attachment">
                                    <a
                                        href={product.attachment_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={linkButtonClass}
                                    >
                                        <Paperclip className="size-3.5" />
                                        Open attachment
                                    </a>
                                </Section>
                            )}
                            {product.reminder_at && (
                                <Section label="Reminder">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="inline-flex items-center gap-1.5 text-sm text-foreground/90">
                                            <CalendarClock className="size-3.5 text-muted-foreground" />
                                            {formatDateTime(
                                                product.reminder_at,
                                            )}
                                        </span>
                                        <a
                                            href={googleCalendarUrl(product)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={linkButtonClass}
                                        >
                                            <Calendar className="size-3.5" />
                                            Add to Google Calendar
                                        </a>
                                    </div>
                                </Section>
                            )}
                        </div>

                        {product.meals?.length > 0 && (
                            <PoMealsTable product={product} />
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
