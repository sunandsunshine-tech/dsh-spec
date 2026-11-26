---
name: dsh-spec-translate-docs
description: "Use when maintaining an existing or explicitly authorized Markdown translation pair: bring a counterpart along after either side changes, add multiple declared target languages, brief or isolate larger translations, and record and check consistency. Not for ordinary one-off translation, editing an unpaired document, or an inferred translation need without pair scope. 用于维护已有或明确授权的 Markdown 配对：任一侧变化后同步对侧，新增多个声明的目标语言，为较大改动生成简报或隔离翻译，并记录和检查一致性；普通一次性翻译、只编辑未配对文档，或没有配对范围的推断翻译需求不加载。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
compatibility: "Requires Node.js 24.11+ on the 24 line or 26+ and Git for the briefing. No install and no network access."
---

# Translating paired documents

## Invocation boundary

This skill runs when a persistent project instruction, the user or the responsible workflow selects an existing or new pair for creating, updating or checking, or when a documented change touches either side of an existing pair. An explicit `--require-target` may apply the project's declared completeness policy to a selected source set. It does not activate for ordinary one-off translation, an unpaired document's edit, or an inferred translation need that supplies no pair scope. Those sources authorize creating or updating a pair; once selected, translation and pairing are required, and failure is handed off unfinished. Installation alone is not activation. The [pairing contract](references/pairing-contract.md) owns path scope, target-selection rules and failure details.

## Defaults

Apply this skill's use-site default only when neither the request nor existing project instructions choose one. Treat existing instructions as authoritative read-only input; do not ask for, create, modify, or copy instructions merely to select a default.

## What this skill is

A self-contained mechanism for a corpus of paired Markdown documents: the skill entry, three references, and one bundled script. `<skill-dir>` is the directory containing this `SKILL.md`; run the script from the project root. The script is parameter-driven; the pairing contract owns the options, their defaults and the override rules. The check verifies existing pairs by default: file structure, Markdown structure, generated-region equality and the recorded hashes. It does not decide independently that a source should have a counterpart; that decision belongs to the standing instructions, the user, or the workflow responsible for the document scope and reaches the command as an explicit `--require-target`.

## Choose targets

The responsible model or workflow resolves a target set for each source in this order:

1. the current request;
2. an existing persistent project instruction;
3. complete pairs in the same owner-defined class or scope;
4. the primary agent's known user language;
5. no target.

The script receives the resulting explicit `--target` values and never infers from sibling files or the user's language. An explicit set may contain multiple targets. Do not choose a target when complete peer pairs disagree or the only candidate equals the source language.

Adding a target is progressive: a new source uses the current policy set, while an edited source adds only its missing targets. Untouched sources are not backfilled. A target added to an existing source uses the whole-document path because it has no confirmed state.

Removing a target is a strong cleanup across every eligible active source: remove its counterparts, switcher entries and record entries. Frozen or excluded documents stay unchanged. Report every unfinished source rather than claiming the scope completed.

## The pairing model

A pair is a source `foo.md`, one counterpart per target `foo.zh.md` or `foo.<lang>.md`, and one aggregate record `foo.i18n.yaml`. The [pairing contract](references/pairing-contract.md) owns the record and signature format, switchers, selection, regions, links, terminology, the CLI's options/defaults/exit codes and discovery prunes; the [style examples](references/style-examples.md) file carries the default voice guidance and samples. The script is `<skill-dir>/scripts/translate-pair.mjs`; its verbs are `list`, `check`, `write`, `brief` (with `--apply`), `init`, and `region render|splice`.

## Triage by change type

- **Existing pair, small local change** (one or two Markdown units in one section; no new or moved terminology, no structural change, no generated region): update the counterpart directly on the spot. This is the lightweight path.
- **Existing pair, any other change**: the briefing path.
- **New pair** (standing instructions, explicit instruction or authorization from the responsible workflow): the whole-document path and its isolation rule.
- **New target on an existing source** (progressive policy addition): the whole-document path for that target, while existing targets follow their normal update path.
- **Deleted or renamed document**: follow § Finish the pair; a named `write --target` never drops a target, and an entry without a counterpart is an incomplete pair.
- **Generated region**: the generator updates both sides; never edit a region by hand.
- **Frozen or excluded document**: the standing instructions say it is not maintained; do not create, update or repair its pairs.
- **Locale-selected detail page**: when the project selects the page by locale metadata and publishes no in-document switcher or record, declare its localized paths with `--unpaired <glob>`; the paths stay outside pair discovery and existing-target inference, links to different localized versions still normalize to one semantic target, and their locale differences are not violations. The project's link, prose and review checks keep both localized versions in step.

Every successful update path continues with § Finish the pair.

## Preserve working separation

The briefing and whole-document paths preserve a prose translator's independence. Use an isolated subagent when available; otherwise use a clean-context handoff, staged independent review, or another verifiable mechanism that preserves the separation. If no mechanism preserves it, follow § Stop and hand over rather than continuing in the working context.

## The lightweight update path

Use it only when the change is local (one or two Markdown units in one section), the terminology table already covers the touched terms and no first occurrence moves, no heading, list, table or fence structure changes, and no generated region is involved. Then:

1. Load the target's terminology table, or run `init` first when it is missing. Read the style guidance from the project's declared style file, or the default [style examples](references/style-examples.md) when none is declared; consult the nearest sample only when the touched wording needs calibration.
2. Make the smallest counterpart edit that covers the change; preserve the reviewed phrasing of everything untouched. Do not re-read or re-translate the whole document.
3. Follow the [translation rules](references/translation-rules.md); calibrate against the nearest declared/default sample when the wording needs it.

When more than one target exists and the wording of each is more than a local patch, use the briefing path per target. If the change turns out to cross sections, need a terminology decision, or alter structure, stop and use the briefing path instead.

## The briefing path

1. **Brief the change.** `node <skill-dir>/scripts/translate-pair.mjs brief <pair path> --target <lang>` prints the authored side's change since the last confirmed state at the narrowest aligned unit, with three-way text, matching terminology rows and first-occurrence notes. Generated regions never enter the briefing: aligned regeneration says nothing to brief; disagreeing current regions are a precondition failure. The pair must be committed.
2. **Apply a mechanical-only change directly.** When the brief maps every change inside fenced code, add `--apply`; the script splices and structure-validates the counterpart. On prose changes `--apply` exits 2 and writes nothing.
3. **Brief the prose translator.** Pass the briefing, or the command to print it, through the working separation in § Preserve working separation. The brief is the translator's change-local work set: it carries the diff, touched terminology and rules digest, but it does not replace the binding rules. Before editing, the translator reads the project's declared style file or the default references/style-examples.md; it also loads the target terminology table under the [translation rules](references/translation-rules.md). Escalate to the whole-document sources only when a decision is genuinely unanswerable.
4. Make the smallest edit that covers the change, then verify the changed spans against the source.

## The whole-document path

The translator reads the project's standing instructions, the [pairing contract](references/pairing-contract.md), the [translation rules](references/translation-rules.md), the project's declared style file or the default [style examples](references/style-examples.md) first; when the target's terminology table is missing, run `node <skill-dir>/scripts/translate-pair.mjs init --target <lang>=<name>` first. Translate the whole file section by section, keeping each section's structure locked to the source.

### Translate

- **Pass 1 — write, don't transpose.** Read a semantic unit, then restate it as a native technical author; preserve the frame without sentence-by-sentence correspondence.
- **Pass 2 — verify against the source, clause by clause.** Nothing added or dropped; every term follows the table; every code span survived verbatim. Fix by rewriting natively.
- **Read the completed counterpart alone.** Rewrite phrasing whose awkwardness only appears in isolation.
- Write only the final text, never drafts or notes.
- Never edit a generated region; the generator writes both sides.

A generated source (`--generated`) omits only its own switcher; the counterpart backlink remains required.

## Find the work

- `list` reports the pairs that exist; use `--select <glob>` and `--skip <glob>` to narrow the set, and `--unpaired <glob>` to exclude locale-selected pages from pairing. `--require-target <lang>` applies a declared full-pair policy to the selected sources and reports missing targets.
- `brief` with no pair argument reports every drifted existing pair; a pair it cannot brief is reported on stderr, the other briefs are still emitted without `--apply`, and the command exits 2. A generated-region drift is fatal for the whole run.
- Discovery walks hidden directories and applies the [pairing contract's default prune trees](references/pairing-contract.md#discovery). Frozen or vendored trees are kept out of the work by the standing instructions and the selection filters.
- In a change that edits a paired document, the work list is the change's diff: every changed side needs its counterpart brought along and the pair recorded in the same change.
- A source-side change is reflected in every existing target pair of that source in the same change. A translation-only correction that leaves the source untouched stays pair-local.

## Finish the pair

1. A new pair or whole-document translation carries the source and counterpart switcher lines; a generated source omits only its own switcher. Regenerate generated regions on both sides; they are not translated.
2. Edit a target, then run `write --target`; never write before editing. When several targets change, edit and write each target sequentially, then run `write --all` once after all targets are updated so the aggregate record is refreshed in one render. Never hand-edit the aggregate record; the script writes it. The record diff is the reviewable statement that the sides match.
3. When a source and its pairs are deleted, delete them together: the source, every counterpart, the aggregate record and inbound links. When a source is renamed, move the source, its counterparts and record to the new stem, repair their switchers and inbound links, then run `write --all` for the renamed source. When only a target is retired, leave the source in place, remove that counterpart and its switcher entry, and run `write --all` for the source; when the last target is removed, that command removes the empty aggregate record. A named `write --target` never retires a target.
4. Do not widen the work beyond the documents selected by the project instructions, the user or the responsible workflow.
5. Before handing over, the touched pairs are green under `check`, and a range-wide run checks every existing pair the change touched (when available, use the `dsh-spec-pre-push-checks` skill). Report the exact `write` and `check` commands and their observed results.
6. Keep the handover reviewable: say which pairs are new, which were minimally updated, and list pending terms and terminology decisions prominently.

## Responding to translation review

Follow the project's review-reporting convention (when available, use the `dsh-spec-code-review` skill). Evaluate each comment on its merits. A terminology comment is a decision about the project's terminology table, not about one file: apply the decided rendering through the project's procedure, and to the pair it came from.

## Stop and hand over

Stop and report instead of guessing when:

- the pair's last-confirmed state cannot be recovered, or a minimal update is named for an incomplete pair;
- the change would need a terminology decision the table does not make;
- the two sides' generated regions disagree, or a generated source is not declared;
- the target's terminology table is missing and `init` cannot create it because the target language is undeclared or its display name is neither declared nor learnable from the counterpart or the standing instructions;
- a structural change cannot be mapped safely;
- the prose-briefing or whole-document path cannot preserve the required working separation through an isolated subagent, a clean-context handoff, a staged independent review, or another verifiable mechanism;

and hand the change to review with the missing mechanism, completed work, pending work, pairs, records, unresolved decisions, and the resumable next step named.
