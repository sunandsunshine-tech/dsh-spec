# Agent Note: A class directory carries a marker

Status: implemented

English | [中文](2026-09-26-a-class-directory-carries-a-marker.zh.md)

## Problem

The archive gate requires its six class directories. Git carries files rather than directories, so a class directory nothing has been filed under exists only in the working tree that created it and is absent from every clone of the project.

[An empty archive cannot ship its kind directories](../../archived/bug-fix/2026-09-21-an-empty-archive-cannot-ship-its-kind-directories.md) addressed the empty archive by arming the requirement on the artifact count: the six directories became required once the archive held something, and not before. The archive in this repository stopped being empty on 2026-09-22, when the first note was archived, and the guard then demanded all six directories from a tree that could only ever carry one. Every fresh clone failed `check --all`:

```
verify-archived-agent-notes: archive rules violated:
  archived/feature/: required kind directory is missing
  archived/bug-fix/: required kind directory is missing
  archived/simplification/: required kind directory is missing
  archived/architecture/: required kind directory is missing
  archived/testing/: required kind directory is missing
```

The guard fixed the state it was written for and broke the state it armed into, which is the state every project with one archived note is in. The local working tree passed, because the initializer had created the six directories there and nothing removes them; the CI job failed on the same revision, because a clone carries only what Git records.

## Decision

**The six class directories are required unconditionally, and each carries a marker file.** `AGENT_NOTE_CLASS_PLACEHOLDER` (`.gitkeep`) is written into every archive class directory — by the initializer when it creates the tree, and by hand in a project that already exists — so the directory is a file Git carries rather than an empty directory it drops. The archive gate reads a file with that name as a directory marker and not as a frozen artifact, so the marker reaches neither the artifact map nor the append-only seal.

**The artifact-count guard is removed.** The requirement is dsh's own unconditional loop; the marker is what makes it satisfiable in a project that has archived less than six classes of note. This package's deviation from dsh is now one rule — a file named `.gitkeep` inside a class directory is a marker rather than an artifact — in place of the guard that replaced dsh's rule with a different one.

**The unknown-class rule is unchanged.** A directory under `archived/` outside the closed class set is an error whatever the archive holds, and that is the rule that catches a class folder spelled `bugfix/`.

## Alternatives considered

**Keep the guard and accept the failure.** It is the smallest change. It lost because it leaves the aggregate red on every fresh clone of every project whose archive holds one class, including this one, and a gate that cannot pass is not a gate.

**Drop the six-directory requirement and accept whichever class directories exist.** The requirement would then follow content, and an empty or partial archive could never fail. It lost because a class directory is what makes a note's class checkable against the closed set at a glance: a missing directory says the class is unused, while a deleted one says nothing, and the package would stop stating a rule dsh states and the archive contract already publishes.

**Track the marker but exempt it only in the artifact reader.** One exemption instead of two. It lost because the seal is derived from the artifact map the reader fills, so a single skip covers both; a second exemption would be unreachable code.

**Have `sync` mode recreate the missing directories after a clone.** One command already knows the six names. It lost because it moves the failure rather than removing it: the aggregate stays red until someone runs the manager, and the promise is that a clone runs `--all` as it stands. It also puts a directory the gates require under a mode whose contract is to synchronize the text the package owns.

**Name the marker something else, or put a note artifact in each empty class.** The first is cosmetic. The second is not available: a class directory holds archived triplets, and a fabricated one would enter the seal and the manifest as a decision nobody made.

## Required verification

A scratch clone of the repository, which carries the markers and no other empty directory, passes the aggregate: `dsh-spec.ts check --all --root .` reports `check notes-archived: ok`. The same tree with one class directory removed reports that directory as missing, so the rule is shown to arm rather than to have been deleted. A directory holding only the marker reports no unsealed artifact. The initializer, run against an empty project, writes six class directories each containing the marker.

## Consequences

**What it bought.** The aggregate is green from the revision alone, in this repository and in every project that adopts the mechanism, with no preparatory command and no dependence on which classes an archive happens to use. The rule the package states is now dsh's rule, and the difference between the two copies is one filename the reader skips.

**What it costs.** Six marker files exist whose only job is to defeat Git's treatment of directories; each carries its own explanation, because the gate reads any other file in a class directory as a frozen artifact. A project that deletes a marker while the directory is still empty loses the directory at the next clone and fails the gate there — the failure is loud and names the directory, which is the outcome the rule wants.
