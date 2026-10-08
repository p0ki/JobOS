import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';

export const LoginView: React.FC = () => {
    const { signIn, error } = useAuth();
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        try { await signIn(password); } catch { /* shown by auth context */ }
        finally { setPassword(''); setSubmitting(false); }
    };

    return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f172a', padding: '1rem' }}>
            <section className="card" style={{ width: '100%', maxWidth: '400px' }} aria-labelledby="login-heading">
                <h1 id="login-heading">Poki Career OS</h1>
                <p>Sign in to your local Phase 0 workspace.</p>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Use synthetic demo data while the security review is in progress. ChatGPT sign-in will be added separately.</p>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="bootstrap-password">Local workspace password</label>
                    <input id="bootstrap-password" type="password" className="input" value={password}
                        onChange={event => setPassword(event.target.value)} autoComplete="current-password"
                        required disabled={submitting} style={{ width: '100%', margin: '0.5rem 0 1rem' }} />
                    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
                    <button type="submit" className="btn btn-primary" disabled={submitting || !password}>
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            </section>
        </main>
    );
};
