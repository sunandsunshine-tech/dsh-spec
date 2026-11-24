---
name: dsh-spec-agent-notes
description: "Use before a non-trivial change to decide whether it needs a durable decision record, and when creating, updating, moving, reviewing, pruning, archiving, restoring, or auditing Agent Notes. Covers the lifecycle, unified format, supersession, frozen archive and bundled checks. Not for ordinary documentation or transient notes. 用于在非平凡变更前判断是否需要持久决策记录，以及在创建、更新、移动、评审、修剪、归档、恢复或审计 Agent Notes 时使用。涵盖生命周期、分类、统一格式、取代、冻结归档与随附检查。不用于普通文档或临时笔记。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
compatibility: "Requires Node.js 24.11+ on the 24 line or 26+ and Git; every command runs inside the project's Git checkout. No install, no network."
---

# Agent Notes

An Agent Note is a durable decision record: the *why* and the *what was given up* that code, tests and ordinary documentation cannot carry. It survives the session that produced it; a later session or maintainer can recover the rationale instead of re-litigating it.

This skill owns the full lifecycle of those records — where they live, when to write one, the uniform format, how they move and are pruned, and how finished ones are frozen into an archive. The references hold the full rules; the bundled script decides the mechanical ones.

## Defaults

A default is the value or strategy this skill declares at its use site. It applies when the current request and existing project instructions leave that choice open. A user turn or explicit parameter supplies a one-off value. Existing project instructions supply a persistent override and are read without being modified or copied. Missing project instructions are valid, so do not ask the user to choose a default or create or modify an instruction file merely to select one.

## Procedure

1. **Check supersession before writing.** Search the active tree for notes that own or constrain the same decision. Use the project's current code, configuration, package documentation, generated catalogs, newer notes and inbound links to establish whether an older rationale still owns or constrains anything. Plan one change for every match: update the owner, consolidate a full supersession, archive a qualifying implemented note, or reject or delete a stale proposal. A new note never competes with an existing owner.
2. **Initialize the tree once.** In a project that has none, run `node <skill-dir>/scripts/notes.mjs init` before the first note. It creates the lifecycle and class folders and the six archived class folders with ignored `.gitkeep` placeholders only in empty folders, and never overwrites an existing file.
3. **Choose the lifecycle, then load the owning contract.** Substantial future work starts in `proposed/`; a decision already made starts in `implemented/`; a declined proposal goes to `rejected/` with the reason on its status line. Load [the notes contract](references/notes-contract.md) before creating, updating, reviewing, auditing, moving, consolidating or pruning a note. Its path, format, classification, companion and pruning rules are authoritative.
4. **Keep an implemented note true.** Update paths, names, keys and defaults in the same change that alters them, and rewrite stale facts in place; do not append a change history. That tracks realization, not the decision: a reversed decision needs a new note that supersedes the old one.
5. **Prune as part of the change**, never as a separate word-count or age sweep. The keep, archive, reject or delete decision is semantic and follows the notes contract.
6. **Run the checks.** Load [the notes contract](references/notes-contract.md#companions) before auditing so the project's companion mechanism is known. Run `node <skill-dir>/scripts/notes.mjs check` with every declared companion option; for example, a project whose units use `.zh.md` translations and `.i18n.yaml` records runs `check --companion .zh.md --companion .i18n.yaml`. A bare check is valid only when the project declares no companions. Run `node <skill-dir>/scripts/notes.mjs archive` for the frozen archive. A change that leaves a failing check is unfinished. `<skill-dir>` stands for this skill directory; the project's own suite may wrap the commands.

## Where notes live

The root defaults to `.agents/dsh-spec-agent-notes/` directly under the project root, the Git checkout root of the working directory. The project's standing instructions (`AGENTS.md` or the file it cites) may name another root inside the project. The archive root is always `<notes root>/archived`. The notes contract owns the closed lifecycle and class trees, filenames and links.

## Writing the note

Write a note only for lasting decision rationale that code, tests and existing documentation do not explain. Update the note that owns the decision instead of creating a duplicate. Mechanical or local edits, including local UI presentation and interaction changes, are exempt. A note is never edited into a different decision: supersede it with a new one and keep both cross-linked unless the old note is later consolidated into its owner.

The notes contract owns the header, status lines, required sections and alternatives rule. A note that changes lifecycle moves to that lifecycle's path and satisfies its format in the same change.

## Companions

A unit is a note plus every companion the project assigns to it. Companions may be translations, records, diagrams or other support. An external mechanism owns names, formats and checks and determines the companion set; Agent Notes owns the declared unit's grouping, movement and sealing. Installing a mechanism alone neither enables nor makes it available.

When translation is available, choose this note's target set in this order:

1. the current request;
2. existing project instructions;
3. a consistent target set from complete pairs in the same owner-defined class;
4. the primary agent's user language, when it differs from the source language;
5. no translation companion.

The model judges comparable files and project evidence; scripts receive resolved companion facts. A target set may contain several languages. Translation requires project evidence and availability; missing or conflicting evidence selects none without asking.

Adding a target is progressive: new notes use the current set, edited notes gain missing targets, and untouched notes do not change. Removing a target clears every eligible active and unsealed unit; sealed units stay frozen. Before producing any translation companion, apply the translation mechanism's working-separation rule. When no isolated or otherwise verifiable separation is available, finish the source note and hand off the selected target without translating in the working context. Failure leaves the unit unfinished with source, target, failed step and next step; it never becomes English-only. The [notes contract](references/notes-contract.md#companions) owns full rules. Use the project's translation mechanism (when available, use the dsh-spec-translate-docs skill).

## Archiving

Only an `implemented/` note may enter. Load [the archive contract](references/archive-contract.md) before archiving; it owns the archive path, units, six class directories and seal rules.

Finish selected companions and owner checks while the note is active; failure leaves it active and unfinished. Move the complete unit, add the archive metadata and re-record companions through the archive contract. Before sealing, prepare the final membership, hashes and required owner checks; run `archive --write` with the matching plan only when the prepared unit is unchanged and every readiness check passed, then stage and verify. A successful manifest write is the freeze boundary. When readiness fails, report the failing command and output, keep the unit unsealed and the manifest unchanged, then tell the operator to repair the named condition and rerun `archive --prepare` before using a new plan with `archive --write`.

Once sealed, a unit is permanently frozen: never edit, update, move, translate, reformat or delete it, and never add or remove a companion. It is not authority for current behavior; new decisions and facts belong in an active note or current documentation, and documentation gates skip archived sources, including their outbound links. The archive's structure and hashes live in `<root>/archived/manifest.json`, append-only against the baseline at the manifest's project-relative path. [The archive contract](references/archive-contract.md#the-frozen-guarantee) owns the full guarantee.

The archive contract owns the prepare, readiness and guarded-write commands and the Git baseline requirement.

## Checks

Run `init`, `check` and `archive` from inside the project's Git checkout. Before `check`, load the notes contract's companion section and pass the project's declared suffixes and format options. Before `archive`, load the archive contract. The gate checks the active tree or frozen archive, and a failing state is unfinished work. `--help` lists each command's options and exit codes. The model judges whether a note should exist and whether its rationale still guides work; the script decides the mechanical facts owned by the loaded contract.

## Stop and hand over

Stop and report rather than guess when:

- a sealed artifact is missing, changed, or not covered by the manifest;
- the archive baseline cannot be trusted — rewritten history without an external `--base-ref`, a baseline commit that cannot be read, or no Git repository — or the root, archive root or manifest resolves outside the project root after symlinks are followed, or inside the project's Git directory, or the archive root does not belong to the project's Git directory; or the manifest lists artifacts but is not tracked by Git in the project (stage or commit the seal before verifying); or a bare repository (no worktree) is the project root;
- the note's class, lifecycle or owning decision is unclear;
- a change would reverse a decision or repair frozen history.

Every handover names the failed step, completed work, pending work and a resumable recovery action. A failed archive readiness check leaves the unit unsealed and the manifest unchanged; name the failing check and the project's next command, such as repairing the named condition and rerunning `archive --prepare` before `archive --write`. A reversed decision becomes a new note; restoring a sealed unit or repairing a damaged archive is a handover, not a rewrite.

## References

- [Notes contract](references/notes-contract.md) — load before writing, moving, consolidating or pruning a note.
- [Archive contract](references/archive-contract.md) — load before archiving, sealing or verifying the archive.
