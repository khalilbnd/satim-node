# Contributing to satim-node-sdk

Thank you for contributing. This document covers the development workflow for a security-sensitive payment SDK.

## Prerequisites

- Node.js **18+** (20 or 22 recommended)
- npm 9+

## Setup

```bash
git clone https://github.com/khalilbnd/satim-node.git
cd satim-node
npm install
npm test
```

## Development scripts

| Command                 | Purpose                   |
| ----------------------- | ------------------------- |
| `npm run lint`          | ESLint                    |
| `npm run typecheck`     | Strict TypeScript check   |
| `npm test`              | Unit + integration tests  |
| `npm run test:coverage` | Coverage with 90% gates   |
| `npm run build`         | Emit `dist/`              |
| `npm run docs`          | Generate TypeDoc API docs |

## Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint + husky):

```
feat: add per-operation timeouts
fix: reject http base URLs without allowInsecureHttp
docs: document idempotency behaviour
chore(deps): bump typescript
```

## Pull requests

1. Fork and create a feature branch
2. Add tests for bug fixes and features
3. Ensure CI is green (lint, typecheck, tests, coverage, security)
4. Fill out the PR template
5. Do **not** commit secrets, `.env` files, or real payment data

## Security contributions

See [SECURITY.md](./SECURITY.md). Prefer private advisories for vulnerabilities.

## Code style

- Prettier + ESLint are required
- No `console.*` in SDK source
- Prefer structured `SDKError` / `Satim*Error` over raw `Error`
- Never log payloads, credentials, tokens, or signatures

## Release process

Releases are automated via **semantic-release** on `main` with **npm provenance**.
Do not publish manually from a laptop unless recovering from an emergency (document why).
