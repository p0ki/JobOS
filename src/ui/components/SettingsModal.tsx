import { apiFetch } from '../../services/api';
import React, { useState } from 'react';
import { StorageService } from '../../services/storage';

import { ConfirmationModal } from './ConfirmationModal';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    // Import Flow State
    const [importWarningOpen, setImportWarningOpen] = useState(false);
    const [importSuccessOpen, setImportSuccessOpen] = useState(false);
    const [importErrorOpen, setImportErrorOpen] = useState(false);
    const [importPendingFile, setImportPendingFile] = useState<File | null>(null);

    // Reset/Erase Flow State
    const [resetWarningOpen, setResetWarningOpen] = useState(false);
    const [eraseWarningOpen, setEraseWarningOpen] = useState(false);
    const [erasing, setErasing] = useState(false);
    const [dataError, setDataError] = useState<string | null>(null);

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportPendingFile(file);
        setImportWarningOpen(true);
        // Reset input value so same file can be selected again if needed
        e.target.value = '';
    };

    const processImport = () => {
        if (!importPendingFile) return;
        setImportWarningOpen(false);

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                const success = StorageService.importData(content);
                if (success) {
                    setImportSuccessOpen(true);
                } else {
                    setImportErrorOpen(true);
                }
            }
        };
        reader.readAsText(importPendingFile);
    };

    const handleLoadDefaults = () => {
        StorageService.initialize(true); // Force re-seed
        window.location.reload();
    };

    const handleEraseAll = async () => {
        if (erasing) return;
        setErasing(true);
        setEraseWarningOpen(false);
        setDataError(null);
        try {
            // Preserve the local workspace unless the server confirms its queue was cleared.
            const response = await apiFetch('/api/jobs', { method: 'DELETE', signal: AbortSignal.timeout(10000) });
            if (!response.ok) throw new Error('Backend deletion was rejected');
            StorageService.clearAll();
            window.location.reload();
        } catch {
            setDataError('Could not erase data on the local server. Your browser workspace has been preserved. Sign in or try again when the server is available.');
        } finally {
            setErasing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                width: '100%',
                maxWidth: '500px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>⚙️ Settings</h2>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                </div>

                {dataError && <p role="alert" style={{ color: '#b91c1c' }}>{dataError}</p>}

                <p>AI requests use the authenticated local server. Provider secrets and server addresses cannot be stored in this browser.</p>

                <div style={{ marginBottom: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '1rem' }}>💾 Data Management</h3>

                    <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                        {/* Export */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Export Data</div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>Download a JSON backup of all your work.</div>
                            </div>
                            <button className="btn btn-outline" onClick={() => {
                                const data = StorageService.exportAllData();
                                const blob = new Blob([data], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `jobos_backup_${new Date().toISOString().split('T')[0]}.json`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            }}>
                                ⬇️ Download
                            </button>
                        </div>

                        {/* Import */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Import Backup</div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>Restore from a previously saved JSON file.</div>
                            </div>
                            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                                📂 Restore
                                <input
                                    type="file"
                                    accept=".json"
                                    style={{ display: 'none' }}
                                    onChange={onFileSelect}
                                />
                            </label>
                        </div>

                        {/* Dangerous Zone */}
                        <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed #e2e8f0' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Allowed Actions</div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Load Default Data</div>
                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Reset to the initial demo dataset.</div>
                                </div>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => setResetWarningOpen(true)}
                                    style={{ borderColor: '#f59e0b', color: '#b45309' }}
                                >
                                    ⚠️ Load Defaults
                                </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--danger-color)' }}>Erase All Data</div>
                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Permanently clear everything. Start fresh.</div>
                                </div>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => { setDataError(null); setEraseWarningOpen(true); }}
                                    disabled={erasing}
                                    style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                                >
                                    {erasing ? 'Erasing…' : '🗑️ Erase All'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn btn-outline" onClick={onClose}>Done</button>

                </div>

                {/* Confirm Import Warning */}
                <ConfirmationModal
                    isOpen={importWarningOpen}
                    title="⚠️ Overwrite Data Warning"
                    message="Importing this backup will PERMANENTLY ERASE and overwrite all your current data. This action cannot be undone. Are you sure you want to proceed?"
                    confirmText="Overwrite Everything"
                    cancelText="Cancel"
                    onConfirm={processImport}
                    onCancel={() => {
                        setImportWarningOpen(false);
                        setImportPendingFile(null);
                    }}
                />

                {/* Import Success */}
                <ConfirmationModal
                    isOpen={importSuccessOpen}
                    title="✅ Import Successful"
                    message="Your data has been successfully restored from the backup file. The application will now reload to apply changes."
                    confirmText="Reload App"
                    cancelText={null}
                    onConfirm={() => window.location.reload()}
                    onCancel={() => { }}
                />

                {/* Import Error */}
                <ConfirmationModal
                    isOpen={importErrorOpen}
                    title="❌ Import Failed"
                    message="The selected file either is not a valid JobOS backup or is corrupted. No data was changed."
                    confirmText="Close"
                    cancelText={null}
                    onConfirm={() => setImportErrorOpen(false)}
                    onCancel={() => setImportErrorOpen(false)}
                />

                {/* Confirm Load Defaults */}
                <ConfirmationModal
                    isOpen={resetWarningOpen}
                    title="⚠️ Load Default Data?"
                    message="This will overwrite your current workspace with the standard JobOS demo data. Your current work will be lost unless you have backed it up. Proceed?"
                    confirmText="Yes, Load Defaults"
                    cancelText="Cancel"
                    onConfirm={handleLoadDefaults}
                    onCancel={() => setResetWarningOpen(false)}
                />

                {/* Confirm Erase All */}
                <ConfirmationModal
                    isOpen={eraseWarningOpen}
                    title="🗑️ Erase Everything?"
                    message="You are about to delete ALL jobs, applications, logs, and settings. This returns the app to a completely blank slate. There is no undo."
                    confirmText="ERASE EVERYTHING"
                    cancelText="Go Back"
                    onConfirm={handleEraseAll}
                    onCancel={() => setEraseWarningOpen(false)}
                />

            </div>
        </div>
    );
};
