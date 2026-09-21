# Installing, upgrading, removing and inspecting the set

A project receives this package as a set of skills at one revision, and this mode is the only thing that decides what that set contains. The filesystem does not: skill discovery is repository-wide, and the vendored baseline in this repository carries another project's skills, so a directory walk would install entries this package does not own. The manifest is the authority.

## The manifest

The manifest lives in this skill's `references/`. It is the one list the manager reads and writes nothing into, and it holds four facts: the skills to install, the revision every one of them comes from, the gates this collection publishes, and each gate's scope — the surfaces it answers for and how it is handed them. A gate is a recorded name backed by a file, and the two must agree: `gates` is the record a reader reviews in a diff, while the `verify-*.ts` script beside the entry point is what makes that name runnable. A recorded name with no script, and a `verify-*.ts` script the record does not name, are both refusals — the entry point reconciles the two before it runs anything.

| Field | Holds | Absent |
|---|---|---|
| `repo` | The `owner/name` the skills are installed from | Fail, naming the field |
| `revision` | The pinned commit, branch or tag every skill is installed at | Fail, naming the field |
| `skills` | The names to install, one string each | Fail when the array is missing or empty |
| `gates` | The gate names this collection publishes, one `verify-*` string each, every one backed by a script beside the entry point | The entry point refuses, naming the field |
| `scopes` | One record per gate: `keys` (which surfaces it answers for) and `selection` (`root` when its assertion is about a tree, `files` when it reads exactly the paths it is handed) | The entry point refuses, because it would have to guess what the gate reads |

A skill name is checked against the grammar the provider applies — `^[a-z0-9]+(?:-[a-z0-9]+)*$` — because it becomes a path: a directory under the skills directory. Anything else is refused with the offending name in the message. A recorded gate name is checked against the grammar its file must match — `^verify-[a-z0-9]+(?:-[a-z0-9]+)*$` — because it becomes `<name>.ts` beside the entry point; a name outside that grammar, and a name recorded twice, are refused with the offending entry in the message. The scope record is validated for completeness rather than trusted: every recorded gate must have one, a key or a selection outside the closed sets is refused, and a scope for a gate the record does not name is refused too. A manifest that is missing, unreadable, or names no skill is a failure, not a default: the manager exits non-zero and prints the path it looked for and the field it could not find.

## Install and upgrade

`install` adopts the collection into a project:

```sh
gh skill install <repo> dsh-spec-manager@<ref> --dir <project>/.agents/skills --force
node <project>/.agents/skills/dsh-spec-manager/scripts/dsh-spec.ts install --root <project>
```

The first line is the only place a revision is named, and it fetches the manager alone — whose manifest then pins the revision for everything else. `install` deploys every skill in the manifest at that revision, creates the project files that are missing, and syncs the text the collection owns. `upgrade` refreshes the deployment and the managed text and **creates nothing**, so a file a project deliberately deleted stays deleted. Neither verb takes a revision: a set whose members sit at different revisions is the drift `status` exists to report, not a state a flag may create.

Both act by default and `--dry-run` prints the plan first; a dry run touches nothing and reads nothing over the network.

The installer is what records the revision: it injects a `metadata:` block into the installed `SKILL.md` naming the repository (`github-repo`), the ref it resolved (`github-ref`) and the tree it copied (`github-tree-sha`). Nothing else is written — the installed files are the record.

An install is incremental. The entry point reads the revision's tree once, which answers three questions: whether an installed skill is already that revision's content (compared against the tree sha the installer injected), which files the revision ships (so anything else in the installed directory is pruned), and whether a file changed since it was installed (compared by blob sha). `SKILL.md` is compared by tree sha rather than by content, because the installer re-serializes its frontmatter. `--reinstall` forces the copy for the case the file comparison cannot see.

## The engine directory and the entry point

This skill's `scripts/` is the collection's engine, not this skill's private resources. Every check's code lives there, beside the entry point that runs one by subject and the modules they all import: the notes root, the scope modules, the Markdown parser and the vendored bundle it parses with. [`scripts/README.md`](../scripts/README.md) documents the one vendored bundle those checks parse Markdown with, and how to regenerate it. The other skills ship their `SKILL.md` and their `references/` and no code at all, so installing the manager already puts every check in the project, and **there is nothing to release and no copy to make**: a second copy would be a second authority with nothing to keep the two in step.

One directory means one relative shape. A skill sits at `skills/<name>/` in the source tree and `.agents/skills/<name>/` in a project, and the engine sits at `scripts/` inside the manager's directory in both, so a check and the modules it imports are always siblings: a check imports a shared module as `./<module>.ts`, and the engine directory is derived from where the entry point sits, so there is no path for anything to record.

A project reaches a check by subject, never by a script path:

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts notes --check --all --root .
```

| Subject | Operation | Scope |
|---|---|---|
| `notes` | `--check` | `--all`, `<note...>`, or `--files-from -` |
| `notes-archived` | `--check`, `--write` | `--all` |
| `translation-pair` | `--check`, `--list`, `--explain <path>`, `--write` | `<pair...>` or `--files-from -`; `--write --all` is the corpus form |
| `md-links` | `--check` | `<markdown...>` or `--files-from -` |
| `commit` | `--check` | `--base <ref>`, `--head <ref>` |
| `all` | `--check` | the checks whose assertion is about a tree |
| `brief` | `[--apply]` | `<pair...>` |
| `install`, `upgrade`, `uninstall`, `status` | — | the project |

A scope is exactly one of `--all`, a path list, or `--files-from -`, and a check without one is a usage error rather than a full scan. A path that exists outside the check's scope is a violation, because a dispatcher that assembled the wrong list must be visible; a path the change reports as deleted is accepted, and what a missing file means is the check's decision. `--jobs <n>` (or `DSH_SPEC_JOBS`) bounds how many checks run at once; output is captured per check and printed in record order, so a dispatch reads the same at any width.

`commit --check` reads the change through `change-scope.ts`, which resolves base, head and merge base and reports committed, staged, unstaged and untracked paths. It then hands each subject the scope its record says it reads and prints one line per subject — `check <subject>: ok`, `FAIL`, or `skipped — <reason>` — in record order. The commit message is never read: a check gated on prose would be guessing.

The entry point resolves a subject against the manifest's `gates` record, and before it runs anything it reconciles that record with the files beside it: a recorded gate with no `verify-*.ts` script, or a `verify-*.ts` file the record does not name, is a mismatch, and it prints both sides — the record's names and the directory's scripts — names each exact pair that failed to match, and exits non-zero without starting a check. That reconciliation is what lets the record be the authority without turning a stray file into a runnable gate: only a recorded name can run, and a file nobody recorded stops the run as the disagreement it is. A subject the record does not hold is an error, never a skip, and the refusal names what the record does hold.

## Status and uninstall

`status` reports and exits non-zero when any of these is untrue:

1. **The installed set equals the manifest.** A manifest skill with no directory is missing; a directory with a `SKILL.md` that no manifest entry names is unlisted.
2. **Each skill sits at the pinned revision, read from the installed file.** The manager reads the `metadata:` block out of the installed `SKILL.md` and compares the ref it names against the manifest's `revision`. A file with no such block was not put there by an install, so it is reported by name as not being an install of the pin rather than passed as agreement.
3. **The entry point is present**, so a documented command resolves at all.

`status` changes nothing. It is the check to run before a push that touches an instruction file, and the reason a stale deployment is a finding rather than a silent condition.

`uninstall` removes each manifest skill's directory, and nothing else. The engine, the entry point and the manifest live inside the manager skill's own directory, so that step removes them with it — and it names what it is leaving behind, because those are the project's own: the marked block inside the root `AGENTS.md`, the notes tree under `.agents/dsh-spec/notes/`, `docs/`, and `.rgignore`. An uninstall that took them would delete decisions and standing orders the project made for itself. `--dry-run` prints the plan.

## Boundaries this mode keeps

- **The decision-record contract is not the manager's.** Validating notes, checking supersession and archiving belong to [`dsh-archive-agent-notes`](../../dsh-archive-agent-notes/SKILL.md).
- **An installed skill is never edited in place.** A change belongs to the collection that publishes it, and the project takes it by upgrading at a new revision.
- **The manager writes nothing outside the skills directory and the files it manages.** A terminology table keeps the project's rows, `AGENTS.md` keeps everything outside the marked block, and every other file in a project is the project's.

## Files

- `scripts/dsh-spec.ts` — the one entry point. It reconciles the recorded gate names against the scripts beside it, resolves a subject and an operation, assembles each check's scope through the module that owns that surface, dispatches through a bounded pool, and reports one line per subject.
- `scripts/manager.ts` — the deployment: `install`, `upgrade`, `uninstall` and `status`, plus the revision index, the incremental copy and the prune. Zero external dependencies, run through `node`.
- `scripts/init-agents-md.ts` — the initializer `install` runs: what it creates, what it never overwrites, and the managed text it syncs. [`manager-install.md`](manager-install.md) is its subject.
- `references/manifest.json` — the authority described above: the skills, the pinned revision, the gates, and each gate's scope.
- `scripts/manifest.ts` — reads that file: its path, the recorded gate names with their grammar, and the per-gate scope record.
- `scripts/gate-scope.ts` — the scope contract: the gate's own selection kind, the argument grammar, the dispatcher's expansion of a surface, and the ownership question `commit --check` asks of every changed path.
- `scripts/change-scope.ts` — the ported change report behind `commit --check`.
- `scripts/` — the collection's engine: every check, the entry point, and the modules they import.
