import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AuthContext, type AuthUser } from './auth';
import { apiFetch, SESSION_EXPIRED_EVENT } from '../services/api';
import { StorageService } from '../services/storage';

function sessionUser(data: unknown): AuthUser | null {
    if (!data || typeof data !== 'object') return null;
    const session = data as { authenticated?: boolean; user?: AuthUser };
    if (session.authenticated !== true || !session.user ||
        typeof session.user.id !== 'string' || typeof session.user.name !== 'string') return null;
    return { id: session.user.id, name: session.user.name, email: session.user.email };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const sessionRevision = useRef(0);
    const updateUser = useCallback((currentUser: AuthUser | null) => {
        StorageService.setUserId(currentUser?.id || 'anon');
        if (currentUser) StorageService.initialize();
        setUser(currentUser);
    }, []);


    useEffect(() => {
        let active = true;
        localStorage.removeItem('job_os_auth'); // discard unverified upstream identity
        StorageService.getSettings(); // purge legacy provider secrets / destinations
        const clearSession = () => { sessionRevision.current++; if (active) updateUser(null); };
        const checkSession = async () => {
            const revision = sessionRevision.current;
            try {
                const response = await apiFetch('/api/auth/session', { signal: AbortSignal.timeout(5000) });
                const currentUser = response.ok ? sessionUser(await response.json()) : null;
                if (active && revision === sessionRevision.current) {
                    updateUser(currentUser);
                    setError(response.status >= 500 ? 'The local server is unavailable or requires setup.' : null);
                }
            } catch {
                if (active && revision === sessionRevision.current) {
                    updateUser(null);
                    setError('Cannot reach the local server.');
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        void checkSession();
        const interval = window.setInterval(() => void checkSession(), 60000);
        const onFocus = () => void checkSession();
        window.addEventListener('focus', onFocus);
        window.addEventListener(SESSION_EXPIRED_EVENT, clearSession);
        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            window.removeEventListener(SESSION_EXPIRED_EVENT, clearSession);
        };
    }, [updateUser]);

    const signIn = async (password: string) => {
        setError(null);
        sessionRevision.current++;
        try {
            const response = await apiFetch('/api/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }), signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) throw new Error(response.status === 429
                ? 'Too many attempts. Try again later.' : 'Sign-in failed. Check the local password and server setup.');
            // The server cookie, never browser storage, establishes identity.
            const session = await apiFetch('/api/auth/session', { signal: AbortSignal.timeout(5000) });
            const currentUser = session.ok ? sessionUser(await session.json()) : null;
            if (!currentUser) throw new Error('No valid server session was created.');
            updateUser(currentUser);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Sign-in failed.';
            setError(message);
            throw new Error(message);
        }
    };

    const signOut = async () => {
        sessionRevision.current++;
        try {
            const response = await apiFetch('/api/auth/logout', { method: 'POST', signal: AbortSignal.timeout(5000) });
            if (!response.ok) throw new Error('Sign-out failed. Try again when the local server is available.');
            updateUser(null);
            setError(null);
        } catch {
            setError('Sign-out failed. Try again when the local server is available.');
        }
    };

    return <AuthContext.Provider value={{ user, loading, error, signIn, signOut }}>{children}</AuthContext.Provider>;
};
