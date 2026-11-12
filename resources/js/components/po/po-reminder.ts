import type { Product } from '@/components/po/types';

const pad2 = (n: number): string => String(n).padStart(2, '0');

function parseDate(value?: string | null): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Convert an ISO timestamp to the `YYYY-MM-DDTHH:mm` value a
 * `datetime-local` input expects (local time).
 */
export function toDatetimeLocal(value?: string | null): string {
    const d = parseDate(value);

    if (!d) {
        return '';
    }

    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Format an ISO timestamp as `DD/MM/YYYY HH:mm` (local time).
 */
export function formatDateTime(value?: string | null): string {
    const d = parseDate(value);

    if (!d) {
        return '';
    }

    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Link that opens Google Calendar with a one-hour event for the PO reminder.
 */
export function googleCalendarUrl(product: Product): string {
    const start = parseDate(product.reminder_at);

    if (!start) {
        return '';
    }

    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const toUtc = (d: Date) =>
        `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}00Z`;

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `PO ${product.code} - ${product.name}`,
        dates: `${toUtc(start)}/${toUtc(end)}`,
        details: `Reminder for purchase order ${product.code} (${product.name}).`,
        location: product.party_name || '',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Badge text and colours for a PO's reminder column.
 */
export function reminderStatus(
    product: Product,
    now: number,
): { label: string; className: string } {
    if (product.reminder_notified_at) {
        return {
            label: 'Notified',
            className: 'border-slate-200 bg-slate-50 text-slate-600',
        };
    }

    const isDue = new Date(product.reminder_at as string).getTime() <= now;

    return isDue
        ? {
              label: 'Overdue',
              className: 'border-red-200 bg-red-50 text-red-700',
          }
        : {
              label: formatDateTime(product.reminder_at),
              className: 'border-blue-200 bg-blue-50 text-blue-700',
          };
}
