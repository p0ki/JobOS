import React from 'react';

export const ExtensionInstallView: React.FC = () => {
    return (
        <div style={{ padding: 'clamp(0.5rem, 2vw, 2rem)', maxWidth: '800px' }}>
            <h1>Install the local LinkedIn job preview</h1>
            <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
                This reviewed extension previews jobs only after you request it. It has no backend connection.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <section style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: '#0f172a', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>1</span>
                        Download & Extract
                    </h3>
                    <p>Click the <strong>Download Extension</strong> button in the sidebar to get <code>LinkedInJobOS.zip</code>.</p>
                    <p style={{ marginTop: '0.5rem' }}>Extract the zip file. You should see a folder named <strong>LinkedInJobOS</strong>.</p>
                </section>

                <section style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: '#0f172a', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>2</span>
                        Open Chrome Extensions
                    </h3>
                    <p style={{ marginBottom: '0.5rem' }}>Open Google Chrome and navigate to:</p>
                    <code style={{ background: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>chrome://extensions</code>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                        (Copy and paste this into your address bar)
                    </p>
                </section>

                <section style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: '#0f172a', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>3</span>
                        Enable Developer Mode
                    </h3>
                    <p>
                        In the top right corner of the Extensions page, toggle on
                        <strong> Developer mode</strong>.
                    </p>
                </section>

                <section style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: '#0f172a', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>4</span>
                        Load Unpacked Extension
                    </h3>
                    <ol style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <li>Click the <strong>Load unpacked</strong> button (top left).</li>
                        <li>Navigate to your <strong>Downloads</strong> directory (or where you extracted the zip).</li>
                        <li>Select the folder named <strong>LinkedInJobOS</strong>.</li>
                    </ol>
                </section>

                <section style={{ backgroundColor: '#ecfdf5', padding: '1.5rem', borderRadius: '8px', border: '1px solid #10b981' }}>
                    <h3 style={{ marginBottom: '0.5rem', color: '#059669' }}>Preview and review</h3>
                    <p>
                        Open a LinkedIn job posting, click the extension icon, then choose <strong>Preview job</strong>.
                        Review the text before choosing <strong>Download reviewed JSON</strong>.
                        The downloaded file stays on your computer. Profile capture and direct import are disabled
                        until secure pairing with your signed-in Career OS session is available.
                    </p>
                </section>
            </div>
        </div>
    );
};
