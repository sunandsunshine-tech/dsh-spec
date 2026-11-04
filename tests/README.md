# Functional suite

The suite covers the gates this repository owns rather than the skills it ships: the DCO check and
the vendored-notices submission.

```sh
node --test 'tests/**/*.test.ts'
```

Node 22.19 or newer is the only requirement: the runner executes TypeScript directly, so the suite
needs no dependency, no transform and no package manager — the same property the scripts rely on.

## Layout

| Path | Owns |
|---|---|
| `helpers/fixtures.ts` | Scratch repositories: a temporary directory with its own `git init`, files, and a commit. A gate reads its scope through `--root`, so a case needs a real repository rather than a mock. |
| `helpers/cli.ts` | Invoking a repository-side script, and reading its exit status and both streams. |
| `dco.test.ts` | `scripts/verify-dco.ts`: the trailer half, decided from `git log` alone, and the bot-identity half, decided against a `gh` stand-in. |
| `vendored-submission.test.ts` | `scripts/submit-vendored.ts`: the payload the dependency-submission endpoint requires, printed by a dry run. |

## Rules this suite keeps

- **No network.** Every case is local: the DCO check's GitHub lookup runs through a `gh` stand-in
  first on `PATH`, and the submission is exercised through `--dry-run`.
- **A case pins the behavior, not the implementation.** It names the behavior in the test title, so a
  failure reads as a statement about the design rather than about a line of code, and a refactor that
  preserves the contract leaves it passing.
- **Every acceptance criterion has a case**, and a defect gets a case that reproduces it before the fix.
- **Fixtures are built, not committed.** A scratch repository is created per case and disposed after
  it, so a case cannot depend on another's leftovers.
