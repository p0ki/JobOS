import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, SESSION_EXPIRED_EVENT } from '../api';
import { StorageService } from '../storage';
import { LetsMCPProvider } from '../ai/providers/letsmcp';
import { safeExternalUrl } from '../../utils/urls';

beforeEach(() => { localStorage.clear(); StorageService.setUserId('synthetic-security-test'); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('browser backend boundary', () => {
    it.each(['https://attacker.invalid/api/generate', '//attacker.invalid/api/generate', '/api/../../private', '/api/\\attacker.invalid'])('rejects redirected/custom backend path %s', async path => {
        const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
        await expect(apiFetch(path)).rejects.toThrow('Only same-origin API paths');
        expect(fetch).not.toHaveBeenCalled();
    });
    it('uses session cookies only on same-origin calls and disallows redirects', async () => {
        const fetch = vi.fn().mockResolvedValue(new Response('{}'));
        vi.stubGlobal('fetch', fetch);
        await new LetsMCPProvider().generateText('synthetic prompt');
        expect(fetch).toHaveBeenCalledWith('/api/generate', expect.objectContaining({ credentials: 'same-origin', redirect: 'error', method: 'POST' }));
    });
    it('clears UI identity when the server expires a session', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
        const expired = vi.fn(); window.addEventListener(SESSION_EXPIRED_EVENT, expired);
        await apiFetch('/api/jobs');
        expect(expired).toHaveBeenCalledOnce();
        window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
    });
});

describe('legacy browser settings migration', () => {
    const legacy = { aiProvider: 'gemini', apiKey: 'synthetic-legacy-key', mcpUrl: 'https://attacker.invalid', model: 'legacy-model', mcpProvider: 'claude' };
    it('purges provider secrets and destinations on read and export', () => {
        localStorage.setItem('job_os_settings', JSON.stringify(legacy));
        expect(StorageService.getSettings()).toEqual({ aiProvider: 'letsmcp', mcpProvider: 'claude' });
        expect(localStorage.getItem('job_os_settings')).not.toContain('synthetic-legacy-key');
        expect(StorageService.exportAllData()).not.toContain('attacker.invalid');
        expect(StorageService.exportAllData()).not.toContain('apiKey');
    });
    it('cannot restore a secret or custom destination from an imported backup', () => {
        expect(StorageService.importData(JSON.stringify({ meta: { appName: 'JobOS' }, data: { job_os_settings: legacy } }))).toBe(true);
        expect(StorageService.getSettings()).toEqual({ aiProvider: 'letsmcp', mcpProvider: 'claude' });
        expect(localStorage.getItem('job_os_settings')).not.toContain('apiKey');
    });
    it('recovers safely from corrupted settings', () => {
        localStorage.setItem('job_os_settings', 'broken JSON');
        expect(StorageService.getSettings()).toEqual({ aiProvider: 'letsmcp' });
    });
});

describe('untrusted job links', () => {
    it.each(['javascript:alert(1)', 'data:text/html,<script></script>', 'file:///etc/passwd', 'https://user:pass@example.invalid'])('rejects %s', value => {
        expect(safeExternalUrl(value)).toBeUndefined();
    });
    it('keeps a regular HTTPS link navigable', () => expect(safeExternalUrl('https://example.invalid/jobs/1')).toBe('https://example.invalid/jobs/1'));
});
