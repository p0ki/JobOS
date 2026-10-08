# Poki Career OS Phase 0 status

Active work: isolated security-hardening branch `security/phase-0-hardening` in p0ki/JobOS and p0ki/letsmcp. Original source and history are retained in Git. No main merge, deployment, actual account authorization or real user data has occurred.

The frontend now relies on a local backend session, sends API calls to its own origin, stores only non-secret preferences, and renders untrusted job/AI text safely. The extension performs explicit local preview/export only. See docs/PHASE0_REPORT.md for exact validation and remaining admission gates.

Planned later: verified Sign in with ChatGPT, protected backend OAuth credential storage, explicit inference permission, persistent per-user Postgres data isolation and product workflow. Those are not implemented by Phase 0.
