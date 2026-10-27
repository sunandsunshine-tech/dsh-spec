# Agent Note: Reforge the skill forge as three steps over the Agent Skills guides

Status: implemented

English | [中文](2026-10-23-reforge-the-skill-forge-as-three-steps.zh.md)

## Problem

The skill forge carried a recomposition step and a body-budget ladder: it told the forger to write fully inline, then extract global layers and whole steps until the body fitted a token budget. In the first forging batch this process became the goal. Each revision was restructured around checkable metrics (six detached operations, then a model plus operation table, then a single-use case, then a six-step router), and each rewrite lost upstream rules; the maintainer rejected the result as worse than the first reviewed version. The forge's own writing rules also duplicated and partly contradicted the Agent Skills guides that the package treats as its specification.

## Decision

The landed forge is three in-body steps, with the Agent Skills guides as the content authority:

1. **Intent recognition** — goal, boundary, deliverable, mode, languages, forge directory, landing and record location, forge settings; the target audience (with its domain); and the adoption environment's Script decision (runtime, tools, testing route, hard red line when the runtime is missing).
2. **Collect, analyze and dispose** — collect Docs, SOP and Script; list every source constraint; deconstruct; apply keep/adapt/re-bind/dissolve; verify coverage and honesty.
3. **Write the skill content** — before writing, read [Agent Skills Best Practices](https://agentskills.io/skill-creation/best-practices) and all content it links, and follow them as written. `references/offline-skill-authoring.md` is a distilled fallback read only when those sources cannot be read; it is not a second authority, and the online originals win.

The three steps and the global rules live in `SKILL.md`; the offline fallback is the only reference file the forge ships. The process rules are retained: interaction, languages, forge directory, record, drafts, a compact format rule, SSOT, unambiguity and hard red lines. The scripts are unchanged: `forge.mjs` keeps the draft/review/land lifecycle, and `verify-skill-spec.mjs` keeps the mechanically decidable checks and still reports body size; an over-size body is a recorded ruling, not a routing ladder.

### Settings

| Setting | Value |
|---|---|
| Mode | iterate; the landed forge skill was the source of the work draft |
| Forge directory / landing | `.agents/dsh-spec-skill-forge/` / `skills/dsh-spec-skill-forge/` |
| Drafts | work and review drafts removed on landing |
| Languages | delivery English; review Chinese; trigger Chinese |
| Record | this note |
| Rollback | restore `skills/dsh-spec-skill-forge/` and this triplet from the previous commit |

### Dispositions

| Previous content | Disposition | Home |
|---|---|---|
| `references/3-recomposition.md` (3.1 structure, full-inline then extraction, tidy) | dissolve | the specification, best-practices and progressive-disclosure guides own structure and detail; step 3 states what to read and how to check |
| Complete Script (3.2) | split | environment decision → step 1; implementation, interface and tests → step 3 scripts obligation |
| Body token estimates and over-budget ladder | dissolve | guides' progressive-disclosure advice; `verify-skill-spec.mjs` still reports size; over-size is a ruling |
| Global `Format and description` rule | re-bind | a compact global `Format` rule that delegates format specifics to the guides |
| Global `Resources and ownership` rule | dissolve | best-practices and using-scripts guides |
| Global `Outcome assertions` section | dissolve | step 3's completion/check/failure covers the final artifact, drafts and record |
| Audience/domain/environment in step 2 Anchor | move | step 1 intent recognition |
| `references/1-intent.md`, `references/2-analyze-and-dispose.md`, `references/3-write.md` | dissolve | content inlined into `SKILL.md`; the forge ships no other reference file |
| SOP steps 1–3 | re-bind | three in-body steps: intent, collect and dispose, write content |
| Offline fallback | keep | `references/offline-skill-authoring.md`, read only when the online sources are unreachable |
| Folded `Docs / SOP / Script` definition | restore | three separate global definitions |
| `SSOT` / `Unambiguity` rules | keep | unchanged global rules (ruling: forge-level quality, no conflict with the guides) |

### Verification

- `verify-skill-spec.mjs --strict-budget` on the landed skill → 11 checks, 0 failed; 174 lines, ~4,214 tokens at the script's default estimate; one reference named.
- Landing: the work draft was copied to `skills/dsh-spec-skill-forge/`, the draft and review directories were removed, and `pnpm run skill:refresh` made the installed copy byte-identical.
- `pnpm test` (82 tests) and `pnpm run format:check` pass after landing; DCO passes for the change's commits.
- The online sources were reachable on 2026-10-23; the offline fallback was distilled from the specification, best-practices, optimizing-descriptions, using-scripts and evaluating-skills pages that day.
- The porting appendix's `3-recomposition.md` and budget-route references were updated to the landed three-step structure.

## Alternatives considered

**Keep the recomposition step and only remove the token table.** It lost because the damage came from the extract-to-fit process, not from the arithmetic; without a budget the step has no remaining purpose, and its structure rules duplicate the guides.

**Keep the global outcome assertions.** It lost on SSOT: with three steps, the final check belongs to step 3; a second assertion list was the place where duplicated rules accumulated.

**Adopt Anthropic's `skill-creator` skill instead of the forge.** It lost because it is a general authoring and evaluation methodology, not an extraction and governed-delivery process: it has no source-constraint dispositions, decision records, review-draft language split, draft/review/land lifecycle, adoption declaration or hard red lines. Its evaluation loop is the part worth borrowing, and step 3 requires the evaluating-skills guide.

**Name the linked guides as separate top-level sources.** It lost on the maintainer's call: best-practices already links them, so one entry URL plus the offline fallback is the smaller duplicate-free statement.

## Consequences

- The forge is smaller and has one content authority: the online guides. The body is 174 lines (~4,214 tokens) with one reference, leaving headroom under the script's 500-line/5,000-token report.
- What it gives up: the old inlined structure template and budget-driven extraction; an over-size body must now be a recorded ruling. The offline fallback can drift from the online guides and is marked fallback-only.
- Trigger evaluation and script probes need an agent client and the target runtime; when they cannot run they are recorded as unverified.
- The refactor edited the landed forge through its own draft/review/land cycle; the review draft was the maintainer's review artifact.
