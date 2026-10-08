import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResumeAnalyst } from '../ResumeAnalyst';
import { JobDetail } from '../../views/JobDetail';
import { StorageService } from '../../../services/storage';
import type { Artifact } from '../../../domain/artifact';

vi.mock('../../../services/fileExtraction', () => ({ FileExtractionService: { extractText: vi.fn() } }));
vi.mock('../../../services/ai/providers/letsmcp', () => ({
    LetsMCPProvider: class {
        async isAvailable() { return true; }
        async hasAIProvider() { return true; }
        async analyzeResume() {
            return { matchScore: 80, strengths: ['<img src=x onerror="alert(1)">'], gaps: ['<script>synthetic()</script>'], recommendations: ['Regular text'] };
        }
    },
}));
beforeEach(() => { localStorage.clear(); StorageService.setUserId('synthetic-content-test'); });
afterEach(() => cleanup());

describe('untrusted description and AI markup', () => {
    it('shows imported job HTML as inert text', async () => {
        const description = '<img src=x onerror="alert(1)"><script>synthetic()</script>';
        StorageService.saveJob({ id: 'synthetic-job', title: 'Synthetic Job', company: 'Example', location: '', isRemote: true, source: 'Test', description, dateAdded: new Date().toISOString() });
        const { container } = render(<JobDetail jobId="synthetic-job" onBack={() => {}} />);
        await screen.findByText(description);
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('script')).toBeNull();
    });
    it('renders AI response strings without creating HTML elements', async () => {
        const artifact: Artifact = { id: 'synthetic-resume', type: 'Resume', name: 'Synthetic Resume', content: 'Synthetic React resume', version: 1, createdDate: new Date().toISOString(), lastModifiedDate: new Date().toISOString() };
        const { container } = render(<ResumeAnalyst jobDescription="React" artifacts={[artifact]} />);
        fireEvent.click(screen.getByText('✨ Run Gap Analysis'));
        await screen.findByText(/<img src=x onerror/);
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('script')).toBeNull();
    });
});
