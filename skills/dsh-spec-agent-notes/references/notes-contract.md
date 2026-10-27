# Agent Notes contract

Agent Notes are effectively RFCs written by agents: durable proposals and decision records that preserve the rationale, the alternatives, the consequences and the required verification that code, tests and ordinary documentation cannot carry. They exist so a later session can find out why a decision was made and what it beat before it re-opens the question.

This contract owns the active lifecycle tree. [The archive contract](archive-contract.md) owns the frozen archive; [SKILL.md](../SKILL.md) owns the procedure.

## Layout and naming

Every note has two axes, both encoded in its path — `{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`:

- **Lifecycle** (the top-level folder) is the note's status, and a note moves between folders as its status changes:
  - **`proposed/`** — proposals reviewed before implementation; not yet built, or only partly.
  - **`implemented/`** — the decision shipped. The file records what was decided and what was rejected, and is kept current with what actually shipped: when code later moves a file, renames a package, or changes a key, default or mechanism, the note is updated in the same change to match. Rewrite the stale fact in place; do not append a change history.
  - **`rejected/`** — the proposal was considered and declined. Keep it only while its rationale prevents a tempting, meaningful mistake; otherwise delete the complete unit.
- **Class** (the nested folder) is the kind of decision — see [Classification](#classification).

The date in the filename is when the topic was first proposed, per the project's history. Cross-references between notes use relative Markdown links (`[topic](../../implemented/architecture/2026-…-….md)`) — never bare prose or numbers — so they are mechanically checkable and survive moves between folders.

The active lifecycle tree is the working inventory: browse its lifecycle and class folders or search the project. Do not add a centralized `INDEX.md`: it duplicates path metadata and makes unrelated note changes contend on one file. Implemented records with historical decision value but little future guidance move to the separate frozen [archive](archive-contract.md).

Read the project's declaration (`AGENTS.md` or the file it cites) for the notes root. The default is `.agents/dsh-spec-agent-notes/` directly under the project root, which is the Git checkout root of the working directory; the directory is the notes tree itself, with the lifecycle folders and `archived/` inside it. Every command accepts `--root <dir>` for another directory inside the project root; the archive root is always `<notes root>/archived`. Run `node <skill-dir>/scripts/notes.mjs init` once in a project without a tree: it creates the lifecycle and class folders and the six archived class folders with ignored `.gitkeep` placeholders in empty folders, and never overwrites an existing file. Commit the initialized skeleton before the first seal, because the archive baseline is read from Git.

## Classification

Every note has one class, encoded in its path; the classification gate rejects other folders that hold Markdown. An empty directory is ignored, as the source's Markdown glob never sees it. Adding a class is a deliberate change: extend the table below and the gate's closed set in the same change.

| Class | What it covers |
|---|---|
| `feature` | A new user- or model-facing capability. |
| `bug-fix` | Corrects a defect or closes a gap a postmortem surfaced. |
| `simplification` | Removes code, behavior, or surface area without adding a capability. |
| `architecture` | A structural decision about the **shipped source** — how packages relate, what the runtime vocabulary is. |
| `process` | Tooling, policy, or workflow **around** the code — gates, the package manager, vendoring — not runtime behavior. |
| `testing` | Test infrastructure and strategy. |

The `architecture` / `process` line: **architecture** is about the source the project ships; **process** is the surrounding tooling and workflow. A `refactor` class is deliberately absent — it overlaps `simplification`, whose discriminator ("does observable behavior change?") already covers it. The six names and definitions are the upstream set, unchanged; a general-domain agent maps its own work onto them semantically: `feature` for a new capability, `bug-fix` for a correction, `simplification` for a removal, `architecture` for a structural decision, `process` for the surrounding workflow, `testing` for acceptance and verification. When no class fits exactly, choose the closest intent; adding a class is a contract and gate change, never an improvised folder. The gate does not second-guess that mapping.

The gate rejects any other folder that holds Markdown; an empty directory is not a note folder. A project that genuinely needs a class adds it here and in the gate; it does not improvise a folder.

## When to write one

Write or update the owning note only for lasting decision rationale that code, tests and existing documentation do not explain; the note is part of that change. A proposal for substantial future work starts in `proposed/`; a decision already made starts in `implemented/`. Pick the class that matches the decision.

**Every new note triggers a supersession check.** Search the active tree for older notes covering the same decision, mechanism or rejected alternative, and classify each match while writing the new note: update the owner, consolidate a full supersession, archive a qualifying implemented unit, reject an obsolete proposal, or delete a rejection that no longer prevents a mistake. Keep partial supersessions active and cross-linked. Do not defer a known match to a later corpus audit.

Updating the note that already owns the decision satisfies the rule; do not create a duplicate. Mechanical or local edits, including local UI presentation and interaction changes, are exempt. A note is never edited into a *different* decision: supersede it with a new one and keep both notes cross-linked unless the old note is later fully consolidated under this rule. Editing an `implemented/` note to track where its existing decision lives is required, not forbidden.

An implemented note that is fully superseded may be consolidated into the current owning note and deleted. Before deletion the owner must preserve every unique rationale, alternative, consequence, required verification and named coverage gap; repair every inbound link; and delete the old note and its companions in the same change. Partial supersession does not qualify: keep both notes cross-linked and update every fact that remains current. Consolidation must not rewrite the old file into its opposite or rely on the project's history as the only copy of the rationale.

A feature-addition note may be consolidated into a later removal note only when the feature is absent from production code, configuration, schemas, durable or wire formats, migration and compatibility behavior; no current documentation presents it as available; and no test exercises it as supported behavior. Removal rationale and tests that verify absence may remain. The removal owner preserves the original motivation, why it no longer justified the feature, alternatives to full removal, the capability given up, conditions for reintroduction, and verification of complete absence. Obsolete implementation inventories and tests that only verified the deleted behavior are not current verification evidence. Removing one transport, default, implementation or presentation is partial supersession, as is any surviving durable data or compatibility handling.

## The file format

Every active note follows one in-file format, and the bundled gate enforces it. Archived notes retain the format they had when sealed, plus the archive-date line immediately below the `Status: implemented` line.

### The header block

The first three lines of every note are exactly:

```markdown
# Agent Note: <title>

Status: <status>
```

followed by a blank line. The `Status:` value is one of three forms and must agree with the lifecycle folder:

- `Status: proposed`
- `Status: implemented`
- `Status: rejected — <why, in one line>`

The status carries no dates and no parentheticals: the filename holds the first-proposed date, the project's history holds everything else, and an "accepted in amended form" note is body content (state the amendment where the decision is stated). The rejection reason is the one status with content, because a rejected note's verdict is the fact readers come for.

The gate requires the header lines and exactly one `Status:` line in prose.

### The body skeleton

Every note opens its body with `## Problem` — the motivation, written to stand without the solution. What follows depends on the lifecycle; recurring sections use these canonical names and nothing else, while genuinely bespoke technical sections remain free-form between the required ones.

#### `proposed/`

```markdown
## Problem
## Proposal
…bespoke sections…
## Alternatives considered
## Acceptance criteria
## Risks
```

`## Proposal` is the intended change and may legitimately speak in the future tense — plans, migration steps and open questions belong here while the work is unbuilt. `## Acceptance criteria` says what observable state means done. `## Risks` covers both what could go wrong and what the change knowingly gives up.

#### `implemented/`

```markdown
## Problem
## Decision
…bespoke sections…
## Alternatives considered
## Consequences
```

`## Decision` describes shipped reality in the present tense, and the file is kept current with it. `## Consequences` records what the trade-off cost and bought. Proposal-era headings are spec-speak here and the gate rejects them: `## Proposal`, `## Plan`, `## Migration plan` and `## Acceptance criteria` may not appear in an implemented note. `## Testing`, `## Deferred` or `## Related` is fine where it states present-tense fact.

#### `rejected/`

A rejected note is the proposal, frozen: it keeps whatever proposal-time sections it had (including `## Acceptance criteria` or `## Plan`), and the verdict lives on the `Status:` line. Only the header block, the `## Problem` opener, a `## Proposal` section and the alternatives mandate apply.

### Alternatives considered — mandatory

Every note carries an `## Alternatives considered` section: each genuine alternative and why it lost, one bold-led paragraph per alternative or a `### Why not <X>?` subsection per contested one. A decision recorded without what it beat invites re-litigation — the failure notes exist to prevent.

Alternatives are recorded, never invented. For a corpus imported from an older format, a note dated before the project adopted this contract may carry this exact comment in place of the section when its alternatives are not reconstructible:

```markdown
<!-- agent-note-format: alternatives-not-recorded (pre-format Agent Note) -->
```

The comment is valid only for notes dated before the adoption date passed as `--format-adopted <yyyy-mm-dd>`; a note dated on or after that date always carries the section. Reconstructible alternatives are recorded rather than excused.

### Moving between lifecycles

Moving a file between lifecycle folders means updating the `Status:` line and re-satisfying that folder's skeleton in the same change — the gate fails the move otherwise. Concretely, `proposed/` → `implemented/` rewrites `## Proposal` into a present-tense `## Decision`, folds `## Acceptance criteria` and `## Risks` into `## Consequences` (or a present-tense `## Testing` or `## Verification` section for what now pins the behavior), and drops plans in favor of what shipped. `proposed/` → `rejected/` only adds the reason to the `Status:` line and freezes the file.

### Companions

A note may travel with companion files the project keeps for it — translations in any language, consistency records, diagrams. The project declares their suffixes (for example `.zh.md` and `.i18n.yaml`) with repeated `--companion` arguments; the format gate then treats each companion as part of its source note's unit and skips it as a separate note. It reports a companion without a regular-file source note in a class folder or at a lifecycle root; a readable deeper declared companion is ignored like the source's walker, while an unreadable declared companion in a class folder or at a lifecycle root is reported. A project without companions passes no suffix. Notes are written for the agent in English; a translation is an optional companion for readers of that language.

Companions are one unit with their note: they move folders with it, enter the archive with it, and are deleted with it. Their internal consistency is the project's own pairing gate's business; this contract owns the unit rules. Archive-unit completeness is enforced when the archive seals a new unit, not replayed over frozen units during verification; a sealed unit cannot gain a companion later.

## Pruning the active tree

Judge every note semantically; word count and age are discovery aids, never criteria.

- **Implemented — delete:** delete complete units that only describe small presentation adjustments or purely mechanical changes, and repair or remove inbound links. A local bug fix, performance change, new capability, or substantive behavior or ownership decision does not qualify merely because its implementation is small.
- **Implemented — keep:** retain a note when its rationale, alternatives, negative guarantees, durable or wire semantics, ownership boundary, security rule, or reintroduction condition is likely to guide a future change. Classify the decision, not the mechanics of its implementation: a mechanical rename or type extraction can still record a lasting naming, compatibility or ownership rule.
- **Implemented — archive:** move a substantive historical decision to [the archive](archive-contract.md) when it is complete and unlikely to guide future work but its historical rationale still warrants preservation.
- **Proposed — never archive:** keep a live proposal active; if it is no longer worth pursuing, reject it with an honest reason and satisfy the rejected lifecycle format.
- **Rejected — keep only as a guardrail:** retain a rejection only when the losing proposal remains a tempting, meaningful mistake and the note explains why it loses.
- **Rejected — delete:** delete the whole unit when the rejected idea is obsolete, superseded, no longer plausible, or unlikely to prevent re-litigation; repair or delete the inbound links.

Do not prune toward a quota. Inspect every note in scope, classify analogous groups under one principle, use judgment for close cases, and record genuinely borderline decisions for the handoff.

## Checks

Run from inside the project's Git checkout (Git is required); from the project root:

```sh
node <skill-dir>/scripts/notes.mjs check [--root <dir>] [--companion <suffix>]... [--format-adopted <date>] [--json]
```

The check decides the mechanical subset; the archive seal checks a newly sealed unit and its archive metadata, while verification compares the manifest without re-validating frozen history.

- the notes root and archive root resolve inside the project checkout and outside the project's Git directory, and the archive root belongs to the same absolute Git directory;
- a symlinked lifecycle, class or note entry resolves inside the project checkout and outside the project's Git directory; an entry outside the checkout or inside that Git directory is a violation;
- the root's lifecycle folders are closed and no `INDEX.md` exists;
- every note sits at `{lifecycle}/{class}/yyyy-mm-dd-topic.md` with a date-shaped filename (calendar validity is not checked, matching the source);
- the header block, the per-lifecycle skeleton and the alternatives section match this contract;
- every companion suffix declared in a class folder or at a lifecycle root joins a source file, and an orphan is reported.

It does not decide whether a note should exist, whether its rationale is sound, or whether a supersession was classified correctly. Those are judgment, recorded in the note and the change.

## Reporting

After a pruning or lifecycle pass, report what was kept, rejected, consolidated or archived, name every proposal rejected and every borderline case with its chosen outcome, and state any supersession left partial and cross-linked. The report is part of the change, not a separate log.
