# Functional suite

The checks this collection publishes decide whether a project's prose, notes, pairs and links are
sound. This suite is what says the checks themselves behave: it was written against the design in
[`2026-09-21-a-gate-reads-the-scope-it-is-handed`](../.agents/dsh-spec/notes/implemented/process/2026-09-21-a-gate-reads-the-scope-it-is-handed.md)
**before** that design was implemented, so its cases fail where the design is not built yet and turn
green as each migration step lands.

```sh
node --test 'tests/**/*.test.ts'
```

Node 22.19 or newer is the only requirement: the runner executes TypeScript directly, so the suite
needs no dependency, no transform and no package manager — the same property the engine relies on.

## Layout

| Path | Owns |
|---|---|
| `helpers/fixtures.ts` | Scratch repositories: a temporary directory with its own `git init`, files, and a commit. Checks read a project through `--root`, so the archive seal, the pairing hashes and the change scope all need a real repository rather than a mock. |
| `helpers/cli.ts` | Invoking the source engine, and parsing the dispatch report (`check <subject>: ok \| FAIL \| skipped — <reason>`). |
| `cli.test.ts` | The command surface: the verbs, the nouns with their verbs, and the usage failures. |
| `scope.test.ts` | The gate input contract: exactly one scope, out-of-scope paths refused, deletions accepted, an empty list refused. |
| `notes.test.ts` | `notes check`: the active tree only. |
| `notes-archived.test.ts` | `notes-archived check`: the closed kind tree and the append-only seal. |
| `translation-pair.test.ts` | Pair detection as a union of switcher and naming family, and the consistency record. |
| `md-links.test.ts` | Link resolution and the two shapes a bulk rewrite leaves behind. |
| `norm-reference.test.ts` | The installed skill set's citations: a catalog id resolves, a seeded wrong id fails, and an empty corpus is refused. |
| `check.test.ts` | Which checks a selection owes — the three selections, including the documented limit. |
| `parallel.test.ts` | Bounded dispatch: concurrency changes neither a verdict nor the report order. |
| `management.test.ts` | `install`, `upgrade`, `uninstall` and `status`, offline (`--dry-run` only), plus the initializer's sync and the command it re-records through. |
| `rendered-commands.test.ts` | Every `node … dsh-spec.ts …` line the engine renders — the initializer's inventory, the record's recovery command, the briefing's Finish steps — is a command the entry point accepts. |
| `ports.test.ts` | The provenance registry, the module headers, and the offline gate that reconciles them. |

## Rules this suite keeps

- **The source engine, never the installed copy.** `skills/dsh-spec-manager/scripts/` is what these
  cases run; `.agents/skills/` is a deployment that only `gh` may change.
- **No network.** Every case is local: `install` and `upgrade` are exercised through `--dry-run`.
- **A case pins the behavior, not the implementation.** It names the behavior in the test title, so a
  failure reads as a statement about the design rather than about a line of code, and a refactor that
  preserves the contract leaves it passing.
- **Every acceptance criterion has a case**, and a defect gets a case that reproduces it before the fix.
- **Fixtures are built, not committed.** A scratch repository is created per case and disposed after
  it, so a case cannot depend on another's leftovers.
