# dsh-spec

dsh-spec runs this collection's checks against a project: a verb acts, and a noun takes a verb.

## Usage

```sh
node <engine>/dsh-spec.ts <command> [flags]
```

`<engine>` is the collection's engine directory — `.agents/skills/dsh-spec-manager/scripts` in a project, `skills/dsh-spec-manager/scripts` in the collection's own tree.

## Management Commands

| Command     | What it does                                               |
|-------------|------------------------------------------------------------|
| `install`   | Install the collection into a project                      |
| `upgrade`   | Update the installed skills and the mechanism text         |
| `uninstall` | Remove the installed skills                                |
| `status`    | Check the installed set against the manager's own revision |

## Commands

| Command            | Scope or verbs                                   | What it does                                        |
|--------------------|--------------------------------------------------|-----------------------------------------------------|
| `check`            | `<path...> \| --base <ref> \| --all`             | Run the checks a selection owes                     |
| `norms`            | `list \| explain \| install \| update \| remove` | List, explain and apply the norms a project chooses |
| `notes`            | `check`                                          | Check the Agent Note tree and its notes             |
| `notes-archived`   | `check \| write`                                 | Check the frozen archive and its seal               |
| `translation-pair` | `check \| list \| explain \| write \| brief`     | Check a translated pair, or brief an update         |
| `md-links`         | `check`                                          | Check links in Markdown                             |

## Flags

| Flag                  | Meaning                                                                                       |
|-----------------------|-----------------------------------------------------------------------------------------------|
| `-h, --help [zh\|en]` | Print this help (zh or en; the default comes from DSH_SPEC_LANG, LC_ALL, LC_MESSAGES or LANG) |
| `--jobs <n>`          | Checks to run at once (default min(availableParallelism(), 8); DSH_SPEC_JOBS wins)            |
| `--markdown`          | Print this help as the reference page                                                         |
| `--root <path>`       | Project to read or write (default: the current directory)                                     |

## Exit codes

0 clean   1 a check found something or an action failed   2 the invocation is wrong

## Language

The help speaks English or Chinese: `--help zh`, or a `DSH_SPEC_LANG`, `LC_ALL`, `LC_MESSAGES` or `LANG` whose language part starts with `zh`.

## Commands in detail

### install

Install the collection into a project.

Acts by default. The set is installed at the ref `gh skill install` injected into this manager, or at `--revision <ref>`. `--dry-run` prints both plans — the skills it would deploy and the files it would create — and writes nothing. The norms a project applies are the project's own selection: this verb reports them and never writes them.

```sh
# See what adopting this project would do
node <engine>/dsh-spec.ts install --root . --dry-run
```

| Flag | Meaning |
|---|---|
| `--dry-run` | Print the plan and write nothing |
| `--revision <ref>` | Install at this ref instead of the manager's own |

The [global flags](#flags) apply to every command.

### upgrade

Update the installed skills and the mechanism text.

Self-updates the manager first, re-executes that new copy, and then installs the skill set at the ref it was updated to. The norms a project applies are reported, not written — like `apt update`, it says what the revision moves and leaves applying to `norms update`. A replacement too old to know `--only-skill-set` is not re-executed: the invoked copy installs the set itself from the replacement's manifest, so the manager and the set still end on one revision. `--only-skill-set` skips the first half and installs the set at the manager's own ref. Creates nothing: a file the project deleted on purpose stays deleted. `--reinstall` copies the skills again even when their content already matches.

```sh
# Refresh a project pinned to a new revision
node <engine>/dsh-spec.ts upgrade --root .
```

| Flag | Meaning |
|---|---|
| `--dry-run` | Print the plan and write nothing |
| `--only-skill-set` | Skip the manager self-update and install only the skill set |
| `--reinstall` | Copy the skills again even when their content matches |
| `--revision <ref>` | Update to this ref instead of the newest published release |

The [global flags](#flags) apply to every command.

### uninstall

Remove the installed skills.

Lists what it leaves behind — the marked block in `AGENTS.md`, the notes tree, `docs/` and `.rgignore` — because those are the project's own.

```sh
# See what removal would leave in place
node <engine>/dsh-spec.ts uninstall --dry-run --root .
```

| Flag | Meaning |
|---|---|
| `--dry-run` | Print the plan and write nothing |

The [global flags](#flags) apply to every command.

### status

Check the installed set against the manager's own revision.

Changes nothing, and exits non-zero when a skill is missing, unlisted, or not at the revision the manager itself was installed from.

```sh
# Report drift before pushing an instruction file
node <engine>/dsh-spec.ts status --root .
```

### check

Run the checks a selection owes.

A path list runs the checks that claim those paths, `--base <ref>` computes that list from the change instead, and `--all` runs the two tree checks. With none of the three it prints the forms and reads nothing.

```sh
# Check what a branch changed
node <engine>/dsh-spec.ts check --base main --root .
```

| Flag | Meaning |
|---|---|
| `--all` | Run the two checks asserted over a tree |
| `--base <ref>` | Compute the path list from a change against this ref |
| `--head <ref>` | The commit the change is measured to (default HEAD) |
| `--files-from <file|->` | Read the path list from a file, or from stdin |

The [global flags](#flags) apply to every command.

### norms

List, explain and apply the norms a project chooses.

The catalog is data: every norm has a stable id, the group a project chooses it by, an English title and body, a red line, and a Chinese title for this surface. A project applies the ones it chooses into `.agents/dsh-spec/norms/norms.md`, which is generated from the catalog; `.agents/dsh-spec/norms/applied.yaml` records the selection and the hash of each block as the skill set last wrote it, so an update reports a hand-edited block and refuses rather than overwriting it. The `AGENTS.md` section that lists the red lines exists exactly while a project applies norms.

**Verbs:** `list`, `explain`, `install`, `update`, `remove`

```sh
# List the whole catalog
node <engine>/dsh-spec.ts norms list --root .
```

### norms list

Print the catalog, in the reader’s language.

One heading per group and one line per norm, in the language `--help zh|en` or the locale selects; `--json` carries both titles, the body that would be written, and the record the rationale lives in.

```sh
# Pick a group to look at
node <engine>/dsh-spec.ts norms list --group prose --root .
```

| Flag | Meaning |
|---|---|
| `--group <id>` | Only the norms in this group |
| `--json` | Print the catalog as data, for an agent to render the choice from |

The [global flags](#flags) apply to every command.

### notes

Check the Agent Note tree and its notes.

The classification check asserts over the whole active tree; the format check reads only the notes it is handed. The frozen archive belongs to `notes-archived`.

**Verbs:** `check`

```sh
# Check the whole active tree
node <engine>/dsh-spec.ts notes check --all --root .
```

### notes check

Check the whole tree, and the format of the notes handed in.

The classification check asserts over the whole tree, so it takes `--all`; the format check reads only the notes it is handed. A path list is the narrow form and `--all` the explicit whole-tree one.

```sh
# Check one note
node <engine>/dsh-spec.ts notes check <note...> --root .
```

| Flag | Meaning |
|---|---|
| `--all` | Read every active note |
| `--files-from <file|->` | Read the path list from a file, or from stdin |

The [global flags](#flags) apply to every command.

### notes-archived

Check the frozen archive and its seal.

Neither verb takes a path list: the archive is one tree, and its seal is compared against a committed baseline.

**Verbs:** `check`, `write`

```sh
# Verify the seal, then append what is new
node <engine>/dsh-spec.ts notes-archived check --all --root .
```

### notes-archived check

Verify the archive against its committed seal.

A moved, edited or deleted frozen artifact fails here, which is what makes the archive evidence rather than a snapshot.

```sh
# Verify the seal
node <engine>/dsh-spec.ts notes-archived check --all --root .
```

| Flag | Meaning |
|---|---|
| `--all` | Read the whole archive |

The [global flags](#flags) apply to every command.

### notes-archived write

Append the hashes of newly archived notes.

First proves every existing seal still matches, then appends only the new triplet hashes. The archive has no narrower form, so the whole tree is the scope.

```sh
# Seal what was just archived
node <engine>/dsh-spec.ts notes-archived write --all --root .
```

| Flag | Meaning |
|---|---|
| `--all` | Read the whole archive |

The [global flags](#flags) apply to every command.

### translation-pair

Check a translated pair, or brief an update.

A pair is declared by a `.zh.md` counterpart, an `.i18n.yaml` record, or a language switcher in the document itself.

**Verbs:** `check`, `list`, `explain`, `write`, `brief`

```sh
# Check one pair, then record it
node <engine>/dsh-spec.ts translation-pair check docs/guide.md --root .
```

### translation-pair check

Check the pairs handed in.

A named pair must be complete, recorded, and structurally identical on both sides. There is no `--all`: name the pairs, or compute the list with `--files-from`.

```sh
# Check one pair
node <engine>/dsh-spec.ts translation-pair check docs/guide.md --root .
```

| Flag | Meaning |
|---|---|
| `--cached` | Check the staged bytes instead of the working tree |
| `--files-from <file|->` | Read the path list from a file, or from stdin |

The [global flags](#flags) apply to every command.

### translation-pair list

Report every pair and its state.

Prints one row per in-scope document — missing, out-of-sync or ok — and never fails. The `missing` and `out-of-sync` rows are what the check rejects.

```sh
# See the whole corpus
node <engine>/dsh-spec.ts translation-pair list --root .
```

### translation-pair explain

Say why a path is or is not a pair.

Names the counterpart it looked for and whether it exists, without reading the rest of the corpus.

```sh
# Ask about one path
node <engine>/dsh-spec.ts translation-pair explain docs/guide.md --root .
```

### translation-pair write

Record the pairs you confirmed.

The YAML record it writes is the reviewable act of confirming consistency, so it requires the pairs you confirmed. `--all` is the explicit corpus-wide form.

```sh
# Record a pair you brought back in line
node <engine>/dsh-spec.ts translation-pair write docs/guide.md --root .
```

| Flag | Meaning |
|---|---|
| `--all` | Re-record every complete pair |

The [global flags](#flags) apply to every command.

### translation-pair brief

Print the update briefing for a pair.

Maps the change at the narrowest safely aligned granularity. With no paths it briefs every out-of-sync pair; with paths it briefs exactly those and fails loud on an in-sync one.

```sh
# Brief the translator on one pair
node <engine>/dsh-spec.ts translation-pair brief --apply docs/guide.md --root .
```

| Flag | Meaning |
|---|---|
| `--apply` | Splice a code-fence-only change after structural validation |

The [global flags](#flags) apply to every command.

### norms explain

Read one norm: its text, its record and whether this project applied it.

The record is a URL at the revision the manager itself was installed from, because a repository path exists only in the repository that publishes the catalog; a tree with no installed ref prints the path instead.

```sh
# Read why a norm exists
node <engine>/dsh-spec.ts norms explain test.behaviour --root .
```

| Flag | Meaning |
|---|---|
| `--json` | Print the norms as data, applied state included |

The [global flags](#flags) apply to every command.

### norms install

Apply norms into .agents/dsh-spec/norms/norms.md.

The file is generated from the catalog: a norm the project already applied is compared rather than re-applied — an untouched block takes the revision's text, and a block edited by hand is reported as `drifted` and kept, with the run refusing until it is rerun with `--force`. A norm the catalog no longer ships is reported as `removed` and pruned from the record and the file.

```sh
# Apply the prose group
node <engine>/dsh-spec.ts norms install --group prose --root .
```

| Flag | Meaning |
|---|---|
| `--group <id>` | Apply every norm in this group |
| `--all` | Apply every norm the catalog ships |
| `--dry-run` | Print the plan and write nothing |

The [global flags](#flags) apply to every command.

### norms update

Bring the applied norms up to the installed revision.

The file is generated from the catalog: an untouched block takes the revision's text, and a block edited by hand is reported and kept — the update refuses until it is run with `--force`. A norm the catalog no longer ships is pruned from the record and the file, and named in the report.

```sh
# Refresh what this project applies
node <engine>/dsh-spec.ts norms update --root .
```

| Flag | Meaning |
|---|---|
| `--force` | Overwrite a block this project edited by hand |
| `--group <id>` | Only the applied norms in this group |
| `--dry-run` | Print the plan and write nothing |

The [global flags](#flags) apply to every command.

### norms remove

Stop applying norms, and drop them from the record.

Removing a block that was edited by hand would take the edit with it, so it is refused until an update has been run with `--force`.

```sh
# Stop applying a norm
node <engine>/dsh-spec.ts norms remove test.fast-subset --root .
```

| Flag | Meaning |
|---|---|
| `--group <id>` | Remove the applied norms in this group |
| `--all` | Remove every applied norm |
| `--dry-run` | Print the plan and write nothing |

The [global flags](#flags) apply to every command.

### md-links

Check links in Markdown.

The asking side of a link is decided per file, which is why this command takes a path list and never `--all`.

**Verbs:** `check`

```sh
# Check the links the change touched
node <engine>/dsh-spec.ts md-links check docs/guide.md --root .
```

### md-links check

Check the files handed in.

Resolves relative links, images and definitions, and rejects the two shapes a bulk rewrite leaves behind. No `--all`: a target deleted under a referrer nobody touched needs a separate scan of the whole corpus.

```sh
# Check one document
node <engine>/dsh-spec.ts md-links check docs/guide.md --root .
```

| Flag | Meaning |
|---|---|
| `--files-from <file|->` | Read the path list from a file, or from stdin |

The [global flags](#flags) apply to every command.
