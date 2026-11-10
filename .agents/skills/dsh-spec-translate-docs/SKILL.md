---
name: dsh-spec-translate-docs
description: "Use when translating documentation, updating a counterpart, or checking a pair — maintain paired Markdown documents in declared target languages: keep pairs in step, update small changes directly, add in-scope counterparts, brief or delegate larger ones, and record and verify consistency. 用于翻译文档、更新对侧文件或检查配对：维护声明目标语言的配对 Markdown 文档——编辑后保持既有配对一致、直接更新小型局部改动、在常驻指令或用户指令范围内新增对侧、运行最小更新简报与委派整篇翻译，并记录与校验配对一致性。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
compatibility: "Requires Node.js 22.19+ or 24+ and Git for the briefing. No install and no network access."
---

# Translating paired documents

## Invocation boundary

This skill runs when the user asks for translation or pair maintenance, when the project's standing instructions say an existing pair is maintained, or when a documented change touches a side of an existing pair. The standing instructions and the user's explicit instruction authorise creating or updating a pair; the check never demands that a document be paired. A file outside both the standing instructions and the user's explicit instruction is left alone.

## What this skill is

A self-contained mechanism for a corpus of paired Markdown documents: the skill entry, three references, and one bundled script. `<skill-dir>` is the directory containing this `SKILL.md`; run the script from the project root. The script is parameter-driven; the pairing contract owns the options, their defaults and the override rules. The check verifies existing pairs only: file structure, Markdown structure, generated-region equality and the recorded hashes. It does not decide that a source should have a counterpart; that decision belongs to the standing instructions or the user.

## The pairing model

A pair is a source `foo.md`, one counterpart per target `foo.zh.md` or `foo.<lang>.md`, and one aggregate record `foo.i18n.yaml`. The [pairing contract](references/pairing-contract.md) owns the record and signature format, switchers, selection, regions, links, terminology, the CLI's options/defaults/exit codes and discovery prunes; the [style examples](references/style-examples.md) file carries the default voice guidance and samples. The script is `<skill-dir>/scripts/translate-pair.mjs`; its verbs are `list`, `check`, `write`, `brief` (with `--apply`), `init`, and `region render|splice`.

## Triage by change type

- **Existing pair, small local change** (one or two Markdown units in one section; no new or moved terminology, no structural change, no generated region): update the counterpart directly on the spot. This is the lightweight path.
- **Existing pair, any other change**: the briefing path.
- **New pair** (standing instructions or explicit instruction): the whole-document path. The orchestrating agent does not translate whole documents itself.
- **Deleted or renamed document**: remove the counterpart, remove its link from the source switcher, then run `write --all` for the source; a recorded target with no counterpart is dropped. A named `write --target` never drops a target, and an entry without a counterpart is an incomplete pair.
- **Generated region**: the generator updates both sides; never edit a region by hand.
- **Frozen or excluded document**: the standing instructions say it is not maintained; do not create, update or repair its pairs.

## The lightweight update path

Use it only when the change is local (one or two Markdown units in one section), the terminology table already covers the touched terms and no first occurrence moves, no heading, list, table or fence structure changes, and no generated region is involved. Then:

1. Load the target's terminology table, or run `init` first when it is missing. Read the style guidance from the project's declared style file, or the default [style examples](references/style-examples.md) when none is declared; consult the nearest sample only when the touched wording needs calibration.
2. Make the smallest counterpart edit that covers the change; preserve the reviewed phrasing of everything untouched. Do not re-read or re-translate the whole document.
3. Follow the [translation rules](references/translation-rules.md); calibrate against the nearest declared/default sample when the wording needs it.
4. Confirm every existing target of the source in the same change: edit a target, then `write --target`, and continue; use `write --all` after all are updated. Never write a target before editing it, and run writes for one source sequentially.
5. Run `check <source> --target <lang>`.

When more than one target exists and the wording of each is more than a local patch, use the briefing path per target. If the change turns out to cross sections, need a terminology decision, or alter structure, stop and use the briefing path instead.

## The briefing path

1. **Brief the change.** `node <skill-dir>/scripts/translate-pair.mjs brief <pair path> --target <lang>` prints the authored side's change since the last confirmed state at the narrowest aligned unit, with three-way text, matching terminology rows and first-occurrence notes. Generated regions never enter the briefing: aligned regeneration says nothing to brief; disagreeing current regions are a precondition failure. The pair must be committed.
2. **Apply a mechanical-only change directly.** When the brief maps every change inside fenced code, add `--apply`; the script splices and structure-validates the counterpart. On prose changes `--apply` exits 2 and writes nothing.
3. **Delegate a prose change.** Pass a subagent the briefing (or the command to print it). The brief is its whole working set; it escalates to the whole-document sources only when a decision is genuinely unanswerable. The briefing rules name the project's declared style file or the default references/style-examples.md; read it before editing.
4. Make the smallest edit that covers the change, then verify the changed spans against the source.
5. Record and check the pair; the briefing's Finish commands are pair-scoped. A source-side change may be confirmed one target at a time: edit a counterpart, `write --target <lang>`, then continue; untouched targets stay out of sync until written. Never write a target before editing it, and run writes for one source sequentially.

## The whole-document path

The orchestrating agent does not translate: spawn a subagent. The translator reads the project's standing instructions, the [pairing contract](references/pairing-contract.md), the [translation rules](references/translation-rules.md), the project's declared style file or the default [style examples](references/style-examples.md) first; when the target's terminology table is missing, run `node <skill-dir>/scripts/translate-pair.mjs init --target <lang>=<name>` first. Translate the whole file section by section, keeping each section's structure locked to the source.

### Translate

- **Pass 1 — write, don't transpose.** Read a semantic unit, then restate it as a native technical author; preserve the frame without sentence-by-sentence correspondence.
- **Pass 2 — verify against the source, clause by clause.** Nothing added or dropped; every term follows the table; every code span survived verbatim. Fix by rewriting natively.
- **Read the completed counterpart alone.** Rewrite phrasing whose awkwardness only appears in isolation.
- Write only the final text, never drafts or notes.
- Never edit a generated region; the generator writes both sides.
- Write the switcher lines, `write` the record, and `check` the pair.

A generated source (`--generated`) omits only its own switcher; the counterpart backlink remains required.

## Find the work

- `list` reports the pairs that exist; use `--select <glob>` and `--skip <glob>` to narrow the set. There is no completeness report: a source without a counterpart is simply not a pair.
- `brief` with no pair argument reports every drifted existing pair; a pair it cannot brief is reported on stderr, the other briefs are still emitted without `--apply`, and the command exits 2. A generated-region drift is fatal for the whole run.
- Discovery walks hidden directories; dependency/build trees, `.agents/skills` and `.agents/dsh-spec-translate-docs` are pruned by default. Frozen or vendored trees are kept out of the work by the standing instructions and the selection filters, not by an exclusion-artifact rule.
- In a change that edits a paired document, the work list is the change's diff: every changed side needs its counterpart brought along and the pair recorded in the same change.
- A source-side change is reflected in every existing target pair of that source in the same change. A translation-only correction that leaves the source untouched stays pair-local.

## Finish the pair

1. `write` each confirmed pair; after a source-side change that affects several targets, use `write --all` for the source so every existing target signature is refreshed in one render. The record diff is the reviewable statement that the two sides say the same thing. Regenerate frozen regions on both sides; they are not translated.
2. Do not widen the work to unrequested documents; the standing instructions and the user's instruction bound the change.
3. Before handing over, the touched pairs are green under `check`, and a range-wide run checks every existing pair the change touched (when available, use the `dsh-spec-pre-push-checks` skill).
4. Keep the handover reviewable: say which pairs are new, which were minimally updated, and list pending terms and terminology decisions prominently.

## Responding to translation review

Follow the project's review-reporting convention (when available, use the `dsh-spec-code-review` skill). Evaluate each comment on its merits. A terminology comment is a decision about the project's terminology table, not about one file: apply the decided rendering through the project's procedure, and to the pair it came from.

## Stop and hand over

Stop and report instead of guessing when:

- the pair's last-confirmed state cannot be recovered, or a minimal update is named for an incomplete pair;
- the change would need a terminology decision the table does not make;
- the two sides' generated regions disagree, or a generated source is not declared;
- the target's terminology table is missing and `init` cannot create it because the target language is undeclared or its display name is neither declared nor learnable from the counterpart or the standing instructions;
- a structural change cannot be mapped safely;

and hand the change to review with the pairs, the records, and the unresolved decisions named.
