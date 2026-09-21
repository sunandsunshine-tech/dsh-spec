# Bilingual documentation

English | [中文](i18n-contract.zh.md)

This project's documentation is read by people and agents both inside and outside the team, so every document in scope is maintained in English and Simplified Chinese. This page defines the pairing contract, checks, scope, and exclusions; [translation-rules.md](translation-rules.md) defines how to translate; `docs/terminology.md` is the terminology source of truth. Routine agent work follows the lightweight path in `AGENTS.md`; the extended [.agents/skills/dsh-translate-docs](../SKILL.md) workflow is available only through explicit user invocation.

## The pairing contract

- **Both languages carry equal authority.** A document may be authored and reviewed in either language first — a Chinese-first Agent Note is as legitimate as an English-first one — and the counterpart is translated from it. Neither file outranks the other; what binds them is that they must say the same thing.
- **A pair is three sibling files.** The English `foo.md`, the Chinese `foo.zh.md`, and a consistency record `foo.i18n.yaml`, all in the same directory. No locale directories, no separate translation repo, no interleaved bilingual files. Pairs merge whole: a PR never lands one language without the other two files.
- **The consistency record.** `foo.i18n.yaml` holds the full git blob hash of each side as of the last time the two were confirmed to say the same thing:

  ```yaml
  foo.md: 3f786850e387550fdab836ed7e6dc881de23001b
  foo.zh.md: 89e6c98d92887913cadf06b2adb97f26cde4849b
  ```

  Blob hashes, not commit hashes, so the record is computable for files edited in the same PR (`git hash-object foo.md`) and consistency is a pure content comparison. `--write` stores those snapshots in the local Git object database before recording them, including uncommitted working-tree contents, and pins every distinct stored blob under a content-addressed `refs/dsh/translation-pairing/snapshots/` ref so garbage collection cannot invalidate a recorded recovery pointer. The recorded hashes recover the exact last-confirmed text of either side, so an out-of-sync pair is updated by patching the counterpart minimally against the edited side's diff — never by re-translating whole files. Routine work makes that patch directly; when the user explicitly invokes the extended workflow, `node <manager>/scripts/dsh-spec.ts brief <pair>` can instead assemble the update at the narrowest safely aligned granularity and `--apply` can splice a code-fence-only change after structural validation. After bringing the pair back in line, `node <manager>/scripts/dsh-spec.ts translation-pair --write <pair>` re-records both hashes; that yaml diff is the reviewable act of confirming consistency, which is why `--write` requires naming the pairs you confirmed (`--write --all` is the explicit corpus-wide form).

- **Language switcher.** The Chinese file always links back immediately after its H1 heading with `[English](foo.md) | 中文`, and the English file reciprocates there with `English | [中文](foo.zh.md)`. There is no exemption: a document whose generator cannot carry the reciprocal line should not declare the pair.
- **Structure mirrors the counterpart.** Heading depths and order, list kinds, ordered-list starts, list item counts, table row and column counts, semantic link targets with exact query/fragment suffixes, and verbatim code blocks match one to one across the pair. When a relative document link targets the active bilingual corpus, the English side uses its `.md` path and the Chinese side uses its `.zh.md` path. A target outside the active corpus keeps the authored path. See [translation-rules.md](translation-rules.md) for the full preservation rules.

## The gate: verify-translation-pairing

`node <manager>/scripts/dsh-spec.ts translation-pair` (the corpus-wide check to run before a push that touches a pair) enforces the contract mechanically:

1. A document declares its own pairing: a `.md` with a `.zh.md` counterpart or an `.i18n.yaml` record beside it is one side of a pair, and a document with neither is left alone. No list names the documents that must be paired, so no list can drift from the tree.
2. Every pair artifact that exists at all is complete and consistent: all three files present, each side's current blob hash equals the recorded one (editing either side without re-confirming the pair goes red), both sides carry their language switchers, every ordinary relative document link uses its source side's target locale, and the structural signatures match in order — heading depths, verbatim code blocks (info string and content), table row and column counts, list kinds, ordered-list starts, item counts, and semantic link targets with exact query/fragment suffixes apart from the switcher.
3. Dependency, build and nested-repository trees are outside the corpus, and the frozen Agent Notes under `.agents/dsh-spec/notes/archived/` are outside this evolving gate; their dedicated verifier requires and seals the complete existing triplet instead. A `.zh.md` or `.i18n.yaml` there is never read.

Source-oriented code gates consume an exact `.zh.md` fence sequence as a derivative of its unsuffixed sibling instead of compiling or manifesting the same code twice. The sequence must match in length, order, fence kind, and byte-exact body; otherwise both copies remain independently checked and the pairing gate reports the structural mismatch.

`node <manager>/scripts/dsh-spec.ts translation-pair --list` prints the current pairing state of every document in scope — missing, out-of-sync, or ok. It never fails; `missing` and `out-of-sync` rows identify violations that the normal check rejects.

`node <manager>/scripts/dsh-spec.ts translation-pair <pair...>` checks just the named pairs — any of a pair's three files (or its bare stem) names it — so an update loop verifies its own pair in seconds instead of re-scanning the corpus. The no-argument corpus-wide form is the one to run before a push; a scoped green never substitutes for it.

The practical rule this gate creates: **when a PR edits either side of a paired document, the same PR updates the counterpart directly in one terminology-guided pass and re-records the pair with `--write <pair>`**. A change that leaves a pair out of sync fails the gate.

The gate's limit, stated plainly: **a green gate means the pair was confirmed consistent at these exact contents, not that the confirmation was sound.** It checks hashes and Markdown structure; it cannot judge whether the two sides say the same thing, or whether the wording is accurate, well-termed, and natural — that is the reviewer's half of the contract, per [translation-rules.md](translation-rules.md). A re-recorded pair with a sloppy counterpart passes the gate; it must not pass review.

## Scope and exclusions

**Scope**: whatever the tree declares. A document with a counterpart or a record beside it is in scope, wherever it lives, and a document with neither is not. Nothing has to be registered, so a new pair is translated the moment it exists and an untouched document is left alone.

A generator that emits both sides declares the pair by emitting the `.zh.md` as well. Its output is the source of truth on both sides, and regeneration that changes the English leaves the pair out of sync until the counterpart is regenerated or updated and re-recorded.

**Outside the corpus** — never read by the gate, whatever sits there:

- Dependency, build and vendored trees, and a nested repository: their Markdown belongs to another owner.
- `.agents/dsh-spec/notes/archived/` — frozen historical triplets. `verify-archived-agent-notes` validates their completeness and content seals; translation maintenance must never rewrite them.
- Anything else a project wants left in English: it is left without a counterpart, which is the whole declaration.

**Universal requirement**: a pair merges whole. Both languages plus the record, in one change, or the gate reports an incomplete pair.

## Division of labor

Routine counterparts are updated directly by the working agent in one pass after it loads `docs/terminology.md`; it does not invoke a translation skill, generate a briefing, run a separate translation-review pass, or delegate to a subagent. The extended [dsh-translate-docs](../SKILL.md) workflow retains those heavier mechanisms for explicit user invocation. The gate checks pair completeness, recorded hashes, both switchers, and its documented structural signature. Review still owns translation quality, terminology, and structural requirements that the signature does not encode.
