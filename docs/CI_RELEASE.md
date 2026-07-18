# CI release setup (semantic-release)

The Release workflow (`.github/workflows/release.yml`) runs on every push to `main`.

## Required GitHub secret: `NPM_TOKEN`

Without a valid token you will see:

```text
EINVALIDNPMTOKEN Invalid npm token.
401 Unauthorized - GET https://registry.npmjs.org/-/whoami
```

### Create the token (do this in the browser — never paste tokens into chat)

1. Open [npm Access Tokens](https://www.npmjs.com/settings/~/tokens)
2. Generate a **Granular Access Token**:
   - **Permissions:** Read and write
   - **Packages:** select `satim-node-sdk` (or all packages you own)
   - **Expiration:** set an expiry you are comfortable with
3. If your npm account uses 2FA, either:
   - use a granular token that can publish, **or**
   - for classic tokens set 2FA to **Authorization only** (not “Authorization and writes”) — semantic-release cannot prompt for OTP

### Add the secret to GitHub

1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `NPM_TOKEN` (exact spelling)
4. Value: paste the token once, save

### Verify

Push a commit to `main` (or re-run the failed Release workflow).  
`verifyConditions` for `@semantic-release/npm` should succeed.

## Notes

- `GITHUB_TOKEN` is provided automatically by Actions; no secret needed for GitHub releases.
- Provenance (`NPM_CONFIG_PROVENANCE=true`) only works in Actions with `id-token: write`.
- `1.2.0` was already published manually. After fixing the token, semantic-release will only cut a **new** version when there are releasable commits since the last git tag (e.g. `feat:` → minor). Tag `v1.2.0` on the release commit if you want the history aligned.
