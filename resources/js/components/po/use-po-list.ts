import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fetchProducts } from '@/components/po/po-api';
import type { Product } from '@/components/po/types';

/**
 * Server-side paginated PO list with status / search / party filters.
 * Changing any filter jumps back to page 1.
 */
export function usePoList(initialSearch = '') {
    const [products, setProducts] = useState<Product[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [perPage, setPerPageState] = useState(10);
    const [status, setStatusState] = useState('all');
    const [search, setSearchState] = useState(initialSearch);
    const [partyId, setPartyIdState] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let isCurrent = true;

        fetchProducts({ page, perPage, status, search, partyId })
            .then((result) => {
                if (isCurrent) {
                    setProducts(result.items);
                    setTotal(result.total);
                }
            })
            .catch(() => toast.error('Failed to load purchase orders'));

        return () => {
            isCurrent = false;
        };
    }, [page, perPage, status, search, partyId, reloadKey]);

    const withFirstPage =
        <T>(setter: (value: T) => void) =>
        (value: T) => {
            setter(value);
            setPage(1);
        };

    return {
        products,
        total,
        page,
        setPage,
        perPage,
        setPerPage: withFirstPage(setPerPageState),
        status,
        setStatus: withFirstPage(setStatusState),
        search,
        setSearch: withFirstPage(setSearchState),
        partyId,
        setPartyId: withFirstPage(setPartyIdState),
        /** Reset every filter and go back to page 1. */
        clearFilters: () => {
            setStatusState('all');
            setSearchState('');
            setPartyIdState('');
            setPage(1);
        },
        /** Re-fetch the current page (after create/update/delete). */
        refresh: () => setReloadKey((key) => key + 1),
    };
}
