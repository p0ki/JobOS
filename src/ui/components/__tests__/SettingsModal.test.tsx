import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsModal } from '../SettingsModal';
import { StorageService } from '../../../services/storage';

beforeEach(() => {
    localStorage.clear();
    StorageService.setUserId('synthetic-delete-test');
    StorageService.saveJob({ id: 'synthetic-job', title: 'Synthetic Job', company: 'Example', location: '', isRemote: true, source: 'Test', description: 'Synthetic content', dateAdded: new Date().toISOString() });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const confirmErase = () => {
    fireEvent.click(screen.getByText('🗑️ Erase All'));
    fireEvent.click(screen.getByText('ERASE EVERYTHING'));
};

describe('erase requires successful backend deletion', () => {
    it.each([401, 403, 429, 500])('preserves local jobs and reports rejected status %s', async status => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
        const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        render(<SettingsModal isOpen onClose={() => {}} />);
        confirmErase();
        await screen.findByRole('alert');
        expect(StorageService.getJobs().map(job => job.id)).toEqual(['synthetic-job']);
        expect(reload).not.toHaveBeenCalled();
    });
    it('preserves local jobs when the backend request fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Synthetic unavailable server')));
        const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        render(<SettingsModal isOpen onClose={() => {}} />);
        confirmErase();
        expect((await screen.findByRole('alert')).textContent).toContain('browser workspace has been preserved');
        expect(StorageService.getJobs()).toHaveLength(1);
        expect(reload).not.toHaveBeenCalled();
    });
    it('clears the local workspace after confirmed backend deletion', async () => {
        const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetch);
        const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        render(<SettingsModal isOpen onClose={() => {}} />);
        confirmErase();
        await waitFor(() => expect(reload).toHaveBeenCalledOnce());
        expect(StorageService.getJobs()).toEqual([]);
        expect(fetch).toHaveBeenCalledWith('/api/jobs', expect.objectContaining({ method: 'DELETE', credentials: 'same-origin' }));
    });
});
