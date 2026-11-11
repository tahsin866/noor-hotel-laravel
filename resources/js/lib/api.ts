export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiPayload<T = unknown> = {
    message?: string;
    errors?: Record<string, string>;
    data?: T;
};

export type ApiResult<T = unknown> = {
    ok: boolean;
    status: number;
    body: ApiPayload<T>;
};

/**
 * Send a JSON request to the app's API with the headers every page uses.
 * Network failures still throw, so callers keep their own catch block.
 */
export async function apiRequest<T = unknown>(
    url: string,
    options: { method?: HttpMethod; body?: unknown } = {},
): Promise<ApiResult<T>> {
    const headers: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest',
    };

    if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body:
            options.body !== undefined
                ? JSON.stringify(options.body)
                : undefined,
    });

    const body = (await response.json().catch(() => ({}))) as ApiPayload<T>;

    return { ok: response.ok, status: response.status, body };
}
