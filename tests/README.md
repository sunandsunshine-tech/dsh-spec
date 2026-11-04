# Functional suite

The suite covers the checks and tooling this repository owns rather than the skills it ships: the DCO
check, the vendored-notices submission, the skill gate, the draft lifecycle and the installed-copy
refresh.

```sh
pnpm test
```

Node 22.19 or newer is the only requirement: the runner executes TypeScript directly, so the suite
needs no dependency and no transform; `pnpm test` is the documented entry point, and the scripts rely
on the same property.

## Layout

| Path | Owns |
|---|---|
| `helpers/fixtures.ts` | Scratch repositories: a temporary directory with its own `git init`, files, and a commit. A gate reads its scope through `--root`, so a case needs a real repository rather than a mock. |
| `helpers/workspace.ts` | Scratch directory trees for the workspace tooling: a temporary root, files written into it, and a disposal, without Git. |
| `helpers/cli.ts` | Invoking a repository-side script, and reading its exit status and both streams. |
| `dco.test.ts` | `scripts/verify-dco.ts`: the trailer half, decided from `git log` alone, and the bot-identity half, decided against a `gh` stand-in. |
| `vendored-submission.test.ts` | `scripts/submit-vendored.ts`: the payload the dependency-submission endpoint requires, printed by a dry run. |
| `skill-spec.test.ts` | `skills/dsh-spec-skill-forge/script/verify-skill-spec.mjs`: the mechanical half of Agent Skills conformance. |
| `forge-lifecycle.test.ts` | `skills/dsh-spec-skill-forge/script/forge.mjs`: the work draft, review draft and landing lifecycle, including the landing cleanup scope. |
| `refresh-skills.test.ts` | `scripts/refresh-skills.ts`: each skill under `skills/` replaces its installed copy, and other installed skills stay alone. |
| `repository-shape.test.ts` | The tree invariants the tooling relies on: every package script is one command, and every landed skill has an identical installed copy. |

## Rules this suite keeps

- **No network.** Every case is local: the DCO check's GitHub lookup runs through a `gh` stand-in
  first on `PATH`, and the submission is exercised through `--dry-run`.
- **A case pins the behavior, not the implementation.** It names the behavior in the test title, so a
  failure reads as a statement about the design rather than about a line of code, and a refactor that
  preserves the contract leaves it passing.
- **Every acceptance criterion has a case**, and a defect gets a case that reproduces it before the fix.
- **Fixtures are built, not committed.** A scratch repository or workspace is created per case and
  disposed after it, so a case cannot depend on another's leftovers.
