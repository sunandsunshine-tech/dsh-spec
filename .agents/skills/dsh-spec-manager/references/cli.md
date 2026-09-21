# dsh-spec

The checks this collection publishes, one subject at a time

## Usage

```sh
node <engine>/dsh-spec.ts <subject> <operation> [flags] [scope]
```

`<engine>` is the collection's engine directory — `.agents/skills/dsh-spec-manager/scripts` in a project, `skills/dsh-spec-manager/scripts` in the collection's own tree.

## Management

| Subject     | Operations | Scope | What it does                                                        |
|-------------|------------|-------|---------------------------------------------------------------------|
| `install`   | —          | —     | Adopt the collection into a project, creating what it does not have |
| `upgrade`   | —          | —     | Refresh the deployed skills and the managed text                    |
| `uninstall` | —          | —     | Remove the skill directories, leaving the project's own files       |
| `status`    | —          | —     | Report whether the installed set matches the manifest               |

## Checks

| Subject            | Operations                                      | Scope                                | What it does                                                 |
|--------------------|-------------------------------------------------|--------------------------------------|--------------------------------------------------------------|
| `notes`            | `--check`                                       | `--all | <note...> | --files-from -` | The active Agent Note tree: classification and format        |
| `notes-archived`   | `--check | --write`                             | `--all`                              | The frozen archive and its append-only seal                  |
| `translation-pair` | `--check | --list | --explain <path> | --write` | `<pair...> | --files-from -`         | Bilingual pairs: completeness, structure and recorded hashes |
| `md-links`         | `--check`                                       | `<markdown...> | --files-from -`     | Link targets, and the shapes a bulk rewrite leaves behind    |
| `commit`           | `--check`                                       | `--base <ref> | --head <ref>`        | The subjects this change owes, dispatched together           |
| `all`              | `--check`                                       | —                                    | Every check whose assertion is about a tree                  |
| `brief`            | `[--apply]`                                     | `<pair...>`                          | The minimal-update briefing for an out-of-sync pair          |

## Flags

| Flag             | Meaning                                                                                  |
|------------------|------------------------------------------------------------------------------------------|
| `--root <path>`  | The project to read or write (default: the current directory)                            |
| `--jobs <n>`     | How many checks run at once (default min(availableParallelism(), 8); DSH_SPEC_JOBS wins) |
| `--help [zh|en]` | This help, in the given language                                                         |
| `-h`             | Shorthand for --help                                                                     |
| `--markdown`     | Render the help as the reference page                                                    |

## Exit codes

0 clean   1 a check found something or an operation failed   2 the invocation is wrong

## Language

The help speaks English or Chinese: `--help zh`, or a `DSH_SPEC_LANG`, `LC_ALL`, `LC_MESSAGES` or `LANG` whose language part starts with `zh`.

## One subject in detail

### install

Adopt the collection into a project, creating what it does not have

Acts by default; `--dry-run` prints the plan and writes nothing.

```sh
node <engine>/dsh-spec.ts install --root . --dry-run
```

### upgrade

Refresh the deployed skills and the managed text

Creates nothing: a file the project deleted on purpose stays deleted. `--reinstall` forces the copy.

```sh
node <engine>/dsh-spec.ts upgrade --root .
```

### uninstall

Remove the skill directories, leaving the project's own files

Names what it leaves behind: the marked block in `AGENTS.md`, the notes tree, `docs/` and `.rgignore`.

```sh
node <engine>/dsh-spec.ts uninstall --dry-run --root .
```

### status

Report whether the installed set matches the manifest

Changes nothing, and exits non-zero on drift.

```sh
node <engine>/dsh-spec.ts status --root .
```

### notes

The active Agent Note tree: classification and format

Classification walks the tree; the format check reads exactly the notes it is handed.

```sh
node <engine>/dsh-spec.ts notes --check --all --root .
```

### notes-archived

The frozen archive and its append-only seal

The seal compares against a committed baseline; `--write` appends new hashes.

```sh
node <engine>/dsh-spec.ts notes-archived --check --all --root .
```

### translation-pair

Bilingual pairs: completeness, structure and recorded hashes

A pair is declared by a `.zh.md` counterpart, an `.i18n.yaml` record, or a language switcher in the document itself.

```sh
node <engine>/dsh-spec.ts translation-pair --check docs/guide.md --root .
```

### md-links

Link targets, and the shapes a bulk rewrite leaves behind

No `--all`: it decides the asking side of a link, so a target deleted under an untouched referrer needs a scan of the whole corpus.

```sh
node <engine>/dsh-spec.ts md-links --check docs/guide.md --root .
```

### commit

The subjects this change owes, dispatched together

Hands each subject the paths its record owns and prints one line per subject, including the skipped ones.

```sh
node <engine>/dsh-spec.ts commit --check --base main --root .
```

### all

Every check whose assertion is about a tree

The file-selection checks are not here: they take a path list, and `md-links --help` says what that costs.

```sh
node <engine>/dsh-spec.ts all --check --root .
```

### brief

The minimal-update briefing for an out-of-sync pair

`--apply` splices a change that lives only inside code fences into the counterpart.

```sh
node <engine>/dsh-spec.ts brief docs/guide.md --root .
```
