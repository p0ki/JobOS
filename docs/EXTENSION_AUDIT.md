# LinkedIn extension Phase 0 audit

## Reviewed upstream archive

The upstream `public/LinkedInJobOS.zip` was checked before extraction: five regular UTF-8 text files; no absolute paths, parent traversal, backslash paths, symlinks, encrypted entries, excessive sizes or compression ratios. Total uncompressed size: 23,482 bytes. No binary/image assets or nested archives. Every file was read in full, including HTML, JavaScript and the manifest. The original archive remains recoverable from upstream Git history; it is not offered as a download on this branch.

SHA-256 of original archive: `71646fa13922bd4cf08438562d1414cf70bf45ed52126bd6fbe0be3cc5fbece1`.

| Original entry | Bytes | SHA-256 |
| --- | ---: | --- |
| `LinkedInJobOS/manifest.json` | 741 | `ebfd5d344f5f2db06bc411501bd03d9ed0af1d652481bf8824f946291b13a0f4` |
| `LinkedInJobOS/content.js` | 15,893 | `69a7461730472dd6614886367fae7e4f26d4869908153d9dd2b13891f58f6df6` |
| `LinkedInJobOS/background.js` | 1,864 | `c5accaf09782f797f527fa62bf04e69bab317530e175ebea24dde363245c8234` |
| `LinkedInJobOS/popup.html` | 1,573 | `d65717d3f8004a6a9f65a82f20ab43d2f048c720813aada8739c845cd25f5aad` |
| `LinkedInJobOS/popup.js` | 3,411 | `14a7308d88507b7377287d420cb28753632a6d45e1a3983c0138f752bad79a7e` |

## Findings

1. **Critical privacy exposure:** the background worker submitted jobs and profiles to the author's hardcoded IP `37.27.80.77:3002` over unencrypted HTTP. `/api/jobs` received the full scraped job object; `/api/profile` received structured identity, location, summary, skills and the first 3,000 characters of arbitrary profile-page text. There was no backend credential, explicit origin validation or confirmation step for profile transmission. This behavior is directly visible in code; intent cannot be inferred from it.
2. **Persistent page access:** automatic content scripts ran on all `https://*.linkedin.com/*` pages, injecting buttons and observing every DOM mutation for SPA navigation. Manifest permissions included `tabs` in addition to `activeTab` and `scripting`, plus host access to the author server.
3. **Weak message validation:** the background worker accepted `save_job` and `save_profile` messages without checking sender identity, origin or payload bounds. There was no `externally_connectable` manifest entry, limiting direct website messaging, but the internal boundary was still insufficient.
4. **Untrusted HTML:** scraped job descriptions included `innerHTML`, forwarded to the backend. Popup job/profile identification used substring or non-anchored regular-expression URL checks. Profile ownership relied on page UI heuristics, and the popup did not enforce ownership.
5. **Supply-chain opacity:** the only extension artifact in upstream was a ZIP, with no checked-in build or source parity test. No obfuscated code, `eval`, dynamically downloaded scripts, remote imports, native messaging, cookie APIs, local storage, credential scraping or additional outbound URLs were found in these five files. This is a static audit, not a guarantee that all upstream software is malware-free.

## Hardened architecture

The replacement's complete reviewable source is `extension/LinkedInJobOS/`. It requests only `activeTab` and `scripting`. No background worker, persistent content scripts, host permissions, profile scraper, runtime message listener, network requests or storage APIs remain. `connect-src 'none'` also blocks extension-page network connections. Scripts and styles are packaged locally; extension CSP forbids remote scripts and objects.

The user opens the popup and explicitly clicks **Preview job**. Only the main frame of the current tab is read in Chrome's isolated world, with HTTPS, exact LinkedIn hostname and numeric job-path validation repeated inside the injected function. The extractor reads bounded job-specific plain text, never HTML or arbitrary page body/profile context. Tracking/query parameters are removed from exported canonical job URLs. The popup uses `textContent` and keeps the preview only in memory. A separate **Download reviewed JSON** click writes a local file through a temporary Blob URL; no data is submitted to Career OS or an AI provider.

Direct upload is intentionally unavailable. A future implementation needs explicit pairing, an extension-specific origin allowlist, authenticated sessions and a scoped backend import capability. The ordinary browser session cookie and permissive CORS are not a substitute for that design. The app installation view explains these limitations. Existing upstream extension installations must be removed or replaced; changing this repository cannot revoke their original permissions.

## Packaging and verification

`python3 scripts/build-extension.py` produces `public/LinkedInJobOS.zip` from an explicit five-file allowlist with stable ordering, timestamps and Unix file permissions. Packaging rejects unexpected source entries and symlinks. `python3 scripts/build-extension.py --check` requires byte-for-byte archive equality with reviewed source. The archive contains no upstream background script.

SHA-256 of the reviewed Phase 0 archive: `6573d7442f5d7409f3ce02a4ac65085004d41f93268dfee391b874e7a869f0ba`.

Seven static and synthetic tests in `tests/extension-security.test.mjs` check least privilege, no network/storage/eval/HTML sinks, spoofed hosts, profiles, HTTP pages, malformed IDs, bounded extraction, canonical URLs, invalid metadata and absence of arbitrary page-body access. Popup fixtures verify no read at startup, separate preview/download clicks, safe text rendering and spoofed-host rejection without injection/export. Run with `node tests/extension-security.test.mjs` (also compatible with `node --test`). All seven passed, as did JavaScript syntax checks and exact archive/source parity. All fixtures contain invented job text. No real account, CV or LinkedIn data was used.

The extension has not been loaded into a real browser or run against LinkedIn in this audit. DOM selectors may change; synthetic tests verify the security boundary but not current LinkedIn markup or Chrome download UX. Review those flows using synthetic content and an isolated browser before depending on import functionality. Direct import and profile capture remain disabled.
