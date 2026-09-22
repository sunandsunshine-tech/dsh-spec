# Agent Note: The shipped skill text is an extraction

Status: implemented

English | [中文](2026-09-21-the-shipped-skill-text-is-an-extraction.zh.md)

## Problem

`skills/` is an extraction of the skills in `submodules/dsh/`, and the extraction is the package's reviewable claim: anyone can diff a skill against the revision it came from and see what this skill set changed. Drift breaks that, and three kinds had accumulated. Rules whose subject belonged to the skill set rather than to the skill carrying them had been written into skill text — a gate inventory in `dsh-prose-standard`, a manifest-record paragraph and a selection table in `dsh-pre-push-checks`, a tree-validation section in `dsh-archive-agent-notes`, an approval gate in `dsh-translate-docs`, and a terminology-ownership bullet in the pairing contract. Sentences had been rewritten with no cause, so a line that said what its source said said it differently. And defects had survived because no gate reads for them: sentences whose middle a rewrite had eaten, a switcher example whose inline code had been re-wrapped until it no longer parsed, literal references to files the skill set does not ship, and this repository's own `--store-dir` workaround inside a published command.

A derived text that drifts for no recorded reason stops being reviewable. A diff against the source no longer answers "what did this skill set change on purpose?", which is the only question the extraction exists to make cheap, and a reader who cannot tell a deliberate generalization from an accident re-reads every line.

The same class of defect lived one layer down. The templates `init` installs carried two paths from the source project's engine directory, an engine placeholder that survived into every initialized project because nothing replaced it, and a switcher line pointing at a Chinese counterpart `init` deliberately does not create — so a fresh project's own contract failed the link gate on its first run.

## Decision

A shipped skill file — and every template the skill set installs — deviates from the text it came from for exactly two reasons; a change that has neither is a defect to repair or a decision to record elsewhere.

1. **A reference change the shipped layout requires.** A check is addressed by name through the dispatcher instead of a package script, a contract moves into the skill's `references/`, a path names the notes tree or the engine directory.
2. **A generalization that removes one project's specifics.** Its product name, package layout, linters, documentation tree, and private gates are replaced by what holds for any project that adopts the skill set.

Everything else was removed or repaired in this change. A rule that belongs to the skill set moved to where its owner is — the manager, a reference document, or a project's own instructions — rather than staying in a capability that ships to every project. The terminology-table rule moved into `docs/AGENTS.md` beside the table it governs. `dsh-translate-docs` regained the two frontmatter keys that make it user-invoked, which is the mechanism its added prose had been describing in words. Two reference files renamed for no reason went back to their source names, so a directory diff compares like with like.

Defects were repaired rather than reverted. Prose was restored where a rewrite had destroyed it, every reference now resolves to something the skill set ships or to a path a project owns, and no published command carries a workaround for this repository's environment.

## Alternatives considered

**Keep the additions and record them.** The added rules were true, and each had been written because a reader needed it. It lost because a skill's text is what an agent loads, and one project's operating rule does not belong in a capability the skill set ships to every project: the same material already sits in the skill set's own documents, which is where a reader meets the package.

**Treat the skills as this skill set's own documents and rewrite them freely.** Each skill would read more clearly on its own terms. It lost because it destroys the cheap answer to "what changed in the extraction?": the pinned baseline in `submodules/dsh/` is what keeps a re-extraction and its review a matter of minutes rather than a full read.

**Cut every reference to an unshipped mechanism without replacing it.** Deleting the clause is the shortest repair for a dangling path. It lost where the clause carried the rule — the evidence selector, the citation test — so those were restated generically instead, and only pointers that named nothing at all were dropped.

## Consequences

- A diff of any skill directory against `submodules/dsh/` shows reference changes and generalizations and nothing else, so a reviewer can attribute every remaining line to one of the two allowed causes.
- The removed material is not lost: the manager keeps the record and the engine, the project README introduces the set, and the terminology rule lives in `docs/AGENTS.md`.
- No shipped skill names this repository's own gates, its sandbox workaround, or its vendored baseline any more; a consumer reads only paths it has, and the templates resolve the engine path as they are written instead of leaving a placeholder for a person.
- What this costs is source fidelity of a different kind: wherever a sentence had to be generalized clause by clause, the skill's prose is further from the source's phrasing than a free rewrite would have left it.

## Verification

`dsh-spec.ts check --all --root .` ends `check notes: ok` and `check notes-archived: ok`, `scripts/verify-skill-structure.ts` passes for every skill directory this change touches, and the per-file diff against `submodules/dsh/` is the change's own evidence: each remaining difference is a reference change or a generalization.

## Related

- [Terminology rows are the maintainer's decision](2026-09-20-terminology-rows-are-the-maintainers-decision.md) — the rule this change moved out of the pairing contract.
