Updated [AGENTS.md](/workspace/AGENTS.md:1) and [services/api/AGENTS.md](/workspace/services/api/AGENTS.md:1). Applying the AGENTS.md scope guidance, I removed the release, migration, README-owned, and generic content; retained the root-wide build command; and made the API file self-contained with the repository build, corrected `@acme/api` test command, and a working `../../docs/deploy.md` deployment pointer.

Verification:

- `pnpm --filter @acme/api test` passes; the package reports zero tests.
- `git diff --check` passes.
- Only the two AGENTS.md files are modified.
- `pnpm build` was attempted but cannot compile because `tsc` is unavailable; the repository has no installed dependencies or lockfile, and the API manifest does not declare TypeScript. No prohibited files were changed.