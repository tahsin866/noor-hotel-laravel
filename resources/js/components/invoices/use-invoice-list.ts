import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Invoice } from '@/components/invoices/types';
import { apiRequest } from '@/lib/api';

export type InvoiceListFilters = {
    status: string;
    partyId: string;
    dateFrom: string;
    dateTo: string;
    search: string;
};

async function loadInvoices(
    query: InvoiceListFilters & { page: number; perPage: number },
): Promise<{ items: Invoice[]; total: number }> {
    const params = new URLSearchParams({
        page: String(query.page),
        limit: String(query.perPage),
    });

    if (query.status !== 'all') {
        params.set('status', query.status);
    }

    if (query.partyId) {
        params.set('party_id', query.partyId);
    }

    if (query.dateFrom) {
        params.set('date_from', query.dateFrom);
    }

    if (query.dateTo) {
        params.set('date_to', query.dateTo);
    }

    if (query.search) {
        params.set('search', query.search);
    }

    const { body } = await apiRequest<{ items: Invoice[]; total: number }>(
        `/api/invoices?${params.toString()}`,
    );

    return { items: body.data?.items || [], total: body.data?.total || 0 };
}

/**
 * Server-side paginated invoice list. Changing a filter jumps back to page 1.
 */
export function useInvoiceList(initialSearch = '') {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [perPage, setPerPageState] = useState(10);
    const [filters, setFiltersState] = useState<InvoiceListFilters>({
        status: 'all',
        partyId: '',
        dateFrom: '',
        dateTo: '',
        search: initialSearch,
    });
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let isCurrent = true;

        loadInvoices({ ...filters, page, perPage })
            .then((result) => {
                if (isCurrent) {
                    setInvoices(result.items);
                    setTotal(result.total);
                }
            })
            .catch(() => toast.error('Failed to load invoices'));

        return () => {
            isCurrent = false;
        };
    }, [filters, page, perPage, reloadKey]);

    const setFilter = <K extends keyof InvoiceListFilters>(
        key: K,
        value: InvoiceListFilters[K],
    ) => {
        setFiltersState((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    /** Clear party, dates and search (the status tab is kept). */
    const clearFilters = () => {
        setFiltersState((prev) => ({
            ...prev,
            partyId: '',
            dateFrom: '',
            dateTo: '',
            search: '',
        }));
        setPage(1);
    };

    return {
        invoices,
        total,
        page,
        setPage,
        perPage,
        setPerPage: (value: number) => {
            setPerPageState(value);
            setPage(1);
        },
        filters,
        setFilter,
        clearFilters,
        /** Re-fetch the current page (after create/update/delete/print). */
        refresh: () => setReloadKey((key) => key + 1),
    };
}
