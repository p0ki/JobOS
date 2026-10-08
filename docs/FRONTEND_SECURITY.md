# Phase 0 frontend security review

## Scope and baseline

The React/Vite frontend was inspected across `src/`, including authentication, AI providers, browser storage and backup restore, document extraction, domain/workflow helpers, views, components, styles and existing tests. The browser-extension archive is reviewed separately in `EXTENSION_AUDIT.md`.

Before edits, `npm test -- --run`, `npm run build`, and `npm run lint` were attempted. All were blocked by missing installed tools (`vitest`, `tsc`, and `eslint`); those failures do not establish a passing upstream baseline. After dependencies became available, the frontend suite passed 81 tests, TypeScript/Vite production build passed, and ESLint passed. A test-only isolated DOM Storage adapter handles the Node 26 native localStorage getter; Vitest is scoped to frontend source tests and the extension node:test suite runs separately. Final checks against the updated dependency lockfiles are reported in the top-level Phase 0 report.

No provider inference, LinkedIn scraping, real CVs, user credentials, or production secrets were used for frontend validation. Security tests use explicitly synthetic strings and mocked backend/provider responses.

## Findings and corrections

| Finding | Impact | Phase 0 change |
| --- | --- | --- |
| Google JWT payload decoded with `atob` and trusted without signature/issuer/audience verification | Forged browser identity bypassed the UI login gate; this was not backend authorization | Browser identity storage and Google client flow removed. UI identity comes only from authenticated backend `/api/auth/session` |
| User identity cached in `job_os_auth` | A localStorage edit persisted arbitrary identity | Legacy auth removed on startup; no cookie/token/password is copied into browser storage |
| Gemini credentials persisted in browser settings and exported in backups | Any same-origin script or copied backup could disclose an AI secret | Direct browser Gemini provider and credential controls removed; closed settings schema strips API keys, models, and backend destinations on read, write, import and export |
| `mcpUrl` controlled API destination | A malicious imported setting could send job/CV/profile prompts to an arbitrary backend | All calls use a fixed relative `/api/` route helper, `credentials: same-origin`, `cache: no-store`, and `redirect: error`; runtime backend URL override removed |
| Imported job description used `dangerouslySetInnerHTML` | Stored HTML injection/XSS, including extension-supplied descriptions | Description is rendered as React text |
| AI resume analysis inserted raw HTML and interpolated provider output | AI output or hostile prompt input could generate executable browser markup | Analysis is displayed as plain text; structured arrays are filtered to strings |
| Imported application link accepted arbitrary schemes | `javascript:`, `data:`, file and credential-bearing links could be presented as Apply links | Only parsed HTTP(S) URLs without embedded credentials are navigable; new windows retain `noopener noreferrer` |
| Vite bound all interfaces and allowed the upstream author's hostname | Unnecessary network exposure and reference to upstream infrastructure | Dev/preview bind `127.0.0.1`, enforce port 8080, proxy only to `127.0.0.1:3002`, and preserve Origin/Host for backend checks |
| Document parser accepted unbounded input | Very large local documents could exhaust browser resources | Uploaded files limited to 10 MB; PDFs limited to 200 pages; PDF.js runtime code evaluation disabled |

No obfuscated executable payload, credential harvesting routine, or covert author-backend call was identified in the frontend source reviewed. This is a bounded static review and regression validation, not proof that every dependency or historical revision is malware-free.

## Authentication and request architecture

1. The UI starts in a loading state and calls `GET /api/auth/session`.
2. If no server session exists, the local Phase 0 login form submits the configured bootstrap password to `POST /api/auth/login` over the same-origin app endpoint.
3. The backend issues an opaque HttpOnly cookie and returns verified identity through `/api/auth/session`. The password lives only in the input/request and is cleared after submission.
4. Session identity is rechecked on window focus and every minute. Any API `401` clears the visible UI session. The backend independently enforces authorization on every protected request.
5. `POST /api/auth/logout` revokes the server session before the UI clears its current identity. If the server cannot be reached, the UI reports the failure and does not falsely claim server logout.
6. AI, research and job sync requests use the same-origin backend helper. The backend's explicit AI opt-in gate remains authoritative.

The frontend sets its storage namespace before opening authenticated views, avoiding reads under the previous/anonymous namespace. Stale session-check responses cannot replace a newer sign-in/sign-out operation.

This is a **single-owner local bootstrap flow**, not Google or ChatGPT OAuth. Later Sign in with ChatGPT integration must establish identity in the backend and can preserve the same `/api/auth/session` contract. No subscription capability is assumed or simulated.

LinkedIn profile import is disabled in the UI because the hardened extension no longer uploads profiles or sends background requests. Its local export is a separate explicit workflow.

## Remaining limits

- Job/workflow/profile/artifact content still uses browser localStorage. A namespace is a usability feature, **not** encryption or a secure multi-user isolation boundary. Anyone with access to that browser profile can read its local data. Do not use real personal data until the storage design is replaced and approved.
- Imported backups are untrusted data. Phase 0 closes executable HTML, link, credential and destination sinks; the full domain data schema still needs richer validation before production/multi-user restore workflows.
- Text from documents, scraped pages and AI is untrusted. Output is never executed in the browser, but future agent workflows need prompt-injection boundaries before enabling tools.
- Size/page limits mitigate common accidental parser exhaustion; malicious compressed documents can still consume resources within limits. Production parsing should use a dedicated constrained worker/service.
- Phase 0 login is accessible and responsive. Existing board/dashboard/modal layouts retain upstream desktop assumptions; comprehensive product accessibility and mobile redesign are outside this security branch.

## Regression coverage

- Forged local identity is discarded; only the backend session opens authenticated UI.
- Backend unavailability and expiry fail closed; logout uses the backend endpoint.
- The local bootstrap password is never persisted in browser auth/settings.
- External/custom API paths and traversal outside `/api/` are rejected; redirects are disabled and same-origin cookies are explicit.
- Legacy settings/imported backups cannot restore browser AI secrets or custom backend destinations.
- Imported job and AI response markup remains inert text without creating image/script elements.
- Unsafe application link schemes are rejected; ordinary HTTPS application links remain usable.
- Erase preserves browser data and reports an error when backend deletion fails or is rejected; local deletion requires a successful backend response.
