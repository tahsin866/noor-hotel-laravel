import type { Product } from '@/components/po/types';

const headers = { 'X-Requested-With': 'XMLHttpRequest' };

type ProductApiBody = {
    message?: string;
    errors?: Record<string, string>;
    product?: Product;
};

export type ProductApiResult = {
    ok: boolean;
    status: number;
    body: ProductApiBody;
};

/**
 * Load one PO with its meals (the products API returns the resource unwrapped).
 */
export async function fetchProduct(id: number): Promise<Product> {
    const response = await fetch(`/api/products/${id}`, { headers });

    return (await response.json()) as Product;
}

export type ProductListQuery = {
    page: number;
    perPage: number;
    status: string;
    search: string;
    partyId: string;
};

export async function fetchProducts(
    query: ProductListQuery,
): Promise<{ items: Product[]; total: number }> {
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

    if (query.search.trim()) {
        params.set('search', query.search.trim());
    }

    const response = await fetch(`/api/products?${params.toString()}`, {
        headers,
    });
    const data = await response.json();

    return { items: data.items || [], total: data.total || 0 };
}

/**
 * Create (no id) or update a PO. Sent as multipart so the attachment uploads.
 */
export async function saveProduct(
    formData: FormData,
    id?: number,
): Promise<ProductApiResult> {
    const response = await fetch(id ? `/api/products/${id}` : '/api/products', {
        method: id ? 'PUT' : 'POST',
        headers,
        body: formData,
    });
    const body = (await response.json().catch(() => ({}))) as ProductApiBody;

    return { ok: response.ok, status: response.status, body };
}
