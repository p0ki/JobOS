# Phase 0 supply-chain controls

Review date: 2026-10-08. Changes belong to `security/phase-0-hardening`; upstream history and MIT notices are preserved. No deployment is part of this work.

## Dependency findings and changes

The original lockfile at `7c70a863cca89c3dd619ff9bdd6ee8d4ebc3f41a` produced **24 npm audit findings: 1 low, 7 moderate, 15 high and 1 critical**. These are vulnerable package entries, including transitive propagation, rather than 24 independently exploitable application bugs. Findings included Vitest UI execution/file-read exposure, Vite development-server file reads, XML parser injection/denial of service, and vulnerable parsing/build-tool dependencies.

The direct browser Gemini SDK (`@google/generative-ai`) was removed after its provider implementation was removed. AI secrets belong on the authenticated backend. Updates preserve existing major release lines where practical; exact resolution is recorded by `package-lock.json`.

| Selected locked package | Baseline | Updated resolution |
|---|---:|---:|
| Vite | 7.2.4 | 7.3.7 |
| Vitest | 4.0.16 | 4.1.11 |
| Happy DOM | 20.0.11 | 20.14.5 |
| Mammoth | 1.11.0 | 1.13.0 |
| `@xmldom/xmldom` | 0.8.11 | 0.8.15 |
| Rollup | 4.53.3 | 4.64.1 |
| PostCSS | 8.5.6 | 8.5.29 |
| Underscore | 1.13.7 | 1.13.8 |
| `ws` | 8.18.3 | 8.22.0 |

An intermediate audit after ordinary updates still reported **3 moderate findings**, all in the Mammoth → argparse v1 → sprintf-js chain. The applied targeted `mammoth` override selects `argparse@2.0.1`, removing that vulnerable formatting dependency without force-downgrading Mammoth to npm's suggested obsolete version. Isolated lockfile regeneration changed only the nested argparse/sprintf-js chain and argparse's development flag. Argparse v2 retains deprecated v1 compatibility methods used by Mammoth's CLI; v3 removes those methods, so a blanket latest-major override is inappropriate. Both real synthetic DOCX text extraction and the upstream Mammoth CLI `--help` compatibility tests passed. See `tests/docx-dependency.test.mjs` and [argparse's upstream documentation](https://github.com/nodeca/argparse).

**Final local validation, 2026-10-08:** clean `npm ci --ignore-scripts` installed 289 packages and audited 290; explicit `npm audit --audit-level=low` reported **0 findings**. Under Node 24, all 81 frontend tests, lint and build passed, alongside 2 DOCX/CLI compatibility tests, 7 extension security tests and deterministic extension archive/source parity. Both scanner regression tests passed, including detection of a secret present only in the staged index. Advisory results are time-bound evidence, not certification that packages are malware-free. Hosted CI/CodeQL execution is not yet verified. Browser QA from 2026-10-07 remains the available UI evidence; the final browser rerun was prevented by browser access policy.

## Installation and provenance

Both initial inspection and CI use `npm ci --ignore-scripts`; no root preinstall/install/postinstall/prepare hook was found. Lockfile format is v3. Downloaded entries resolve only to `https://registry.npmjs.org/` with SHA-512 integrity. The security scanner rejects other provenance or missing integrity. Integrity verifies bytes against the lockfile; it does not establish that a publisher or package is trustworthy.

JobOS lock metadata still marks SWC, esbuild and optional fsevents as having install hooks. These hooks are suppressed. Native platform packages must work through the clean install/build checks; do not enable all lifecycle scripts to repair an unexplained failure. CI uses Node 24; the manifest permits Node 24–26.

## CI and scanner pins

The author-target SSH deployment workflow was removed from this branch. Validation runs on `security/**`/main pushes and pull requests with read-only contents permission and checkout credential persistence disabled. No `pull_request_target` execution of contributed code is configured.

| Component | Exact pin |
|---|---|
| `actions/checkout` v6 | `d23441a48e516b6c34aea4fa41551a30e30af803` |
| `actions/setup-node` v6 | `249970729cb0ef3589644e2896645e5dc5ba9c38` |
| `github/codeql-action` v4 | `7999b86c43a865dc79d8923397f35af22de63401` |
| Gitleaks | 8.30.1 Linux x64 archive, SHA-256 `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` |

Pins were verified against the official repositories/releases during setup. Gitleaks is downloaded by `scripts/install-security-scanner.sh`, checked before extraction and run with full redaction. Full reachable history, immutable staged-index blobs and a snapshot of tracked/non-ignored source are scanned; reported findings contain only rule/path/line/commit metadata. Scanner regression tests verify that synthetic secrets and unsafe configuration fail. CodeQL uses extended JavaScript/TypeScript queries and receives `security-events: write` only in its analysis job. Dependency audit fails for every advisory severity. CI additionally checks extension source/archive parity and extension security behavior.

Dependabot requests weekly npm/Actions updates against the hardening branch. Automatic merging is not configured. Repository-level Actions enablement, CodeQL availability, Dependabot/security alert settings, secret push protection and required-check branch rules require separate verification by the repository owner; configuration files alone do not prove these features are enabled. Hosted CodeQL results are not equivalent to local tests.
