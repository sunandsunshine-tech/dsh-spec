# dsh-spec

dsh-spec runs this collection's checks against a project, one subject at a time.

## Usage

```sh
node <engine>/dsh-spec.ts <subject> <operation> [flags]
```

`<engine>` is the collection's engine directory — `.agents/skills/dsh-spec-manager/scripts` in a project, `skills/dsh-spec-manager/scripts` in the collection's own tree.

## Management Commands

| Subject     | Operations | Scope | What it does                                       |
|-------------|------------|-------|----------------------------------------------------|
| `install`   | —          | —     | Install the collection into a project              |
| `upgrade`   | —          | —     | Update the installed skills and the mechanism text |
| `uninstall` | —          | —     | Remove the installed skills                        |
| `status`    | —          | —     | Check the installed set against the manifest       |

## Check Commands

| Subject            | Operations                                      | Scope                                | What it does                            |
|--------------------|-------------------------------------------------|--------------------------------------|-----------------------------------------|
| `notes`            | `--check`                                       | `--all | <note...> | --files-from -` | Check the Agent Note tree and its notes |
| `notes-archived`   | `--check | --write`                             | `--all`                              | Check the frozen archive and its seal   |
| `translation-pair` | `--check | --list | --explain <path> | --write` | `<pair...> | --files-from -`         | Check a translated pair and its record  |
| `md-links`         | `--check`                                       | `<markdown...> | --files-from -`     | Check links in Markdown                 |
| `commit`           | `--check`                                       | `--base <ref> | --head <ref>`        | Check what a change owes                |
| `all`              | `--check`                                       | —                                    | Check everything asserted over a tree   |
| `brief`            | `[--apply]`                                     | `<pair...>`                          | Print the update briefing for a pair    |

## Flags

| Flag                 | Meaning                                                                                       |
|----------------------|-----------------------------------------------------------------------------------------------|
| `-h, --help [zh|en]` | Print this help (zh or en; the default comes from DSH_SPEC_LANG, LC_ALL, LC_MESSAGES or LANG) |
| `--jobs <n>`         | Checks to run at once (default min(availableParallelism(), 8); DSH_SPEC_JOBS wins)            |
| `--markdown`         | Print this help as the reference page                                                         |
| `--root <path>`      | Project to read or write (default: the current directory)                                     |

## Exit codes

0 clean   1 a check found something or an operation failed   2 the invocation is wrong

## Language

The help speaks English or Chinese: `--help zh`, or a `DSH_SPEC_LANG`, `LC_ALL`, `LC_MESSAGES` or `LANG` whose language part starts with `zh`.

## One subject in detail

### install

Install the collection into a project.

Acts by default. `--dry-run` prints both plans — the skills it would deploy and the files it would create — and writes nothing.

```sh
# See what adopting this project would do
node <engine>/dsh-spec.ts install --root . --dry-run
```

### upgrade

Update the installed skills and the mechanism text.

Creates nothing: a file the project deleted on purpose stays deleted. `--reinstall` copies the skills again even when their content already matches.

```sh
# Refresh a project pinned to a new revision
node <engine>/dsh-spec.ts upgrade --root .
```

### uninstall

Remove the installed skills.

Lists what it leaves behind — the marked block in `AGENTS.md`, the notes tree, `docs/` and `.rgignore` — because those are the project's own.

```sh
# See what removal would leave in place
node <engine>/dsh-spec.ts uninstall --dry-run --root .
```

### status

Check the installed set against the manifest.

Changes nothing, and exits non-zero when a skill is missing, unlisted, or not at the pinned revision.

```sh
# Report drift before pushing an instruction file
node <engine>/dsh-spec.ts status --root .
```

### notes

Check the Agent Note tree and its notes.

Classification asserts over the whole tree, so it takes `--all`; the format check reads only the notes it is handed.

```sh
# Check the tree, and every note it holds
node <engine>/dsh-spec.ts notes --check --all --root .
```

### notes-archived

Check the frozen archive and its seal.

The seal is compared against a committed baseline, and `--write` appends the hashes of newly archived notes.

```sh
# Verify the seal, then append what is new
node <engine>/dsh-spec.ts notes-archived --check --all --root .
```

### translation-pair

Check a translated pair and its record.

A pair is declared by a `.zh.md` counterpart, an `.i18n.yaml` record, or a language switcher in the document itself. `--list` reports every pair, and `--write` records the ones you confirmed.

```sh
# Check one pair, then record it
node <engine>/dsh-spec.ts translation-pair --check docs/guide.md --root .
```

### md-links

Check links in Markdown.

No `--all`: the asking side of a link is decided per file, so a target deleted under a referrer nobody touched needs a separate scan of the whole corpus.

```sh
# Check the links of the files a change touched
node <engine>/dsh-spec.ts md-links --check docs/guide.md --root .
```

### commit

Check what a change owes.

Hands each subject the paths its record owns and prints one line per subject, including the ones it skipped and why.

```sh
# Check a branch against its base
node <engine>/dsh-spec.ts commit --check --base main --root .
```

### all

Check everything asserted over a tree.

The file-selection checks are not part of it: they take a path list, and `md-links --help` says what that costs.

```sh
# Run every tree check
node <engine>/dsh-spec.ts all --check --root .
```

### brief

Print the update briefing for a pair.

The briefing maps what changed at the narrowest safe granularity. `--apply` splices a change that lives only inside code fences into the counterpart.

```sh
# Brief a translator for one out-of-sync pair
node <engine>/dsh-spec.ts brief docs/guide.md --root .
```
