import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Challan } from '@/components/challans/types';
import { apiRequest } from '@/lib/api';

type ChallanListQuery = {
    page: number;
    perPage: number;
    status: string;
    search: string;
    partyId: string;
};

async function loadChallans(
    query: ChallanListQuery,
): Promise<{ items: Challan[]; total: number }> {
    const params = new URLSearchParams({
        page: String(query.page),
        limit: String(query.perPage),
    });

    if (query.status !== 'all') {
        params.set('status', query.status);
    }

    if (query.search) {
        params.set('search', query.search);
    }

    if (query.partyId) {
        params.set('party_id', query.partyId);
    }

    const { body } = await apiRequest<{ items: Challan[]; total: number }>(
        `/api/challans?${params.toString()}`,
    );

    return { items: body.data?.items || [], total: body.data?.total || 0 };
}

/**
 * Server-side paginated challan list with status / search / party filters.
 * Changing any filter jumps back to page 1.
 */
export function useChallanList() {
    const [challans, setChallans] = useState<Challan[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [perPage, setPerPageState] = useState(10);
    const [status, setStatusState] = useState('all');
    const [search, setSearchState] = useState('');
    const [partyId, setPartyIdState] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let isCurrent = true;

        loadChallans({ page, perPage, status, search, partyId })
            .then((result) => {
                if (isCurrent) {
                    setChallans(result.items);
                    setTotal(result.total);
                }
            })
            .catch(() => toast.error('Failed to load challans'));

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
        challans,
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
        /** Re-fetch the current page (after create/update/delete). */
        refresh: () => setReloadKey((key) => key + 1),
    };
}
