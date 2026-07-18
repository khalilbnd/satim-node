# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-07-18

Thanks to [@Fcmam5](https://github.com/Fcmam5) for the detailed review and feedback that motivated this hardening release.

### Security

- **Removed Axios** in favor of the native Fetch API (zero runtime dependencies).
- **Removed all `console.*` logging.** The SDK never writes to the consumer's console.
- **Stopped logging request/response payloads.** Optional `logger` receives metadata only (endpoint, status, duration, requestId).
- **Prototype pollution protection** for `additionalParams` via recursive sanitizer (rejects `__proto__`, `constructor`, `prototype`).
- **HTTPS enforcement** for API base URLs; `http://` requires explicit `allowInsecureHttp: true`.
- **Deprecated `verifySsl: false`** — TLS certificate verification bypass is no longer supported.

### Added

- Structured `SDKError` / `SDKErrorCode` with `code`, `status`, `operation`, `requestId`, `cause`.
- Optional injectable `SatimLogger`.
- Per-operation timeouts (`timeouts.registerOrder`, `confirmOrder`, `refund`, `status`, …) and per-request overrides.
- Optional retry policy (`retries`) — **off by default**.
- Client-side **idempotency** for concurrent `registerOrder` calls (`idempotencyKey` or `orderNumber`).
- OSS tooling: ESLint, Prettier, EditorConfig, Husky, lint-staged, commitlint.
- CI/CD: GitHub Actions (Node 18/20/22), CodeQL, Dependabot, semantic-release + npm provenance.
- Security policy, contributing guide, issue/PR templates, CODEOWNERS, SBOM script, supply-chain docs.

### Changed

- Project layout reorganized under `src/{client,http,services,models,errors,utils,security,types,constants}`.
- `index.ts` is now a public API barrel only.
- Node.js engine requirement raised to **>= 18** (Fetch / AbortController).
- TypeScript strictness: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, etc.

### Deprecated

- `SatimConfig.debug` — no effect; use `logger` instead.
- `SatimConfig.verifySsl: false` — ignored; use proper CA configuration.

### Breaking changes

| Change                                                 | Why                            | Migration                                                            |
| ------------------------------------------------------ | ------------------------------ | -------------------------------------------------------------------- |
| Node.js >= 18 required                                 | Native Fetch replaces Axios    | Upgrade Node                                                         |
| Runtime deps `axios`, `qs`, `dotenv` removed           | Fewer supply-chain risks       | Remove unused peer installs; load `dotenv` yourself in apps          |
| `debug: true` no longer prints to console              | Prevent credential/PAN leakage | Inject `logger` for safe metadata                                    |
| `verifySsl: false` no longer disables TLS verification | Insecure by design             | Fix CA trust; for local **HTTP** mocks use `allowInsecureHttp: true` |
| HTTP `baseUrl` rejected by default                     | Force TLS                      | Set `allowInsecureHttp: true` only for local mocks                   |

Existing error classes (`SatimApiError`, `SatimNetworkError`, …) remain and now extend `SDKError`.

## [1.1.1] - previous

- Prior Axios-based release.
