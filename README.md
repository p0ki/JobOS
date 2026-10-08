# Poki Career OS: Phase 0 frontend

Security-hardening fork of [JobOS](https://github.com/shanebe-ai/JobOS), paired with [p0ki/letsmcp](https://github.com/p0ki/letsmcp). Upstream history and MIT attribution are preserved. Work is isolated to `security/phase-0-hardening`; no deployment or main-branch merge is authorized.

Use synthetic demo data only. The browser no longer accepts a decoded Google JWT as identity or stores AI credentials. Local sign-in uses the paired backend's opaque HttpOnly session. AI stays disabled by default. ChatGPT sign-in and plan usage are future integrations, not implemented or tested in this branch.

## Safe local setup

Use Node 24 LTS and the checked-in lockfile. Install with `npm ci --ignore-scripts`, then run `npm run dev`. Vite listens on `127.0.0.1:8080` and proxies `/api/*` to `127.0.0.1:3002`. Set up the paired backend's private data directory and owner passphrase as described in its README. Use the exact default origin `http://127.0.0.1:8080`; don't mix localhost and 127.0.0.1.

No browser `.env` credential is required. Never use `VITE_*` variables for secrets. Old browser provider keys/backend destinations are purged from settings on read/import/export; unverified cached authentication is discarded. Browser demo/CRM data still uses localStorage, so this is not yet a private multi-user database. Only invented fixtures were used during validation.

The LinkedIn extension is reviewable under `extension/LinkedInJobOS/`. It performs manual, bounded job preview and local JSON download only. It cannot upload to the backend, scrape profiles, or send to AI. See the in-app installation view and the [extension audit](docs/EXTENSION_AUDIT.md). Existing copies of the old extension are outside this repository's control.

## Validation and evidence

- `npm run lint`
- `npm run build`
- `npm test -- --run`
- `node --test tests/extension-security.test.mjs`
- `python3 scripts/build-extension.py --check`
- `npm audit --audit-level=low`

See [Phase 0 report](docs/PHASE0_REPORT.md), [frontend security](docs/FRONTEND_SECURITY.md), [extension audit](docs/EXTENSION_AUDIT.md), and [supply chain](docs/SUPPLY_CHAIN.md) for exact baseline IDs, findings, tested boundaries and limitations. CI includes security checks on hardening branches. Author deployment automation was removed; this branch offers no production deployment flow.
