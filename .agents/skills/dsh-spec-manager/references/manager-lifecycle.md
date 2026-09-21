# Installing, updating, syncing, removing and inspecting the set

A project receives this package as a set of skills at one revision, and this mode is the only thing that decides what that set contains. The filesystem does not: skill discovery is repository-wide, and the vendored baseline in this repository carries another project's skills, so `--all` would install entries this package does not own. The manifest is the authority.

## The manifest

The manifest lives in this skill's `references/`. It is the one list the manager reads and writes nothing into, and it holds four facts: the skills to install, the revision every one of them comes from, the gates this collection publishes, and the surface each of those gates answers for — a scope key (`notes`, `markdown`, `pairs`, `tracked`) that the dispatcher resolves through the module that already owns those paths, which is what lets `run.ts --changed --base <ref>` run the gates a diff owes and print the ones it skipped. A gate is a recorded name backed by a file, and the two must agree: `gates` is the record a reader reviews in a diff and the dispatcher resolves a name against, while the `verify-*.ts` script beside the dispatcher is what makes that name runnable. A recorded name with no script, and a `verify-*.ts` script the record does not name, are both refusals — the dispatcher reconciles the two before it runs anything.

| Field | Holds | Absent |
|---|---|---|
| `repo` | The `owner/name` the skills are installed from | Fail, naming the field |
| `revision` | The pinned commit or tag every skill is installed at | Fail, naming the field |
| `skills` | The names to install, one string each | Fail when the array is missing or empty |
| `gates` | The gate names this collection publishes, one `verify-*` string each, every one backed by a script beside the dispatcher | The dispatcher and the initializer refuse, naming the field |

A skill name is checked against the grammar the provider applies — `^[a-z0-9]+(?:-[a-z0-9]+)*$` — because it becomes a path: a directory under the skills directory. Anything else is refused with the offending name in the message. A recorded gate name is checked against the grammar its file must match — `^verify-[a-z0-9]+(?:-[a-z0-9]+)*$` — because it becomes `<name>.ts` beside the dispatcher; a name outside that grammar, and a name recorded twice, are refused with the offending entry in the message. A manifest that is missing, unreadable, or names no skill is a failure, not a default: the manager exits non-zero and prints the path it looked for and the field it could not find.

## Install

One `gh skill install` call per manifest entry, every one of them at the same pinned revision:

```sh
gh skill install <repo> <name>@<revision> --dir <project>/.agents/skills --force
```

The installer is what records the revision: it injects a `metadata:` block into the installed `SKILL.md` naming the repository (`github-repo`), the ref it resolved (`github-ref`) and the tree it copied (`github-tree-sha`). Nothing else is written — the installed files are the record. `install` refuses to run when the manifest names a revision the caller contradicts with `--rev`, and `--dry-run` prints the calls without making them.

## The engine directory

This skill's `scripts/` is the collection's engine, not this skill's private resources. Every gate entry point lives there, beside the dispatcher that runs one by name and the modules they all import: the repository walker, the notes root, the i18n scope, the Markdown parser and the vendored bundle it parses with. [`scripts/README.md`](../scripts/README.md) documents the one vendored bundle those gates parse Markdown with, and how to regenerate it. The other skills ship their `SKILL.md` and their `references/` and no code at all, so installing the manager already puts every gate in the project, and **there is nothing to release and no copy to make**: a second copy would be a second authority with nothing to keep the two in step.

One directory means one relative shape. A skill sits at `skills/<name>/` in the source tree and `.agents/skills/<name>/` in a project, and the engine sits at `scripts/` inside the manager's directory in both, so a gate and the modules it imports are always siblings: a gate imports a shared module as `./<module>.ts`, and the engine directory is derived from where the dispatcher sits — `.agents/skills/dsh-spec-manager/scripts/` in a project — so there is no path for anything to record.

A gate is addressed by name through the dispatcher, never by path:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-agent-note-format --root .
```

`run.ts` resolves the name against the manifest's `gates` record, and before it runs anything it reconciles that record with the files beside it: a recorded gate with no `verify-*.ts` script, or a `verify-*.ts` file the record does not name, is a mismatch, and the dispatcher prints both sides — the record's names and the directory's scripts — names each exact pair that failed to match, and exits non-zero without starting a gate. That reconciliation is what lets the record be the authority without turning a stray file into a runnable gate: only a recorded name can run, and a file nobody recorded stops the run as the disagreement it is. A name the record does not hold is an error, never a skip, and the refusal names the gates the record does hold.

Use `--gate <name>` when the gate has flags of its own — `run.ts --gate verify-translation-pairing --write --all --root .` passes everything after the name through untouched, where without it `--all` is the aggregate's own flag and a gate that takes `--all` itself cannot be reached. The aggregate is the same entry point with `--all`: it runs every recorded gate, prints one line per gate, and exits non-zero if any gate fails **or if the record names no gate at all** — a green line over an empty engine is precisely the check that silently disappeared, which is the defect this design exists to prevent. In a repository with no CI, an entry point that reports the whole set is the only thing that makes the checks non-optional.

## Refresh an installed collection

The revision is the `revision` field of `references/manifest.json`; nothing else pins the set. Refresh **after** the source change is pushed, because the install reads that revision rather than the working tree, and commit the refreshed copy in the same change:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/manager.ts install --root .
```

A change that alters `skills/` therefore lands in two commits — the source, then the refreshed copy — and the installed copy is never hand-edited, because the next install overwrites an edit.

An install has two halves, and the second one reaches the project's own tree. After the skills are in place, `install` and `update` run the initializer's `sync` mode, which brings the files whose **text** the collection owns up to the same revision: the notes contract and its three `AGENTS.md` files, `docs/AGENTS.md`, `.rgignore`, and the marked `dsh-spec:agent-notes` block inside the root `AGENTS.md`. Two things a project owns survive by rule — the rows of `docs/terminology.md`, and everything in `AGENTS.md` outside the marked block — and the notes files are synced only where the notes tree exists, so `--no-notes` is not undone. Run `manager sync --root .` to do the same work without a network install; without `--write` it only reports what would change, which is how a project checks its drift.

## Update

`update` installs the whole manifest again at one revision — `--rev` when given, the manifest's `revision` otherwise. It never updates one skill on its own: a set whose members sit at different revisions is the drift `status` exists to report, not a state to create.

A forced reinstall does not delete a file that a later revision removed, so `install` and `update` reduce each installed directory to exactly what the revision ships: the tree the installer recorded in `github-tree-sha` is listed through the API, and any file the installed copy holds that the tree does not name is removed. Most leftovers would be inert, but one class is fatal — a `verify-*.ts` script the gate record does not name makes the dispatcher refuse to run anything — and the project cannot tell the classes apart by looking. When the listing cannot be read, nothing is deleted: a failed API call must not be mistaken for a revision that ships nothing. The revision the project carries is still the one the installer injected into each `SKILL.md`.

## Status

`status` reports and exits non-zero when any of these is untrue:

1. **The installed set equals the manifest.** A manifest skill with no directory is missing; a directory with a `SKILL.md` that no manifest entry names is unlisted.
2. **Each skill sits at the pinned revision, read from the installed file.** The manager reads the `metadata:` block out of the installed `SKILL.md` and compares the ref it names against the manifest's `revision`. A file with no such block was not put there by an install, so it is reported by name as not being an install of the pin rather than passed as agreement.
3. **The dispatcher is present**, so a documented command resolves at all.

`status` changes nothing. It is the check to run before a push that touches an instruction file, and the reason a stale deployment is a finding rather than a silent condition.

## Uninstall

The CLI has no uninstall, so removal is this mode's own procedure, and it runs in one order:

Remove each manifest skill's directory under the skills directory. The engine, the dispatcher and the manifest live inside the manager skill's own directory, so this step removes them with it.

Removal never touches `.agents/dsh-spec/notes/` or `AGENTS.md`: those are the project's, and an uninstall that took them would delete decisions and standing orders the project made for itself.

## Boundaries this mode keeps

- **The decision-record contract is not the manager's.** Validating notes, checking supersession and archiving belong to [`dsh-archive-agent-notes`](../../dsh-archive-agent-notes/SKILL.md).
- **An installed skill is never edited in place.** A change belongs to the collection that publishes it, and the project takes it by updating at a new revision.
- **The manager writes nothing outside the skills directory.** It owns the installed copy, and every other file in a project is the project's.

## Files

- `scripts/manager.ts` — `init`, `install`, `update`, `uninstall` and `status`, plus the shared argument handling. Zero external dependencies, run through `pnpm dlx tsx`.
- `references/manifest.json` — the authority described above: the skills, the pinned revision, and the gates the dispatcher resolves a name against.
- `scripts/manifest.ts` — reads that file: its path, and the recorded gate names with the grammar each must match.
- `scripts/run.ts` — the dispatcher and the aggregate: it reconciles the recorded names against the `verify-*.ts` scripts beside it, and runs the one a name resolves to.
- `scripts/` — the collection's engine: every gate, the dispatcher, and the modules they import. The section above owns its contract.
