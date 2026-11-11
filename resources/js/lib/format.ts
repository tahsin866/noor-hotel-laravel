/**
 * Format a money value with two decimals (no currency symbol).
 */
export function formatAmount(
    value: number | string | null | undefined,
): string {
    return Number(value || 0).toFixed(2);
}

/**
 * Format a `YYYY-MM-DD…` string as `DD/MM/YYYY` without timezone shifts.
 */
export function formatDate(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

    if (match) {
        const [, year, month, day] = match;

        return `${day}/${month}/${year}`;
    }

    return new Date(value).toLocaleDateString('en-GB');
}
