# Agent Note: Reference the gates where they ship instead of releasing them

Status: implemented

English | [中文](2026-09-18-reference-gates-instead-of-releasing-them.zh.md)

## Problem

`init` copied the Agent Note gates into `.agents/dsh-spec/notes/scripts/`, so every adopted project held its own copy. Two failures followed from that, and this repository met both.

A released gate has no update path. `init` never overwrites a file it did not create, and the skill set's own updater only touches the skill set, so a gate fixed in `skills/` stayed broken in every project that had already adopted it. The rule that recorded their location said as much — "refresh them by copying" — which was a procedure no gate checked and no collaborator would remember.

A released gate also has two owners. Nothing said whether the collection's copy or the project's copy was authoritative, and drift between them was invisible: the deployed notes contract sat stale against its templates with a dead gate path and mangled links, and no check covered it because every gate ran with `--root skills/dsh-doc`.

## Decision

The gates are **referenced where they ship**, never released. `init` copies no gate; it records the path of the dispatcher it runs from, and an initialized project's documented commands name that path:

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts verify-agent-note-format --root .
```

`.agents/dsh-spec/notes/` keeps what the project owns — the contract documents, the lifecycle and class folders, the notes — and holds no code.

### One path, recorded once

Only the initializer knows where the collection landed: the install directory is a choice (`--dir`, project scope, user scope), so a template cannot state it and a gate cannot derive it. The dispatcher path is recorded once at init and every command names it, which keeps the path with one owner instead of spelling a guess in each template.

### The contract documents are still released

The split is **code referenced, documents released**. `README.md`, `AGENTS.md`, `implemented/AGENTS.md`, and `archived/AGENTS.md` are the project's own text — it fills their placeholders and points them at its lifecycle and class set — so a copy is correct and an overwrite would be destructive. Gates are code: they take configuration, not edits, so a copy is only a fork.

### Migration is a described change, not an automated one

A future release that breaks the notes layout — structure, length, heading set — is migrated by following the updated collection's own description of the new shape. No mechanism upgrades a released contract document, and this decision does not add one.

## Alternatives considered

**Keep releasing the gates and add a refresh command.** A `--refresh` that overwrites the released gates would restore the update path with one flag. It lost because it rebuilds the problem this repository had just solved for the installed skill copy: two copies of the same file, a documented procedure instead of a structural guarantee, and a third gate needed to detect the drift the refresh was supposed to prevent. The reference makes the second copy impossible rather than watched.

**Hardcode `.agents/skills/scripts` in the templates.** That is where the collection sits in this repository, and it would need no key and no substitution. It lost because it is true only here: a project installing at user scope, or with a different `--dir`, or with the collection vendored elsewhere, would read a path that does not exist, and nothing in the file would say where the real one came from.

**Ship the gates as an installed package the project depends on.** A manifest, a lockfile, and a version range would give the gates a real dependency graph. It lost because the collection's stated property is that it needs no `package.json` and no `node_modules`; a dependency would trade a one-line reference for a toolchain the adopting project may not have.

## Consequences

A gate fixed in the collection now reaches every project that updates it, which is the property the released copy could not provide.

The gates are no longer runnable without the collection present. In this repository the installed copy is tracked, so a plain checkout has them; a project installing at user scope must have the collection installed before its check runs, and the failure mode is a missing file rather than a stale one — louder, which is why it is the better trade.

The recorded path is the one thing an adopting project can get wrong, and only running a command shows it: nothing verifies a path a template cannot know. The initializer prints the commands with the path already resolved, so the project copies a working command rather than substituting into a token.

The released contract documents still have no upgrade path, as they did before this decision. That gap is now explicit rather than hidden behind a released copy of the gates that made the whole tree look maintained.

[Four mechanisms instead of twelve](2026-09-18-four-mechanisms-instead-of-twelve.md) keeps this decision and drops the clause that recorded the path as a configuration key: the reference model survives, and the ledger that held the key does not.
