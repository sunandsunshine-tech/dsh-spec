# Agent Note: A gate is a recorded name

Status: implemented

English | [中文](2026-09-20-a-gate-is-a-recorded-name.zh.md)

## Problem

The gate list lived in two places at once, and neither said what the other did. The manifest shipped to every initialized project carried a `gates` array; the dispatcher ignored it and resolved a name against the `verify-*.ts` files beside it, so the array drifted from the engine without a signal either way. Removing the array from the manifest was read as deleting a duplicate, and the dispatcher's scan became the only statement of which gates exist.

A scan answers a different question from the one the aggregate needs. It reports which files are present, not which checks must run, so a recorded gate deleted from the engine stays in whatever list a project kept and a new script becomes a check by landing in the directory. A green `--all` then means the aggregate ran the files that happened to be there. The scan also had a mechanical failure, which is the reason reconciliation now exists: mid-flight it ran helper modules of the engine directory as gates, among them `archived-agent-notes.ts` and `translation-pairing.ts`, because the scan stripped the `verify-` prefix instead of requiring it. Those modules print nothing and exit 0, so the aggregate counted each of them as a passing gate. A green line for a file that is not a gate is the failure this collection exists to prevent.

## Decision

**The gate list is recorded in `references/manifest.json`, and the dispatcher reconciles the record against the engine directory.** `run.ts` reads the record in its skill's `references/`, and before it resolves or runs anything it compares the two sides: a recorded name with no `verify-*.ts` file beside the dispatcher, and a `verify-*.ts` file the record does not name. Both sides are reported by name and the command exits non-zero. A mismatch is refused rather than skipped.

The record is the only runnable list. `--all` runs exactly the recorded names, and naming a gate the record does not carry is refused rather than run. The manifest states the repository, the pinned revision, the skills to install, and the gates that exist; the engine directory holds the scripts those names resolve to, and the reconciliation is the one statement that the two agree.

That pair is what makes the hazard unreachable. With the record as the only list the aggregate will run, a helper module in the engine directory is inert: nothing runs it, and its presence is reported as a file the record does not name rather than counted as a check. With a mismatch refused, a recorded gate that loses its file stops the run before any gate executes. **A scan made the false green unlikely; the record makes it impossible.**

## Alternatives considered

**Scan the engine directory for `verify-*.ts` and run what it finds.** The engine directory already holds the gates, so a listing is true by construction and needs no second file to stay in step; this is the shape the dispatcher had. It lost on stability rather than on truth. A listing is only as stable as the directory's file names, so a rename, a partial install or a helper module dropped beside the dispatcher changes what runs without changing what anyone decided, and the mid-flight scan above demonstrated the consequence: two modules that load silently and exit 0 were counted, and printed, as gates. The record is reviewable in a diff — a maintainer sees the name and the count the aggregate will run before the run — while a listing is whatever that directory happened to hold at that moment, in an order nobody chose.

**Reconcile the two, but report a disagreement as a warning.** The dispatcher would run the discovered scripts and print the difference against the record without failing. It lost because a warning is not a check: a recorded gate whose file is gone and a helper module nobody recorded would both pass an aggregate whose exit code, the whole check, stayed zero.

**Record the gates and let the dispatcher trust the record alone.** The record is the list, so the dispatcher could resolve each name to `<name>.ts` and fail on a missing file without reading the directory at all. It lost because it catches half the disagreement. A helper module or a renamed script left beside the dispatcher would stay invisible, and the file set a maintainer reads would no longer be the set the record describes.

## Consequences

- `references/manifest.json` carries the `gates` array beside the repository, the revision and the skills, and `run.ts` reconciles it against the `verify-*.ts` files in the engine directory at startup. A recorded name with no file, or a file the record does not name, is reported with both sides and exits non-zero before any gate runs.
- `--all` runs exactly the recorded gates and its final line states how many ran and how many failed. A gate joins that run only once its name is recorded and its script sits beside the dispatcher, and both edits are required in the same change.
- Verification: `run.ts --all --root .` ends `run: 8 gate(s), 0 failed`, and each of the four gates this change runs exits zero over the tree it leaves.
- What this bought is an aggregate whose list is a decision a reader can review: never again can a module that checks nothing print a green, because a file the record does not name is reported and refused instead of run. What it cost is a second edit whenever a gate is added or removed, and a manifest that can be wrong in a way the dispatcher must check at every invocation rather than trusting the directory.

## Related

[Four mechanisms instead of twelve](2026-09-18-four-mechanisms-instead-of-twelve.md) consolidated the collection to one code home and one aggregate command; this note records how that command decides which gates exist.
