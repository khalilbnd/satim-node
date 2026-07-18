# Supply Chain Security

This document describes how `satim-node-sdk` protects consumers against compromised builds and dependencies.

## npm provenance

Published packages from **GitHub Actions** (`.github/workflows/release.yml`) set
`NPM_CONFIG_PROVENANCE=true` so attestations are generated in CI.

Local `npm publish` does **not** support automatic provenance (`provider: null`).
Do not set `"provenance": true` in `package.json` `publishConfig` if you also
publish from a laptop — that flag breaks local publishes.

Consumers can verify:

```bash
npm view satim-node-sdk dist.attestations
```

## SBOM

Generate a CycloneDX SBOM locally:

```bash
npm run sbom
```

This writes `sbom.cdx.json` (gitignored). Attach SBOMs to GitHub Releases as needed.

## Dependency updates

- **Dependabot** — weekly npm + GitHub Actions updates (`.github/dependabot.yml`)
- **Renovate** — optional (`renovate.json`); enable the Renovate app if preferred
- **dependency-review** — blocks PRs introducing known-vulnerable packages
- **npm audit** — runs in CI at `high` severity threshold
- **CodeQL** — static analysis on push/PR/schedule

## Secret scanning

Enable in GitHub:

- Secret scanning
- Push protection

Never commit `.env`, merchant credentials, or card data.

## Signed releases

semantic-release creates GitHub Releases from conventional commits on `main`.
Tag integrity is provided by GitHub + npm provenance attestation linking the
package tarball to the exact workflow run and commit SHA.

## Consumer recommendations

1. Pin exact versions in lockfiles for applications
2. Run `npm audit` in your own CI
3. Prefer HTTPS-only configuration (`allowInsecureHttp` off)
4. Inject a logger instead of relying on SDK console output (none is emitted)
5. Use idempotency keys / unique `orderNumber` values for payment registration
