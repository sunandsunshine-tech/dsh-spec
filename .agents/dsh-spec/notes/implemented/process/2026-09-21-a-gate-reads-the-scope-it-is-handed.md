# Agent Note: A gate reads the scope the dispatcher hands it

Status: implemented

English | [中文](2026-09-21-a-gate-reads-the-scope-it-is-handed.zh.md)

## Problem

Every gate discovers its own corpus. `verify-no-secrets` lists git's index, the prose gates glob `**/*.md` through `md-scope.ts`, the note gates enumerate the notes tree through `agent-note-tree.ts`, and the pairing gate derives its corpus from the file tree. Selection therefore lives in seven entry points, `--changed` can only decide *whether to run a whole gate*, and a scoped run repeats each selected gate's full walk. A gate can only be exercised against a whole repository, which is why none of them has ever run on a fixed input.

Every documented command also carries a tool prefix that belongs to neither the gate nor the project — `node` — so each of the repository's commands depends on a package manager, a registry store, and a postinstall build allowance. Node 22.19 runs these files directly: `node <gate>.ts --root .` passes, `process.features.typescript` reports `strip`, and a scan of the engine finds no `enum`, no `namespace`, no parameter property and no `import =`, which is the whole set of syntax type stripping rejects.

This is the note that partly supersedes [A diff selects the gates it owes](2026-09-21-a-diff-selects-the-gates-it-owes.md). That note's rationale — a diff chooses which gates it owes, and a scoped green never substitutes for the aggregate — still owns the behavior, and it stays active with its command facts updated. What changes here is where the selection is computed and what a gate is handed.

## Decision

### The command surface

One entry point, an action as a subcommand, and no operation spelled as a flag: a noun takes a verb, and a check requires exactly one scope — `--all`, a path list, `--files-from -`, or `--base <ref>` for the dispatch that derives the list from a change.

| Command | Verbs | Input | Function |
|---|---|---|---|
| `install` | — | `--dry-run`, `--jobs <n>`, `--revision <ref>`, `--with <name>` | Adopt: deploy the required skills and the optional ones `--with` names or a terminal answers yes to, at the manager's ref or the named revision; create the missing project files, sync the managed text |
| `upgrade` | — | `--reinstall`, `--dry-run`, `--jobs <n>`, `--revision <ref>`, `--only-skill-set` | Self-update the manager, re-execute it to refresh the deployment and the managed text; never creates a missing project file |
| `uninstall` | — | `--dry-run`, `--skill <name>` | Remove the skill directories only — the whole set, or the one `--skill` names — then name every artifact it left behind |
| `status` | — | — | Every required skill is installed at the manager's revision, an unlisted directory is classified by its injected `github-repo`, the delivery-plan surface is whole when its skill is held, and the dispatcher is present |
| `check` | — | `<path…>` / `--base <ref>` / `--head <ref>` / `--all` / `--files-from -` | Run the checks a selection owes, and print every subject it skipped |
| `notes` | `check` | `--all` / `<path…>` / `--files-from -` | Classification and format over the active lifecycles |
| `notes-archived` | `check`, `write` | `--all` | The frozen archive; `write` appends new seals |
| `translation-pair` | `check`, `list`, `explain <path>`, `write`, `brief` | `<path…>` / `--files-from -` | Pair completeness, structure parity and recorded hashes |
| `md-links` | `check` | `<path…>` / `--files-from -` | Link targets and the two shapes a bulk rewrite leaves behind |

Exit codes are `0` clean, `1` violations or failure, `2` usage.

### The gate input contract

```
dsh-spec <subject> <operation> --root <project> (--all | <path…> | --files-from -)
```

A scope entry is a repository-relative path: a **directory** is walked under that gate's own patterns and exclusions, a **file** is checked. At least one entry is required, and a path that exists outside the gate's scope is an error rather than a silent skip, so a mis-assembled dispatch cannot quietly drop a check. A path the change reports as **deleted** is accepted, because a deletion is a legitimate part of a change set and the check decides what a missing file means — a broken pair for `translation-pair`, nothing to read for `md-links`. `--all` is the gate walking its own root, which only a *tree assertion* may do — an unknown or missing class folder is not a statement about a file. `--files-from -` reads a path list from stdin, which is how the command layer expands a whole scope and how a long list avoids the argument limit. The credential scan is gone, so the scope vocabulary is `notes` (the three active lifecycles), `notes-archived` (`archived/`), `markdown`, and `pairs`; the `tracked` key disappears with the gate that owned it.

### The dispatcher owns selection

`check --base <ref>` reads the change through a ported `change-scope.ts`, which resolves base, head and merge base and reports committed, staged, unstaged and untracked paths in a versioned record; the commit message is never read, because a check gated on prose would be guessing. Each check then receives its scope: a **file-selection** check gets the changed paths inside its keys, a **tree-selection** check gets its root, and a check whose keys no changed path matches is skipped with its reason printed. `check --all` hands every tree check its root. Every dispatch prints one line per check, in record order and with a stable shape — `check <subject>: ok`, `check <subject>: FAIL`, or `check <subject>: skipped — <reason>` — so the report is scriptable and the suite can assert which checks a change selected.

Which kind a check is belongs to the mechanism, not to convenience. `md-links` decides the asking side per file, so a file selection is exact for the files it names and blind to a target someone else deleted; `notes-archived` asserts the seal over the whole archive; `notes` needs the directory tree for classification and only the text for format. Those differences are recorded per check rather than assumed.

### Parallelism

The two dispatch modes run checks through a bounded scheduler, defaulting to `min(availableParallelism(), 8)`, overridable with `--jobs <n>` and `DSH_SPEC_JOBS`; `--jobs 1` is sequential and no gate carries an async flag of its own. Output is captured per check and printed in record order, so parallel execution does not scramble the report. File-selection checks are additionally sharded across processes by the dispatcher, one process per slice, and each shard uses a bounded asynchronous read pool inside; the dispatcher merges the shard verdicts and exit codes. `install` and `upgrade` default to eight concurrent installer calls, because that work is network-bound: eight concurrent `gh skill install` calls measured 47 s against 120 s serial, and a larger pool risks the provider's secondary rate limits.

### Management

`install` is the adoption verb: deploy the required skills, and an optional one only when `--with <name>` names it or a terminal answers yes, at the manager's own ref or at the revision `--revision <ref>` names; create the project files that are missing; sync the text the skill set owns. It acts by default and `--dry-run` prints the plan. `upgrade` refreshes the deployment and the managed text, asks nothing about an optional skill — one the project already holds follows the set, and one it never took stays uninstalled — and never creates a missing project file, so a deliberately deleted `docs/AGENTS.md` stays deleted. A target revision is resolved in two levels — `--revision <ref>` wins, and without it the latest published release does — and only a tree with no installed manager metadata resolves one at all: `install` and `upgrade --only-skill-set` take their revision from the manager's injected ref. `upgrade` self-updates the manager when that target differs and re-executes the new copy, [`manager-lifecycle.md`](../../../../../skills/dsh-spec-manager/references/manager-lifecycle.md) writes out how, and [The manager's own install is the pin](2026-09-21-the-manager-s-own-install-is-the-pin.md) owns why. `status` compares every required skill with the manager's own injected ref, reports an optional skill the project did not take as absent rather than as a problem, classifies an unlisted directory by its injected `metadata.github-repo` — a finding for one this collection installed that the revision dropped, information for another collection's — and reports a delivery-plan surface whose skill is held without the tree or the hook. `uninstall` removes the whole set, or the one skill `--skill <name>` names — refusing a name the manifest does not carry, so another collection's directory is never touched — and names what it left: the notes tree, `docs/`, the marked blocks inside the root `AGENTS.md`, and `.rgignore`, because an uninstall that took them would delete the project's own decisions. Removing the optional workflow skill turns its plans block off while the plan tree and its plans stay.

`--no-notes` and `--no-docs` are gone. A flag that lets adoption skip the mechanism it adopts produces a project whose standing orders describe a tree that does not exist, whose documented paths resolve to nothing, and whose aggregate fails on the first check. The two notes that still describe `--no-docs` as live are corrected in the same change, which is the fate such flags invite.

### Node is the only runtime

Every command becomes `node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts <subject> <operation> …`. The engine's runtime dependencies are then Node 22.19 or newer, git for the archive seal, the pairing hashes and the change scope, and `gh` for the install and the revision index. pnpm, the dlx store, the esbuild build allowance and the network round trip that resolving `tsx` costs all leave the picture, and the one place that still spawned `pnpm dlx` — the sync step that re-records a pair — spawns `node`.

### The credential scan is dropped

The gate is removed with its script, because a `verify-*.ts` file the record does not name makes the dispatcher refuse every run; its `tracked` scope key goes with it. That removes the only mechanical check among the three rules in [Three rules from a memory pipeline](2026-09-20-three-rules-from-a-memory-pipeline.md), so that note's factual claims and its consequence are updated in the same change, and the rule stays a standing order rather than a gate.

### Check logic borrowed, interaction ours

Each check is split into a pure `check(input)` that stays close to dsh and a shell we own: flags, scope resolution, report, exit code. The seam keeps future upstream work cheap — a change to how a check decides lands in the ported function, while a change to how a project invokes it is ours and has no upstream to compare against. The provenance is recorded so that comparison is mechanical:

- `scripts/ports.json` — this repository's own record (it is not shipped, because it reads the pinned submodule): local file, upstream path, upstream sha, and a `relation` of `verbatim`, `adapted`, `split` or `rewrite`, which is what tells a future reader whether a diff is signal or noise.
- A one-line header in each ported module naming the same three facts.
- `scripts/verify-port-provenance.ts` — an offline gate that reconciles the two, proves each upstream path exists at the recorded sha in `submodules/dsh`, checks the baseline pin against the root `AGENTS.md`, and refuses an empty registry.
- `scripts/ports.ts` — `--list`, `--diff <local>` and `--status`, which produce the upstream comparison and the list of ported paths upstream has moved since the recorded sha.

dsh's `run-gates.ts` is not ported: it binds pnpm invocations and dsh's own mode inventory, so importing it would drag pnpm back in. Our scheduler **mirrors** its shape — a bounded pool, buffered output in deterministic order, per-check status — and its registry entry says `mirrors` rather than `port`.

## Migration order

Seven steps, each with its own commit and its own evidence, in an order that keeps comparison possible:

1. **The test suite.** A repository-side `tests/` tree, written before any implementation: one case per acceptance criterion below, with helpers that build scratch repositories and seed the defects a check must catch. It is run by `node --test 'tests/**/*.test.ts'`, so the suite needs no dependency either. Evidence: the suite runs, its cases fail where the design is not implemented yet, and each later step turns its own cases green.
2. **Provenance and runtime.** The registry, the module headers, the offline provenance gate and the ports script; the engine's internal spawns move from `pnpm dlx tsx` to `node`. Evidence: every check run with `node` reports what it reports today.
3. **The input contract.** `gate-scope.ts`; every check split into `check(input)` and a shell; the scope vocabulary reduced to four keys; the credential check and its script removed. Evidence: full scans byte-identical to step 2, seeded defects still caught, and an absent or out-of-scope selection refused.
4. **The check command surface.** `dsh-spec.ts` with subjects and operations, the ported change scope, the bounded scheduler and the sharding. Evidence: what a clean tree, an engine change, a note change and a paired change select; concurrency 1 equals the default.
5. **The management verbs.** `install`, `upgrade`, `uninstall` and `status` in one entry point, no revision flag, no `--no-notes`. Evidence: a dry run, a real refresh, a reported drift, an uninstall plan.
6. **Documentation and references.** Every shipped command, template and reference rewritten to the new surface; the dead entry-point branch removed; the notes that state changed mechanisms corrected in place and cross-linked. Evidence: the reference checker finds no dangling path and the aggregate is green.
7. **Publication.** The installed copy refreshed in the same change as each source change, a fresh clone green, and the pull request description.

The suite comes first because a check that is being rewritten needs its verdicts pinned before the rewrite, and steps 2 and 3 come before the command surface so each can be compared against the previous behavior; documentation comes last so no command is written twice. Every step above landed, and the partial supersession of [A diff selects the gates it owes](2026-09-21-a-diff-selects-the-gates-it-owes.md) is recorded there rather than here.

## Required verification

- Every check exits `2` with its usage when no scope is given, and `1` when a handed path exists outside its scope; a deleted path is accepted rather than refused.
- Each check produces, on this repository, the same verdicts as the engine at `f14e91c`: full scans compared check by check, and each check re-run against seeded defects — a broken link, a mangled link, an out-of-sync pair, a malformed note, an unknown class folder, an unsealed archived triplet.
- `check` on a clean tree skips every check and prints why; a changed engine file selects no check at all; a changed active note selects `notes` and `md-links`; a changed archived file selects `notes-archived` alone; a changed paired document selects `translation-pair` and `md-links`; a changed unpaired document selects `md-links`; a renamed target selects `md-links` for the renamed paths and the break in its untouched referrer is not reported, which is the documented limit.
- The tree checks read by `check --all` and the file checks read from a path list report the same verdict whether they run at concurrency 1 or through the default pool.
- `install --dry-run` reports the plan and changes nothing; `upgrade` refreshes a stale installed copy; `status` exits non-zero on a revision mismatch; `uninstall --dry-run` names every artifact it would leave.
- The aggregate is green from a fresh clone of this repository, and the installed copy is refreshed in the same change as every source change.
- `node --test 'tests/**/*.test.ts'` is green, and every case in it was written before the implementation it exercises.
- No shipped skill text names a `<gate>.ts` path, a bare `scripts/` path, or a `pnpm dlx` invocation.

## Risks

- **A file selection is narrower than a full scan for `md-links`.** The invariant that a scoped green never substitutes for the aggregate now carries the deleted-target case, and the note that owns that invariant must say so.
- **Two owners of one scope rule.** The dispatcher selects and the check re-applies, both through the same modules; a check that stops calling them, or a scope key resolved by hand, reintroduces the drift this design removes.
- **Untracked files.** A file-selection check reads what it is handed, so `check <path...>` reads an untracked file that an index-based pass would not, and `check --base <ref>` lists one too — the direction a pre-push check wants, and a difference worth stating.
- **Sharding multiplies processes.** Real CPU parallelism comes from the dispatcher's slices, not from one process; how much a check gains is a measurement, and a check that gains nothing is reported as gaining nothing.
- **A provenance record rots unless something reads it.** The `--no-docs` flags that survived their own removal in two notes are the precedent; the offline gate is what keeps the registry and the headers from drifting apart.
- **Dropping the credential scan** removes the only mechanical enforcement among the three rules, and no later check replaces it.

## Alternatives considered

**A facade: keep the gates byte-identical and let `--scope` choose which gates run.** The smallest change, the cheapest upstream tracking, and it needs no seam inside any gate. It lost because a self-walking gate cannot answer "check exactly these files": the path-level selection, the dispatcher's sharding and the per-check input contract are precisely what it cannot express, so the CLI would ship the commands without the behavior that motivated them.

**Keep dsh's files verbatim behind an adapter layer.** Upstream updates would be file replacements. It lost because the adapter has nothing to adapt *to*: without a per-file entry point, the only scope an adapter can express is whole-gate, which is the facade above with extra machinery.

**Rewrite each gate freely and track nothing.** The fastest route to the target interface. It lost because every future upstream change would then be a manual merge inside a file with no record of what was borrowed, which is the maintenance cost this proposal exists to bound.

**Two input flags, `--files` and `--scan`.** Unambiguous about intent. It lost because the kind is already carried by the path, and `--files-from -` covers the one case a flag could not: a list too long for the argument vector.

**Keep `--rev` on install and upgrade.** One flag, and a project can pin any revision it likes. It lost at the time because a revision chosen outside the manifest mixed a skill set with scripts and references from another rev, which is the mismatch `status` exists to report and the skill set must not be able to create. [The manager's own install is the pin](2026-09-21-the-manager-s-own-install-is-the-pin.md) later reached the same surface from the other direction: the flag exists, and the revision it names is the one the whole set installs at, because the manifest field it once contradicted is gone.

**Keep `--no-notes`.** Adoption without the decision tree. It lost because the rest of what adoption writes assumes that tree, so the flag buys a project a contract it cannot satisfy.

**Keep the credential scan.** It is the one rule of the three a script enforces honestly. It lost to a scope decision: the check set is the maintainer's, and the rule survives as a standing order.

**Unbounded concurrency.** Fastest on a small repository. It lost the way dsh's own scheduler records it: process count, memory pressure and readable logs are what an unbounded pool gambles with, and a provider's rate limits punish it.

**Record provenance as globs in the manifest, or as line anchors in the code.** Self-describing and local. They lost because the manifest describes the shipped skill set rather than this repository's submodule, and a line number is invalidated by one insertion upstream; the file-and-sha pair is the stable anchor.

## Consequences

The dispatcher becomes the single answer to which paths a change touched and which check owes them; a check becomes a function of an input it is handed, which is the shape a test needs; and the aggregate stays the only thing that answers for the whole corpus. The engine's runtime dependency list collapses to Node, git and `gh`, which is also what makes the commands short enough to read. The command surface is one entry point with subjects and operations, so a check can gain an operation without a new script and a reference can never name a path the installed layout hides.

The porting discipline is the part that has to be maintained: every new use of dsh's logic either lands in the registry with its relation recorded or is a deliberate departure, and the offline gate is what makes that a check rather than an intention. The cost is a seam inside every check and a registry that must be kept true; the payoff is that upstream's next move produces a small diff in a named function instead of a re-reading of the whole file.
