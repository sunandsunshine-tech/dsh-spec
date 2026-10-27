---
name: dsh-spec-agent-notes
description: "Use before a non-trivial change to decide whether it needs a durable decision record, and when creating, updating, moving, reviewing, pruning, archiving, restoring, or auditing Agent Notes — durable decision records that preserve why a decision was made, what it beat, what it gave up, and how it is verified — in projects where agents and people must find a decision again after the session that made it. Covers the proposed/implemented/rejected lifecycle, the closed class set, the uniform note format, supersession checks, consolidation and deletion, the one-time tree initialization, the frozen archived tree with its append-only manifest, and the bundled mechanical checks. 在非平凡变更前先使用本技能，判断该变更是否需要持久决策记录；并在创建、更新、移动、评审、修剪、归档、恢复或审计 Agent Notes（跨会话保存决策理由、备选方案、代价与验证的持久记录）时使用。包括生命周期、分类、统一格式、取代检查、合并与删除、一次性初始化笔记树、冻结归档树与只增清单，以及随技能附带的机械检查。"
compatibility: "Requires Node.js 22.19+ or 24+ and Git; every command runs inside the project's Git checkout. No install, no network."
---

# Agent Notes

An Agent Note is a durable decision record: the *why* and the *what was given up* that code, tests and ordinary documentation cannot carry. It survives the session that produced it; a later session or maintainer can recover the rationale instead of re-litigating it.

This skill owns the full lifecycle of those records — where they live, when to write one, the uniform format, how they move and are pruned, and how finished ones are frozen into an archive. It combines the note rules with the archival workflow in one procedure: the references hold the full rules and the bundled script decides the mechanical ones.

## Procedure

1. **Check supersession before writing.** Search the active tree for notes that own or constrain the same decision. Use the project's current code, configuration, package documentation, generated catalogs, newer notes and inbound links to establish whether an older rationale still owns or constrains anything. Plan one change for every match: update the owner, consolidate a full supersession, archive a qualifying implemented note, or reject or delete a stale proposal. A new note never competes with an existing owner.
2. **Initialize the tree once.** In a project that has none, run `node <skill-dir>/scripts/notes.mjs init` before the first note. It creates the lifecycle and class folders and the six archived class folders with ignored `.gitkeep` placeholders only in empty folders, and never overwrites an existing file.
3. **Write the note** in the path for its lifecycle and class and in the uniform format. Substantial future work starts in `proposed/`; a decision already made starts in `implemented/`; a declined proposal goes to `rejected/` with the reason on its status line.
4. **Keep an implemented note true.** Update paths, names, keys and defaults in the same change that alters them, and rewrite stale facts in place; do not append a change history. That tracks realization, not the decision: a reversed decision needs a new note that supersedes the old one.
5. **Move a note** when its status changes: change `Status:` and re-satisfy the target lifecycle's skeleton in the same change.
6. **Prune as part of the change**, not as a separate sweep: delete implemented notes that only describe small presentation or mechanical changes; keep notes whose rationale, alternatives, negative guarantees, durable semantics, ownership boundary or reintroduction condition still guides work; archive completed notes with historical decision value; reject obsolete proposals; delete rejections that no longer prevent a plausible mistake.
7. **Archive a qualifying implemented note** through the archive procedure, then seal it with the script.
8. **Run the checks.** `node <skill-dir>/scripts/notes.mjs check` covers the active tree and `node <skill-dir>/scripts/notes.mjs archive` covers the frozen archive. A change that leaves a failing check is unfinished. `<skill-dir>` stands for this skill directory; the project's own suite may wrap the commands, and this skill ships no tests.

## Where notes live

- The root defaults to `.agents/dsh-spec-agent-notes/` directly under the project root, which is the Git checkout root of the working directory; Git is required for every command. The directory is the notes tree itself: the lifecycle folders and `archived/` live inside it. The project's declaration (`AGENTS.md` or the file it cites) may name a different root inside the project; every command accepts `--root <dir>`, resolved against the project root. The archive root is always `<notes root>/archived`, not a separate location.
- Path: `{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`.
- Lifecycle folders are closed: `proposed/` holds proposals reviewed before implementation and not yet built (or only partly); `implemented/` holds the shipped decision, kept current with what shipped; `rejected/` holds a declined proposal, kept only while its rationale prevents a tempting, meaningful mistake.
- Classes are closed: `feature`, `bug-fix`, `simplification`, `architecture`, `process`, `testing`; their definitions are in [the notes contract](references/notes-contract.md#classification). The bundled gate rejects other folders that hold Markdown; an empty directory is not a class folder. Adding a class is a deliberate change to the contract and the gate together.
- The filename date is when the topic was first proposed.
- Cross-references are relative Markdown links, never bare prose or numbers, so they are checkable and survive moves.
- There is no `INDEX.md`: the lifecycle and class folders are the inventory.
- Completed implemented notes with historical decision value but little future guidance move to `archived/{class}/`; the archive is not part of the active inventory and is not authority for current behavior.

## Writing the note

The first four lines are fixed, and `Status:` agrees with the lifecycle folder:

```markdown
# Agent Note: <title>

Status: <status>
```

- `proposed/`: `Status: proposed`
- `implemented/`: `Status: implemented`
- `rejected/`: `Status: rejected — <why, in one line>`

The status carries no date and no parenthetical: the filename holds the first-proposed date, the project's history holds everything else, and an "accepted in amended form" note states the amendment in its body. The body opens with `## Problem`, written to stand without the solution. The sections below are required under these canonical names; genuinely bespoke technical sections may sit between them.

| Lifecycle | Required sections |
|---|---|
| `proposed/` | `## Problem`, `## Proposal`, `## Alternatives considered`, `## Acceptance criteria`, `## Risks` |
| `implemented/` | `## Problem`, `## Decision`, `## Alternatives considered`, `## Consequences` |
| `rejected/` | `## Problem`, `## Proposal`, `## Alternatives considered` |

Every note carries `## Alternatives considered`: each genuine alternative and why it lost. Alternatives are recorded, never invented; a project adopting this format over an older corpus passes `--format-adopted <yyyy-mm-dd>`, and a note dated before that date may carry the exact pre-format alternatives comment instead of the section. Proposal-era headings (`## Proposal`, `## Plan`, `## Migration plan`, `## Acceptance criteria`) are banned in `implemented/`; that lifecycle states what is.

Write a note only for lasting decision rationale that code, tests and existing documentation do not explain. Update the note that owns the decision instead of creating a duplicate. Mechanical or local edits, including local UI presentation and interaction changes, are exempt. A note is never edited into a different decision: supersede it with a new one and keep both cross-linked unless the old note is later consolidated into its owner.

## Companions

A project may keep companion files beside a note — translations in any language, consistency records, diagrams — declared by suffix, for example `.zh.md` or `.i18n.yaml`. Declare them with repeated `--companion <suffix>`; the count and the languages are the project's choice. The active check skips them and pairs each with its source note; the active tree may translate selectively. The archive treats them as part of the same unit and requires every declared suffix only when it seals a new unit: verification compares the manifest, so a suffix added later is not replayed over already sealed units. A project without companions passes no suffix and works with the Markdown note alone. Notes are written for the agent in English; a translation is an optional companion for readers of that language. The project's own pairing gate owns companion consistency; this skill owns pairing, seal-time unit completeness and frozenness.

## Pruning and consolidation

The keep, archive, reject or delete decision is semantic, never a matter of word count, age or a target quota. [The notes contract](references/notes-contract.md#when-to-write-one) owns the criteria; the short version:

- **Full supersession** — consolidate every unique rationale, alternative, consequence, required verification and named coverage gap into the owner, repair inbound links, and delete the old note together with its companions in the same change.
- **Partial supersession** — keep both notes active and cross-linked, and update every fact that remains current.
- **Feature removal** — a feature-addition note may be consolidated into a later removal note only when no production code, configuration, schema, durable or wire format, migration, compatibility behavior, current documentation or supported test still presents the feature as available. The removal owner preserves the original motivation, why it no longer justified the feature, alternatives to full removal, the capability given up, conditions for reintroduction, and verification of complete absence.
- **Never archive a proposal** — reject an obsolete proposal instead. Delete a rejection whose temptation no longer exists, and repair or delete the inbound links to it.
- **Consolidation is not a rewrite** — it must not turn the old decision into its opposite or leave the project history as the only copy of its rationale.

## Archiving

Only an `implemented/` note may enter the archive. The archive path is `{root}/archived/{class}/{stem}`; `implemented` is deliberately absent from it because only implemented notes can enter. The tree is initialized once with `init` (six archived class directories; `.gitkeep` placeholders are ignored), so a fresh project has the archive skeleton before its first unit.

1. Move the complete unit — the note and every declared companion — to `archived/{class}/`.
2. Make no body edits. Insert `Archived: YYYY-MM-DD` immediately below the sole `Status: implemented` line in every Markdown side, using the archival date, identical on every side. Existing title punctuation, blank-line layout and language-switcher wording are preserved, not prerequisites.
3. Re-record companion consistency records through the project's own pairing mechanism. Do not translate, reformat, update facts or repair links inside the note.
4. Repair or delete inbound links from active prose; retarget them into the archive only when the historical snapshot is intentionally cited.
5. Seal, stage and verify:

   ```sh
   node <skill-dir>/scripts/notes.mjs init
   node <skill-dir>/scripts/notes.mjs archive --write --root .agents/dsh-spec-agent-notes --companion <suffix>
   git add .agents/dsh-spec-agent-notes/archived
   node <skill-dir>/scripts/notes.mjs archive --root .agents/dsh-spec-agent-notes
   ```

   The `--companion` value is the project's declared suffix (repeat it for each one; omit it when the project declares none). `--write` first proves every existing seal against the baseline and then appends only the new unit's hashes while enforcing the declared companion suffixes and the archive metadata for that new unit; it writes nothing when a check fails. Verification compares the manifest and reports changed, missing or unsealed artifacts, and requires the manifest to be tracked by Git when it lists artifacts, so a first seal must be staged or committed before verification. The project needs a commit before its first seal, because the baseline is read from Git. In CI, pass the trusted pre-change commit with `--base-ref <ref>`.

Once sealed, a unit is permanently frozen: never edit, update, move, translate, reformat or delete it, and never treat it as authority for current behavior; new decisions and facts belong in an active note or current documentation. Documentation gates skip archived sources, including their outbound links. The archive's structure and hashes live in `<root>/archived/manifest.json`, append-only against the baseline read at the manifest's project-relative path. A unit cannot gain a companion after it is sealed. [The archive contract](references/archive-contract.md) owns the full rules and the handover conditions.

## Checks

Run the commands from inside the project's Git checkout; `<skill-dir>` above stands for this skill directory. The project root is the checkout root of the working directory; `init`, `check` and `archive` resolve the notes root through symlinks before acting, and the notes root and archive root must resolve inside it, outside the project's Git directory, with the archive root belonging to the same absolute Git directory. The active check follows a symlinked lifecycle, class or note entry only while its real path stays inside the project checkout; an entry that resolves outside it, or inside the project's Git directory, is a violation. The gate does not enumerate Git layouts: a linked worktree, a submodule checkout and a separate Git directory are ordinary checkouts when those invariants hold; a bare repository, or a directory that is not a checkout, is a handover. Verification also requires the manifest to be tracked by Git when it lists artifacts (staged or committed), so an untracked fabricated view cannot verify against an empty baseline. The residual trust boundary is stated rather than detected: a local actor who can fabricate `.git` layouts, plant a manifest at the correct path without committing it through review, or rewrite history is outside the guarantee; a manifest committed through the project's review and CI is the trusted baseline. `--help` lists every option and exit code. The bundled gate decides only what a command can decide.

| Command | Decides | Exit |
|---|---|---|
| `node <skill-dir>/scripts/notes.mjs init [--root <dir>] [--json]` | Creates the notes skeleton: lifecycle and class folders, the six archived class folders, and ignored `.gitkeep` placeholders in empty folders; idempotent and never overwrites. | 0 created · 1 violations · 2 usage |
| `node <skill-dir>/scripts/notes.mjs check [--root <dir>] [--companion <suffix>]... [--format-adopted <date>] [--json]` | The active tree: closed lifecycle and class folders, dated filenames, the header block, the per-lifecycle skeleton, the mandatory alternatives section, and companion pairing. | 0 pass · 1 violations · 2 usage |
| `node <skill-dir>/scripts/notes.mjs archive [--root <dir>] [--base-ref <ref>] [--json]` | The frozen archive: six required class directories, manifest required, manifest schema, sealed artifacts unchanged and present, no unsealed additions, append-only against the baseline, and the tracked-manifest rule. Verification compares the manifest; it does not re-validate archive metadata or companion declarations over frozen history. | 0 pass · 1 violations · 2 usage |
| `node <skill-dir>/scripts/notes.mjs archive --write ...` | The same checks plus archive metadata (one `Status: implemented`, `Archived:` immediately below, one identical valid date per unit) and complete declared companion suffixes for the newly sealed unit, refuses an artifact added to a sealed unit, leaves a frozen artifact whose suffix is no longer declared untouched, and rejects a new undeclared non-Markdown artifact; then it appends the new hashes to `archived/manifest.json`; it writes nothing when a check fails. | 0 sealed · 1 violations · 2 usage |

Whether a note should be kept, archived, rejected or deleted is judgment guided by this skill's criteria; the script never picks for you.

## Stop and hand over

Stop and report rather than guess when:

- a sealed artifact is missing, changed, or not covered by the manifest;
- the archive baseline cannot be trusted — rewritten history without an external `--base-ref`, a baseline commit that cannot be read, or no Git repository — or the root, archive root or manifest resolves outside the project root after symlinks are followed, or inside the project's Git directory, or the archive root does not belong to the project's Git directory; or the manifest lists artifacts but is not tracked by Git in the project (stage or commit the seal before verifying); or a bare repository (no worktree) is the project root;
- the note's class, lifecycle or owning decision is unclear;
- a change would reverse a decision or repair frozen history.

These decide the project's own policy or cannot be undone. A reversed decision becomes a new note; a damaged archive is a handover, not a rewrite.

## References

- [Notes contract](references/notes-contract.md) — load before writing, moving, consolidating or pruning a note.
- [Archive contract](references/archive-contract.md) — load before archiving, sealing or verifying the archive.
