# Agent Note: An empty archive cannot ship its kind directories

Status: implemented

English | [中文](2026-09-21-an-empty-archive-cannot-ship-its-kind-directories.zh.md)

## Problem

The archive gate required all six `archived/<kind>/` directories unconditionally. In a project that has archived nothing those directories are empty, and Git does not carry an empty directory: the six exist only in the working tree where the initializer created them. So this repository passed `run.ts --all --root .` on the machine that ran the initializer, while the same revision in a fresh `git clone` failed it:

```
verify-archived-agent-notes: archive rules violated:
  archived/feature/: required kind directory is missing
  archived/bug-fix/: required kind directory is missing
  archived/simplification/: required kind directory is missing
  archived/architecture/: required kind directory is missing
  archived/process/: required kind directory is missing
  archived/testing/: required kind directory is missing
run: 7 gate(s), 1 failed
```

The gate's own empty-archive report says the opposite of its check: it prints `the archive is empty — 0 frozen artifact(s) to check ... no seal recorded yet` and exits 0 whenever the directories happen to be present, so the state it describes as consistent is exactly the state a clone cannot reproduce. The gap has no workaround a project can commit — `git add` cannot record the missing directories — so every fresh checkout, which is every collaborator and every CI job, would meet a failing aggregate until someone ran the initializer again.

dsh carries the same unconditional loop. dsh's archive holds sealed notes, so no kind directory is ever empty there and the defect never surfaces; this collection is the first project to adopt the mechanism with an empty archive, which is what exposed it.

## Decision

**The six kind directories are required once the archive holds at least one artifact, and not before.** The requirement is guarded by the artifact count the gate has already collected, so the check arms itself at the moment a note is archived and nothing can hide from the seal: a note filed under a mistyped class directory still fails as an unknown kind, and a missing kind directory is reported as soon as there is anything to file. **An unknown directory under `archived/` is an error unconditionally** — that rule never depended on content and is unchanged.

**The empty-archive report states the rule rather than counting directories.** It reads `the archive is empty — 0 frozen artifact(s) to check and no seal recorded yet; all 6 kind directories are required once a note is archived`, which is where a reader of a fresh clone learns why nothing is missing.

## Alternatives considered

**Track a placeholder file in each kind directory and teach the gate to ignore it.** The directories would survive a clone, and `.gitkeep` is the conventional spelling of that intent. It lost because the gate reads every regular file inside a kind directory as an archived artifact, so the placeholder would need a named exemption in the artifact reader, a second one in the seal, and a statement in the archive contract — three places to keep in step for a directory that carries no information when it is empty.

**Have the initializer's `sync` mode recreate the missing directories.** One command already knows the six names, and running it after a clone would restore them. It lost because it moves the failure rather than removing it: the aggregate still fails on a fresh clone until someone runs the manager, and the documented promise is that a clone can run `--all` as it stands. It also puts a directory the gates require under a mode whose contract is to synchronize the text the collection owns.

**Drop the requirement and accept whichever kind directories exist.** The smallest gate, and an empty archive would never fail. It lost because the requirement is what catches a class folder spelled `bugfix/` instead of `bug-fix/`: once notes exist, a note inside an unlisted directory is invisible to the seal, and the manifest would record an archive that omits it.

**Keep parity with dsh and record the failure as a known condition.** The collection's rule is that a change either mirrors dsh or is recorded as a deliberate deviation. It lost because the condition is a defect rather than a difference of opinion: it fails every fresh clone of every project that has archived nothing, and reproducing a bug is not alignment. This note is the recorded deviation.

## Required verification

A scratch clone of the repository, which carries no kind directories, must pass the aggregate: `run.ts --all --root .` reports `7 gate(s), 0 failed`. The same tree with one archived artifact present and five kind directories absent must report those five as missing again, so the rule is proven to arm rather than to have been deleted. The installed copy in this repository stays green under both.

## Consequences

A fresh clone's aggregate is green with no preparatory command, so the archive gate's verdict is reproducible from the revision alone. The rule now follows content instead of the tree, which is what makes it transferable: any project that adopts the mechanism and archives nothing yet is consistent by construction, and the requirement tightens itself the first time a note is archived.

The deviation from dsh is deliberate and lives in this note. If dsh fixes its own copy, the two shapes agree again and this note should say so; until then the difference is one guard, not a divergence in what the archive means.
