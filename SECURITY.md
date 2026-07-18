# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email the maintainers (via the GitHub repository security advisory form preferred):

1. Open a [private security advisory](https://github.com/khalilbnd/satim-node/security/advisories/new)
2. Include:
   - Affected version(s)
   - Impact assessment
   - Reproduction steps (without live PANs or production credentials)
   - Suggested fix if available

We aim to acknowledge reports within **72 hours** and provide a remediation timeline after triage.

## Safe disclosure guidelines

- Never include real card numbers (PAN), CVV, merchant passwords, or production tokens.
- Prefer synthetic test data from the SATIM sandbox.
- Do not publicly discuss unfixed vulnerabilities.

## Security features in this SDK

- Native HTTPS enforcement (HTTP only with explicit `allowInsecureHttp`)
- No console logging of payloads or credentials
- Prototype-pollution sanitization of user-provided maps
- Client-side idempotency guards for concurrent `registerOrder` calls
- Structured errors without leaking secrets
- npm provenance on published releases
- Dependabot + CodeQL + dependency review in CI
