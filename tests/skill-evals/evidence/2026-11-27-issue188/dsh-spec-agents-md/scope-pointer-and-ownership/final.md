Updated [AGENTS.md](/workspace/AGENTS.md) and [packages/worker/AGENTS.md](/workspace/packages/worker/AGENTS.md).

The root file now covers dependency installation, repository checks, and an actionable release-guide pointer. The worker file independently includes the root checks plus its filtered test command. Product copy, the volatile release number, generic advice, and unsupported formatting guidance were removed. `README.md` and `docs/releasing.md` remain unchanged.

Verification:

- `pnpm test`: passed
- `pnpm --filter @acme/worker test`: passed
- `pnpm build`: blocked because `tsc` is unavailable; `pnpm install` reports up to date, and the manifests do not declare TypeScript.