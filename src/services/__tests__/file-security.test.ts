import { afterEach, describe, expect, it, vi } from 'vitest';
import * as pdfjs from 'pdfjs-dist';
import { FileExtractionService } from '../fileExtraction';

vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }));
vi.mock('mammoth', () => ({ default: { extractRawText: vi.fn() } }));
afterEach(() => vi.clearAllMocks());

describe('untrusted file parsing limits', () => {
    it('rejects oversized files before starting a parser', async () => {
        const file = { size: 10 * 1024 * 1024 + 1, type: 'application/pdf' } as File;
        await expect(FileExtractionService.extractText(file)).rejects.toThrow('Maximum size is 10 MB');
        expect(pdfjs.getDocument).not.toHaveBeenCalled();
    });
    it('rejects long PDFs and tears down the document worker', async () => {
        const destroy = vi.fn().mockResolvedValue(undefined);
        const getPage = vi.fn();
        vi.mocked(pdfjs.getDocument).mockReturnValue({ promise: Promise.resolve({ numPages: 201, getPage, destroy }) } as unknown as ReturnType<typeof pdfjs.getDocument>);
        const file = { arrayBuffer: async () => new ArrayBuffer(0) } as File;
        await expect(FileExtractionService.parsePdf(file)).rejects.toThrow('Maximum length is 200 pages');
        expect(getPage).not.toHaveBeenCalled();
        expect(destroy).toHaveBeenCalledOnce();
    });
    it('disables runtime evaluation while extracting ordinary PDF text', async () => {
        const destroy = vi.fn().mockResolvedValue(undefined);
        vi.mocked(pdfjs.getDocument).mockReturnValue({ promise: Promise.resolve({ numPages: 1, destroy, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: 'Synthetic document' }] }) }) }) } as unknown as ReturnType<typeof pdfjs.getDocument>);
        const file = { arrayBuffer: async () => new ArrayBuffer(0) } as File;
        await expect(FileExtractionService.parsePdf(file)).resolves.toContain('Synthetic document');
        expect(pdfjs.getDocument).toHaveBeenCalledWith(expect.objectContaining({ isEvalSupported: false }));
        expect(destroy).toHaveBeenCalledOnce();
    });
});
