import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../AuthContext';
import { useAuth } from '../useAuth';
import { SESSION_EXPIRED_EVENT } from '../../services/api';

function Probe() {
    const { user, loading, signIn, signOut, error } = useAuth();
    return <div>
        <p>{loading ? 'checking' : user?.name || 'signed out'}</p>
        {error && <p role="alert">{error}</p>}
        <button onClick={() => void signIn('synthetic-password-only-for-tests').catch(() => {})}>Sign in</button>
        <button onClick={() => void signOut()}>Sign out</button>
    </div>;
}
const authenticated = () => new Response(JSON.stringify({ authenticated: true, user: { id: 'synthetic-owner', name: 'Synthetic Owner' } }));
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('server-backed UI authentication', () => {
    it('ignores forged browser auth and waits for a server session', async () => {
        localStorage.setItem('job_os_auth', JSON.stringify({ id: 'forged', name: 'Forged Owner' }));
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
        render(<AuthProvider><Probe /></AuthProvider>);
        expect(screen.queryByText('Forged Owner')).toBeNull();
        await screen.findByText('signed out');
        expect(localStorage.getItem('job_os_auth')).toBeNull();
    });
    it('accepts verified server identity and revokes UI access on expiry', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(authenticated()));
        render(<AuthProvider><Probe /></AuthProvider>);
        await screen.findByText('Synthetic Owner');
        act(() => { window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)); });
        await screen.findByText('signed out');
    });
    it('never persists the local login password or session in browser storage', async () => {
        const fetch = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 401 }))
            .mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(authenticated())
            .mockResolvedValueOnce(new Response('{}'));
        vi.stubGlobal('fetch', fetch);
        render(<AuthProvider><Probe /></AuthProvider>);
        await screen.findByText('signed out');
        fireEvent.click(screen.getByText('Sign in'));
        await screen.findByText('Synthetic Owner');
        expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ body: JSON.stringify({ password: 'synthetic-password-only-for-tests' }) }));
        const storedValues = Array.from({ length: localStorage.length }, (_, index) => localStorage.getItem(localStorage.key(index)!)).join(' ');
        expect(storedValues).not.toContain('synthetic-password-only-for-tests');
        expect(localStorage.getItem('job_os_auth')).toBeNull();
        fireEvent.click(screen.getByText('Sign out'));
        await screen.findByText('signed out');
        await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' })));
    });
    it('fails closed if the server is unreachable', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('synthetic offline server')));
        render(<AuthProvider><Probe /></AuthProvider>);
        await screen.findByText('signed out');
        expect(screen.getByRole('alert').textContent).toBe('Cannot reach the local server.');
    });
});
