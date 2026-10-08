import React, { useState } from 'react';
import { StorageService } from '../../services/storage';
import { LetsMCPProvider } from '../../services/ai/providers/letsmcp';
import type { Artifact } from '../../domain/artifact';

interface ResumeAnalystProps {
    jobDescription: string;
    artifacts: Artifact[];
}

export const ResumeAnalyst: React.FC<ResumeAnalystProps> = ({ jobDescription, artifacts }) => {
    const [selectedArtifactId, setSelectedArtifactId] = useState<string>(artifacts.find(a => a.type === 'Resume')?.id || '');
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisSource, setAnalysisSource] = useState<string>('');

    // Keep the selected resume in sync when the artifact list changes
    const [prevArtifacts, setPrevArtifacts] = useState(artifacts);
    if (prevArtifacts !== artifacts) {
        setPrevArtifacts(artifacts);
        const firstResume = artifacts.find(a => a.type === 'Resume');
        if (firstResume) {
            setSelectedArtifactId(firstResume.id);
        }
    }

    const resumes = artifacts.filter(a => a.type === 'Resume');

    // Local / Offline Analysis Logic
    const generateLocalAnalysis = (jd: string, resumeContent: string): string => {
        const commonTechKeywords = [
            'React', 'TypeScript', 'Node', 'Python', 'Java', 'AWS', 'Docker', 'Kubernetes', 'SQL', 'NoSQL',
            'Agile', 'Jira', 'Leadership', 'Communication', 'Design System', 'CI/CD', 'Testing', 'Jest', 'Cypress'
        ];

        const jdLower = jd.toLowerCase();
        const resumeLower = resumeContent.toLowerCase();

        const foundKeywords = commonTechKeywords.filter(k => jdLower.includes(k.toLowerCase()) && resumeLower.includes(k.toLowerCase()));
        const missingKeywords = commonTechKeywords.filter(k => jdLower.includes(k.toLowerCase()) && !resumeLower.includes(k.toLowerCase()));

        const score = Math.min(100, 50 + (foundKeywords.length * 5));

        return `Offline match score: ~${score}%

This estimate uses only a local keyword matcher.

Keywords found
${foundKeywords.join(', ') || 'No common keywords detected.'}

Potential gaps
${missingKeywords.join(', ') || 'No obvious missing keywords.'}

Check alternate phrasing and make your formatting readable.`;
    };

    // Treat every AI response as text. Never interpret provider output as browser markup.
    const formatAnalysis = (data: {
        matchScore: number;
        strengths: string[];
        gaps: string[];
        recommendations: string[];
    }): string => {
        const list = (value: unknown) => Array.isArray(value)
            ? value.filter(item => typeof item === 'string').map(item => `• ${item}`).join('\n') || 'None listed.'
            : 'None listed.';
        return `Match score: ${Math.max(0, Math.min(100, data.matchScore))}%

Strengths
${list(data.strengths)}

Gaps
${list(data.gaps)}

Recommendations
${list(data.recommendations)}`;
    };

    const handleAnalyze = async () => {
        if (!selectedArtifactId) return;

        const resume = resumes.find(r => r.id === selectedArtifactId);
        if (!resume) return;

        setLoading(true);
        setError(null);
        setAnalysis(null);
        setAnalysisSource('');

        const settings = StorageService.getSettings();

        // 1. Try LetsMCP first
        if (settings.aiProvider === 'letsmcp') {
            try {
                const mcpProvider = new LetsMCPProvider({
                    provider: settings.mcpProvider as 'groq' | 'claude' | 'gemini',
                });

                const isAvailable = await mcpProvider.isAvailable();
                const hasAI = await mcpProvider.hasAIProvider();

                if (isAvailable && hasAI) {
                    const result = await mcpProvider.analyzeResume(jobDescription, resume.content);

                    if (result && typeof result.matchScore === 'number') {
                        setAnalysisSource(`LetsMCP (${settings.mcpProvider || 'server default'})`);
                        setAnalysis(formatAnalysis(result));
                        setLoading(false);
                        return;
                    }
                } else {
                    console.warn('LetsMCP unavailable or has no AI, using local fallback.');
                    setError(`LetsMCP Check Failed: Available=${isAvailable}, HasAI=${hasAI}`);
                }
            } catch (err: unknown) {
                console.warn('LetsMCP analysis failed, using local fallback:', err);
                setError(`LetsMCP Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }

        // Local fallback: Local analysis
        setAnalysisSource('Local Keyword Matcher');
        const localResult = generateLocalAnalysis(jobDescription, resume.content);
        setAnalysis(localResult);
        setLoading(false);
    };

    return (
        <div className="card">
            <h3>🤖 Resume Analyst</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Identify gaps between your resume and the job description.
            </p>

            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Resume</label>
                {resumes.length > 0 ? (
                    <select
                        value={selectedArtifactId}
                        onChange={(e) => setSelectedArtifactId(e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                    >
                        {resumes.map(r => (
                            <option key={r.id} value={r.id}>{r.name} (v{r.version})</option>
                        ))}
                    </select>
                ) : (
                    <div style={{ padding: '0.5rem', background: '#fffbeb', color: '#b45309', borderRadius: '4px', fontSize: '0.9rem' }}>
                        ⚠️ No eligible resumes found. Add a "Resume" artifact below first.
                    </div>
                )}
            </div>

            <style>
                {`
                    @keyframes blink {
                        0% { opacity: 0.2; }
                        20% { opacity: 1; }
                        100% { opacity: 0.2; }
                    }
                    .loading-dot {
                        animation-name: blink;
                        animation-duration: 1.4s;
                        animation-iteration-count: infinite;
                        animation-fill-mode: both;
                    }
                    .loading-dot:nth-child(2) { animation-delay: 0.2s; }
                    .loading-dot:nth-child(3) { animation-delay: 0.4s; }

                    /* Custom Scrollbar for Analysis */
                    .analysis-content::-webkit-scrollbar {
                        width: 8px;
                    }
                    .analysis-content::-webkit-scrollbar-track {
                        background: #f1f5f9;
                    }
                    .analysis-content::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 4px;
                    }
                    .analysis-content h3 { color: var(--primary-color); margin-top: 0; }
                    .analysis-content h4 { margin-top: 1rem; margin-bottom: 0.5rem; }
                    .analysis-content ul { padding-left: 1.2rem; margin: 0.5rem 0; }
                `}
            </style>

            <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={loading || resumes.length === 0}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
            >
                {loading ? (
                    <span>
                        Analyzing
                        <span className="loading-dot">.</span>
                        <span className="loading-dot">.</span>
                        <span className="loading-dot">.</span>
                    </span>
                ) : '✨ Run Gap Analysis'}
            </button>

            {analysisSource && (
                <div style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', background: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontSize: '0.8rem', display: 'inline-block' }}>
                    Powered by: {analysisSource}
                </div>
            )}

            {error && <p role="status" style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>The local AI service is unavailable. Using a local keyword estimate.</p>}

            {analysis && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <div
                        className="analysis-content"
                        style={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            paddingRight: '0.5rem',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.6',
                            fontSize: '0.95rem'
                        }}
                    >{analysis}</div>
                </div>
            )}
        </div>
    );
};
