# Agent Note: Running the initializer on this repository

Status: implemented

English | [中文](2026-09-18-run-the-initializer-on-this-repository.zh.md)

## Problem

This repository was written by hand rather than initialized: `AGENTS.md` carried the rule about decision records in its own words and never carried the `dsh-spec:agent-notes` marker, so a re-run of the initializer would have appended a second statement of a rule the file already made.

The initializer also reported twelve subtree instruction files, every one of them inside `submodules/dsh/`. They belong to the pinned baseline, whose contents this repository must not edit, and reporting them as this project's subtree orders sends a maintainer to files that are not theirs.

## Decision

The initializer now **stops at a nested repository**: a directory holding `.git` is another owner's tree, so its instruction files are neither reported nor counted.

Running it here wrote exactly one thing — the marked Agent Note section appended to `AGENTS.md` — and the now-duplicated bullet in `## Conventions` was deleted in the same change, so the rule has one home. A re-run is a no-op: the marker suppresses the append.

The injected section itself was corrected. It had told a project to run the gates from `.agents/dsh-spec/notes/scripts/`, a directory that no longer receives them; it now names the dispatcher under `.agents/skills/`, which is where an installed collection puts the command that resolves a gate by name.

`dsh-spec-init.md` and `SKILL.md` carried the same stale model — gates created under the notes tree, and three template names that do not exist. Both are corrected.

## Alternatives considered

**Add the marker without running the initializer.** One line added by hand would have made a future re-run a no-op and would have avoided the append entirely. It lost because the marker is the initializer's own mechanism for exactly this state, and using it by hand would leave the section text unverified against the tool that maintains it — the drift this repository keeps finding.

**Leave the duplicated rule and let the appended text win.** Deleting the hand-written bullet and keeping only the injected section is what happened; keeping both was the alternative and lost because two statements of one rule drift, and the hand-written one would be the copy nobody updates.

**Write the twelve submodule instruction files into the report and let a reader ignore them.** Honest but useless: the report exists to tell a maintainer what to read, and a list that must be ignored to be read correctly is worse than no list.

## Consequences

The initializer's report on this repository is one line about the root file and the notes tree — the whole truth about what this repository has.

Its scan no longer reaches into any nested repository, which also means a project that vendors a second checkout will not see that checkout's instructions. That is the intent: those files are read by whoever owns that repository, in that repository.

Step 5 of the initializer's workflow — adapting the deployed Agent Note contract, which still points at three decision records that exist only upstream — is **not** done. It needs a maintainer's decision between writing equivalents here and pointing at the collection, and inventing either would put a rationale in the contract that nobody wrote. The documentation tree it also named is no longer part of the initializer's job at all: [Four mechanisms instead of twelve](2026-09-18-four-mechanisms-instead-of-twelve.md) deletes the mechanism, so `docs/` is a folder nothing manages.
