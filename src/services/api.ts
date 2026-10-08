/** Browser traffic is restricted to this app's authenticated backend. */
export const SESSION_EXPIRED_EVENT = 'poki-session-expired';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    if (!path.startsWith('/api/') || /[\\?#]/.test(path) || !new URL(path, window.location.origin).pathname.startsWith('/api/')) {
        throw new Error('Only same-origin API paths are allowed');
    }
    const response = await fetch(path, {
        ...options,
        credentials: 'same-origin',
        redirect: 'error',
        cache: 'no-store',
    });
    if (response.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    return response;
}
