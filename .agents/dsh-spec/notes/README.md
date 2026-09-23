# Agent Notes

English | [中文](README.zh.md)

One kind of design doc lives here. An **Agent Note** records a decision or proposal that affects this codebase — the *why* and *what we gave up*, the parts code and docs can't carry. This file defines where Agent Notes live, when to write one, and [the in-file format](#the-file-format).

Below, `.agents/skills/dsh-spec-manager/scripts` is the collection's engine directory, where the manager skill installs every gate, the dispatcher, and the modules they import.

## Layout and naming

Every Agent Note has two axes, both encoded in its **path** — `{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`:

- **Lifecycle** (the top-level folder) is the Agent Note's status, and an Agent Note moves between folders as that status changes: - **`proposed/`** — proposals reviewed before implementation; not yet built (or only partly). - **`implemented/`** — the decision shipped. The file records what was decided and what was rejected, and is **kept current with what actually shipped**: when the code later moves a file, renames a package, or changes a key/default, the Agent Note is updated in the same change to match (facts only — paths, names, structure — not the decision itself). See [implemented/AGENTS.md](implemented/AGENTS.md). - **`rejected/`** — the proposal was considered and declined. Keep it only while its rationale prevents a tempting, meaningful mistake; otherwise delete the complete triplet.
- **Class** (the nested folder) is the *kind* of decision — see [Classification](#classification) below.

The date in the filename is when the topic was **first proposed** (per git history). Cross-references between Agent Notes use relative markdown links (``implemented/architecture/2026-…-….md``) — never bare prose or numbers — so they are mechanically checkable and survive moves between folders.

The active lifecycle tree is the working inventory: browse its lifecycle/class folders or search the repository. Do not add a centralized `INDEX.md`: an index is a second inventory that drifts from the first, and the folders a reader already browses answer the only question an index would. Implemented records with historical decision value but little future guidance move to the separate frozen [`archived/`](archived/AGENTS.md) tree described below.

## Classification

Each Agent Note belongs to one path-encoded class from the closed set in `.agents/skills/dsh-spec-manager/scripts/agent-note-tree.ts`; the classification gate rejects other folders. Adding a class requires updating the canonical set and this section.

| Class | What it covers |
|---|---|
| `feature` | A new user- or model-facing capability. |
| `bug-fix` | Corrects a defect or closes a gap an incident surfaced; the class where a postmortem's durable lesson lands. |
| `simplification` | Removes code, behavior, or surface area without adding a capability. |
| `architecture` | A structural decision about the **shipped source** — how packages relate, what the runtime vocabulary is. |
| `process` | Tooling, policy, or workflow **around** the code — gates, the package manager, vendoring — not runtime behavior. |
| `testing` | Test infrastructure and strategy. |

The `architecture` / `process` line: **architecture** is about the source we ship; **process** is the surrounding tooling and workflow. (`refactor` is deliberately absent — it overlaps `simplification`, whose discriminator, "does observable behavior change?", already covers it.)

## Archiving and deletion

Delete an implemented Agent Note that only describes small UI adjustments or purely mechanical changes, and delete its English, Chinese, and sidecar files together while repairing or removing inbound links. A local bug fix, performance change, new capability, or substantive behavior decision does not qualify merely because its implementation is small. Archive other implemented Agent Notes only when the shipped decision is complete, its rationale is unlikely to guide future work, and the record still has historical decision value. Keep it active when its alternatives, ownership boundary, negative guarantee, durable or wire semantics, security rule, or reintroduction condition remains useful. Never archive a proposed note: reject an obsolete proposal. Keep a rejected note only while it prevents a plausible mistake; otherwise delete its English, Chinese, and sidecar files together. Use the calibrated `dsh-archive-agent-notes` workflow rather than word count, age, or a target quota.

The archive is path-encoded as `archived/{class}/yyyy-mm-dd-topic-title.md`; `implemented` is deliberately absent because only implemented notes can enter it. An archival change moves the complete English/Chinese/sidecar triplet, retains `Status: implemented`, inserts the same `Archived: YYYY-MM-DD` line immediately below that status in both language files, re-records the sidecar, and repairs or deletes inbound links. These are the only permitted content changes during archival. Existing title punctuation, blank-line layout, and language-switcher wording do not block archival; preserve them with the body.

Once sealed, every archived triplet is permanently frozen. Do not edit, translate, reformat, update, move, or delete it, and do not treat it as authority for current behavior. Documentation gates skip archived sources, including their outbound links; active prose may still link into an archived note when it intentionally cites history. `.agents/skills/dsh-spec-manager/scripts/dsh-spec.ts notes-archived check --all` enforces the closed class tree, complete triplets, archive metadata, sidecar hashes, and the append-only frozen-content manifest. The freeze is what makes the archive evidence: a snapshot anyone may edit proves nothing about what was decided. The root `.rgignore` keeps the archive out of recursive searches, so a historical query names the directory explicitly rather than meeting frozen facts among active ones.

## When to write one

Add or update an Agent Note in the same change only for lasting decision rationale that code, tests, and existing documentation do not explain. A proposal for substantial future work starts in `proposed/`; a decision already made starts in `implemented/`. Pick the class folder that matches the decision (see [Classification](#classification)).

**A decision agreed in conversation counts.** Record it as a `proposed/` note before the change exists, because a conclusion that lives only in a transcript is invisible to the next session, the next collaborator, and the next device; update the note as the design moves, and move it to `implemented/` when it ships.

Updating the Agent Note that already owns the decision satisfies the rule; do not create a duplicate. Mechanical or local edits are exempt, including a change that only touches presentation or interaction. An Agent Note is never edited into a *different decision*: supersede it with a new one, and keep both notes cross-linked unless the old note is later fully consolidated under the rule below. Editing an `implemented/` Agent Note to track where its existing decision lives is required, not forbidden; see [implemented/AGENTS.md](implemented/AGENTS.md).

An implemented Agent Note that is fully superseded may be consolidated into the current owning note and deleted. Before deletion, the owner must preserve every unique rationale, alternative, consequence, required verification, and named coverage gap; repair every inbound link; and delete the Chinese counterpart and consistency record in the same change. Partial supersession does not qualify: keep both notes cross-linked and update every fact that remains current. Consolidation must not rewrite the old file into its opposite or rely on git history as the only copy of rationale.

A feature-addition note may be consolidated into the later removal note only when the feature is absent from production code, configuration, schemas, durable or wire formats, migration, and compatibility behavior; no current documentation presents it as available; and no test exercises it as supported behavior. Removal rationale and tests that verify absence may remain. The removal owner preserves the original motivation, why it no longer justified the feature, alternatives to full removal, the capability given up, conditions for reintroduction, and verification of complete absence. Obsolete implementation inventories and tests that only verified the deleted behavior are not current verification evidence. Removing one transport, default, implementation, or presentation is partial supersession, as is any surviving durable data or compatibility handling.

## The file format

Every active Agent Note follows one in-file format, enforced by `.agents/skills/dsh-spec-manager/scripts/dsh-spec.ts notes check`; the format is uniform because retrieval must not depend on who wrote the note: one skeleton means a reader knows where the decision, the alternatives, and the verification sit before opening the file. Archived notes retain the format they had when sealed plus the archive-date line above.

### The header block

The first three lines of every Agent Note are exactly:

```markdown
# Agent Note: <title>

Status: <status>
```

followed by a blank line. The `Status:` value is one of three forms, and must agree with the lifecycle folder the file sits in — the gate cross-checks them:

- `Status: proposed`
- `Status: implemented`
- `Status: rejected — <why, in one line>`

The status carries no dates and no parentheticals: the filename holds the first-proposed date, git holds everything else, and an "accepted in amended form" note is body content (state the amendment where the decision is stated). The rejection reason is the one status with content, because a rejected Agent Note's verdict is the fact readers come for.

### The body skeleton

Every Agent Note opens its body with `## Problem` — the motivation, written to stand without the solution. What follows depends on the lifecycle; recurring sections use these canonical names and nothing else, while genuinely bespoke technical sections (package topology, wire contracts, schemas) remain free-form between the required ones.

#### `proposed/`

```markdown
## Problem
## Proposal
…bespoke sections…
## Alternatives considered
## Acceptance criteria
## Risks
```

`## Proposal` is the intended change and may legitimately speak in the future tense — plans, migration steps, and open questions belong here while the work is unbuilt. `## Acceptance criteria` says what observable state means done. `## Risks` covers both what could go wrong and what the change knowingly gives up.

#### `implemented/`

```markdown
## Problem
## Decision
…bespoke sections…
## Alternatives considered
## Consequences
```

`## Decision` describes shipped reality in the present tense, and the whole file is kept current with it per [implemented/AGENTS.md](implemented/AGENTS.md). `## Consequences` records what the trade-off cost **and** bought. Proposal-era headings are spec-speak here and the gate rejects them: `## Proposal`, `## Plan`, `## Migration plan`, and `## Acceptance criteria` may not appear in an implemented Agent Note. A `## Testing`, `## Deferred`, or `## Related` section is fine where it states present-tense fact.

#### `rejected/`

A rejected Agent Note is the proposal, frozen: it keeps whatever proposal-time sections it had (including `## Acceptance criteria` or `## Plan`), and the verdict lives on the `Status:` line. Only the header block, the `## Problem` opener, a `## Proposal` section, and the Alternatives-considered mandate below apply.

### Alternatives considered — mandatory

Every Agent Note carries an `## Alternatives considered` section: each genuine alternative and why it lost, one bold-led paragraph per alternative or a `### Why not <X>?` subsection per contested one. A decision recorded without what it beat invites re-litigation — the failure Agent Notes exist to prevent.

Alternatives are recorded, never invented. An Agent Note dated before 2026-07-05 whose alternatives are not reconstructible from the record carries this exact comment in place of the section, which the gate accepts for pre-format files only:

```markdown
<!-- agent-note-format: alternatives-not-recorded (pre-format Agent Note) -->
```

### Quoted text and secrets

Text a note quotes from outside this repository — an issue, a page, a transcript, a tool's output — enters it as quoted evidence with its source named.

A credential in a note, and in the text a note quotes, is written `[REDACTED_SECRET]` — the literal token this tree reads as a placeholder.

### Moving between lifecycles

Moving a file between lifecycle folders means updating the `Status:` line and re-satisfying that folder's skeleton in the same change — the gate fails the move otherwise. Concretely, `proposed/` → `implemented/` rewrites `## Proposal` into a present-tense `## Decision`, folds `## Acceptance criteria` and `## Risks` into `## Consequences` (or a present-tense `## Testing`/`## Verification` section for what now pins the behavior), and drops plans in favor of what shipped — the rewrite [implemented/AGENTS.md](implemented/AGENTS.md) requires, made mechanical. `proposed/` → `rejected/` only adds the reason to the `Status:` line and freezes the file.

### Chinese counterparts

A `.zh.md` counterpart mirrors its English sibling's structure section-for-section under the `dsh-translate-docs` pairing contract (`.agents/dsh-spec/notes/` shares its rules); the machine-checked header tokens (`# Agent Note: ` and the `Status:` line) stay in English verbatim. The format gate skips `.zh.md` files — the pairing gate checks their consistency.

## Gates in this collection

Three gates enforce what this file states. They ship with the skills collection that initialized this project, and the project **references** them rather than releasing a copy: a released copy can never be updated, because the initializer will not overwrite a file it did not create and a refresh only touches the collection. They live in `.agents/skills/dsh-spec-manager/scripts`.

Every gate is a recorded name backed by a script in that one directory, reached through the collection's entry point `.agents/skills/dsh-spec-manager/scripts/dsh-spec.ts`, which resolves a name against the collection's `gates` record in its `references/manifest.json` and reconciles that record with the `verify-*.ts` scripts beside it: a recorded gate with no script, or a script the record does not name, is a refusal that names both sides and runs nothing. Neither the entry point nor a gate needs a `package.json` or `node_modules`; run each from the project root with `--root .`:

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts notes check --all --root .
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts notes check <note...> --root .
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts notes-archived check --all --root .
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts notes-archived write --all --root .
```

The same dispatcher also runs `check --all`, which runs the checks asserted over a tree and fails when one fails or when the record names none. Updating the collection updates all of them; a project that needs different behaviour changes its own files, never the gate.

`AGENT_NOTES_ROOT` names the notes directory directly when a project keeps it outside `.agents/dsh-spec/notes`. A missing tree or an empty walk exits non-zero rather than reporting a pass it did not earn.
