# Automated code review

## Required status checks

Configure branch protection on `main` to require:

- `Build & Test (Node 18)`
- `Build & Test (Node 20)`
- `Build & Test (Node 22)`
- `Security checks`
- CodeQL

Minimum coverage is enforced in Jest (`coverageThreshold` ≥ 90%).

## GitHub Copilot code review

1. Enable Copilot for the organization/repo
2. Settings → Rules → add a ruleset requiring Copilot review on PRs (optional)
3. Or request `@github-copilot` review manually on PRs

## CodeRabbit

Optional: install the [CodeRabbit](https://coderabbit.ai) GitHub App.

A starter config is provided in `.coderabbit.yaml`.

## Dependabot

Enabled via `.github/dependabot.yml` for npm and GitHub Actions.

## Renovate

Optional alternative — see `renovate.json`. Do not enable both Dependabot and
Renovate for the same ecosystems unless you intentionally split scopes.
