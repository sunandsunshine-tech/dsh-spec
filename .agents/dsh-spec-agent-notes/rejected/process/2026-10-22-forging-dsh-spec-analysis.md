# Agent Note: Forging dsh-spec-analysis as the four-artifact object analysis method

Status: rejected — abstract meta-method prompts do not converge stably; concrete prompts win until the method can be formally checked

English | [中文](2026-10-22-forging-dsh-spec-analysis.zh.md)

## Problem

The repository ships a skill forge and an agent-team workflow but no reusable method for analyzing a complex object and rebuilding it. A design conversation worked out the method, but the first forgings failed the forge in three ways: they stated the steps without an assertable product, they extracted a shared artifact reference that the steps required for their completion judgments, and they surfaced a separate self-analysis although analysis already contains it. The driver's reviews supplied the four-artifact account and corrected the extraction. This record covers the final forging.

## Proposal

Forge `dsh-spec-analysis` as a Skill that produces exactly four artifacts: the object's definition, its elements with membership assertions, its recomposition method (relations and rules with judgment assertions), and its evaluation criteria. The body keeps the layers and the step order; each of the six SOP steps reads one reference that holds its content, completion judgment, check method, failure recovery and artifact format. The working record holds the frame, cases, rulings and assertion evidence and is not a fifth artifact. The skill ships no script.

The forging follows the adopter's defaults: work draft in the delivery language (English) with a Chinese trigger in the description, review draft in the adopter's language (Chinese) with an English trigger, record as this Agent Note, landing target `skills/dsh-spec-analysis/`. The source is the shared conversation "Agent编排本质与组合"; the record cites it and the forged skill does not. Its relevant content is inlined here, because the record does not depend on a link:

- The forge is a meta-method rather than a set of writing steps: define what the object is, identify its Docs, SOP and Script, dispose of its constraints, recompose it, assert the result, and revise on the result.
- The transferable sequence is: understand the object, identify its elements, analyse and dispose, recompose, assert, revise. Replacing the object (skill, workflow, or any structurable object) carries the sequence over; what moves is the meta-method, not a domain procedure.
- Stability changes the contract: a stable deliverable may predefine its structure, while a dynamic object fixes only the method and leaves each arrangement to the situation.
- The driver supplied the four-artifact account, the object scope, and the precision and extraction corrections; those are the record's own rulings, not the conversation's claims.

### Forging settings

| Setting | Value |
|---|---|
| Mode | create; upstream conversation, revised four times after review corrections |
| Upstream | the shared conversation; the driver's four-artifact account and corrections; the skill forge as the composition and precision reference; the Agent Skills specification for triggering conventions |
| Draft parent / landing parent | `.agents/dsh-spec-skill-forge/draft/` / `skills/` |
| Languages | delivery English, review Chinese (the adopter's language), additional trigger Chinese |
| Description | trigger condition in English plus Chinese trigger keywords; no "explains" or "completed" |
| Record | this note |
| Acceptance | pending; the review draft is submitted to the driver before landing |
| Rollback | before acceptance, delete this note triplet; after landing, delete `skills/dsh-spec-analysis/` and the note triplet together |

### Collection

- **Docs.** From the conversation: the definitions of analysis, essence, definition, element, membership, relation, rule, recomposition and evaluation; the four-artifact account in the driver's second review; the scope, format, precision and clean-room requirements in the third review; the self-analysis and extraction corrections in the fourth. From the repository: the notes contract, the Agent Skills specification and the forge skill's composition rules.
- **SOP.** The six-step method: frame, define, decompose, derive relations and rules, establish criteria, assemble and assert. The upstream supplies the steps and the driver supplies the four artifacts and the output discipline.
- **Script.** None. The method's work is judgment and its artifacts have no universal schema, so no deterministic checker exists; the forge's "without Script, skip and record" branch applies.
- **Uncollected leads.** The conversation's early orchestration sections serve the sibling workflow forging, not this one; the control-loop literature behind the workflow criteria was not consulted; the Agent Skills specification was consulted only for triggering conventions. None of these can change this skill's design further.

### Deconstruction units

- **U1, conversation message 62 and driver review 2.** The analysis method as a sequence: identify the essence and what the object solves, derive the definition, decompose it into elements, analyse and dispose of constraints, recompose, assert, and loop where the result demands it. Purpose: an assertable analysis product rather than prose. Covers C1–C5.
- **U2, conversation message 62 and driver review 1.** The method is a standalone meta-skill, not part of the workflow skill; the workflow skill may use it at its intent stage; analysis depth adapts to the served decision. Purpose: keep the two skills independent and the depth proportional. Covers C6–C8.
- **U3, driver review 3.** The object scope is every structurable, assertable thing; the prose must follow the repository format; the precision must reach the forge's level and be validated by a clean-room analysis of "skill". Purpose: a generic, precise, validated method. Covers C9–C10 and C12.
- **U4, driver review 4.** Self-analysis must not be surfaced separately; the extraction must follow the forge's resource rule. Purpose: no abstraction leakage and no required reference split. Covers C11–C12.
- **U5, repository declaration and forge defaults.** The record is an Agent Note; delivery is English, review Chinese, additional trigger Chinese; scripts only for deterministic work; the four-artifact product and its record placement. Covers C13–C16.

### Dispositions

| Upstream item | Disposition | Location | Basis |
|---|---|---|---|
| U1: the analysis sequence and the four artifacts | Keep | Six SOP steps and their six references; cross-cutting rules 1–9 | The driver's four-artifact account |
| C1: definition from essence and what the object solves | Keep | Step 2 reference; rule 1 | U3 and the conversation |
| C2: elements with membership conditions and exact composition | Keep | Step 3 reference; rule 5 | U3 |
| C3: relations and rules with judgment conditions forming the recomposition method | Keep | Step 4 reference | U3 |
| C4: evaluation criteria from the mainstream standard or the purpose | Keep | Step 5 reference | U3 and the forge's evaluation discipline |
| C5: the product is exactly the four artifacts | Keep | Rule 10; body introduction | U3 |
| C6: adaptive depth | Re-bind | Rule 14; step 1 reference | U2; depth changes detail, not artifact count |
| C7: independent meta-skill; workflow may use it at intent stage | Keep | Description and boundary; sibling note | U2 |
| C8: precision to the forge's level | Adapt | Six references with fields, derivations and assertions; body budget route | U3 and the forge's precision |
| C9: object scope is every structurable, assertable thing | Re-bind | Object and object-kind definitions; the example list is illustrative | U3 |
| C10: repository format rules | Adapt | Lists, tables and commas throughout the body and references; no semicolon chains | U3 and the repository format rule |
| C11: self-analysis must not be surfaced | Dissolve | Removed the separate self-analysis section and reference; the method's scope implies it | U4: surfacing it leaks the abstraction because analysis already contains it |
| C12: extraction per the forge's resource rule | Re-bind | Six step references, one per step; the body keeps the order and the references; the shared artifact reference is removed | U4 and the forge's Resources rule: material a step needs for its completion judgment cannot be an optional reference |
| C13: shorter name, prefix kept | Adapt | `dsh-spec-analysis` | Driver review 1 |
| C14: record as an Agent Note | Keep | This note | The repository's notes contract |
| C15: no script unless deterministic work needs code | Dissolve | No script shipped | The forge's Script rule; no universal schema |
| C16: languages and trigger order | Keep | Description, work and review drafts | The forge's language defaults |
| U5: the forge's Docs/SOP/Script triad as fixed element categories | Dissolve | Elements derive from the definition's clauses | The driver's four-artifact account; fixed categories would bias the analysis |

Coverage: every constraint C1–C16 is covered by exactly one unit or disposition row; no constraint is covered twice, and no row is left without a basis.

Conflict recorded: the forge's resource rule forbids splitting material a step needs, while its budget route allows extracting SOP steps whole when the inlined body would exceed the limit. The inlined draft measured about 6,399 tokens, so the six step references are the budget route's sanctioned form; the earlier shared artifact reference was the violation, because it was neither a step file nor optional.

### Verification

`node skills/dsh-spec-skill-forge/script/verify-skill-spec.mjs .agents/dsh-spec-skill-forge/draft/dsh-spec-analysis --strict-budget --name-max 64 --description-max 1024 --compatibility-max 500 --max-lines 500 --max-tokens 5000 --cjk-tokens-per-char 0.6 --other-tokens-per-char 0.3` → 10 checks, 0 failed, 85 lines, ~2,614 tokens; the strict budget passes. The six step references are named in the body, load one per step, and sit one level deep.

Forge conformance, checked directly: the body carries the trigger (description), the skill definition and boundary, global definitions, global rules, SOP steps and outcome assertions, with no empty or extra layer; each step's needed material lives in its own reference; the field lists have one home (their step reference) and the body does not repeat them; the format uses lists and tables for conditions and branches; the record follows `AGENTS.md` and the notes contract; languages follow the delivery/review/additional-trigger rule; no script is claimed.

The clean-room validation requested by the driver was run twice with fresh agents restricted to the work draft. Both reports found the same defects, which are fixed in this draft: `clause` and `part` are now defined; the frame and rulings are held in the working record rather than added as artifacts; depth changes detail, not count; the field lists have one home; membership is structural and quality belongs to the criteria; a standard that cannot be consulted is marked unverified; and the separate self-analysis surface is removed. The agents' derived models of a skill (selection surface, directive body, on-demand resources) matched the forge skill's model of the same object on those elements; the forge's Docs/SOP/Script composition and disposition machinery were the deliberate difference, dissolved here in favour of the driver's four-artifact account.

A format audit over the body and the six references reports no semicolon chains outside tables, consistent table columns and no trailing whitespace. External trigger quality, cold start and representative-task utility remain unverified because this environment has no harness that installs the skill for its target audience.

The note gates also pass: `translation-pair check` reports the two forging records consistent, `notes check --all` reports 26 notes with consistent structure, and `md-links check` resolves the four record files.

### Review and landing

Four review corrections shaped this forging. The first raised the precision and shortened the name. The second supplied the four-artifact account. The third broadened the object scope, required the format rules and demanded a clean-room validation. The fourth required the self-analysis surface to be removed and the extraction to follow the forge's resource rule. The review draft is at `.agents/dsh-spec-skill-forge/review/dsh-spec-analysis/` in Chinese with an English trigger, and its six step references are projected into Chinese as well. It is submitted to the driver for acceptance, changes or rejection. Landing copies the work draft to `skills/dsh-spec-analysis/`, removes only this skill's draft and review directories, and moves this note to `implemented/`.

## Alternatives considered

**Extract one shared artifact reference that several steps read.** It lost because a reference required by a step's completion judgment is not optional; the forge's resource rule requires the step's content to move with the step, so each step now has its own reference.

**Surface self-analysis as a fifth artifact and a worked model.** It lost because analysis already contains self-analysis; a separate section leaks the abstraction and adds an artifact the four-artifact product forbids.

**Keep the object scope as a list of examples.** It lost because the driver's scope is every structurable, assertable thing; the list now illustrates and does not limit.

**Keep the prose as semicolon-chained sentences.** It lost because the repository's format rule requires conditions, branches and flows as lists or tables.

**Treat the clean-room reports as optional validation.** It lost because they exposed the definition, frame, depth and field-list defects that the forge's precision test would otherwise miss.

**Carry the forge's Docs/SOP/Script categories as the element model.** It lost because the driver derives elements from the definition, not from a universal classification.

**Prescribe a full ritual on every call.** It lost because depth follows the served decision.

**Ship a structure-checking script.** It lost because no universal schema exists for definitions, membership conditions or evaluation standards.

## Acceptance criteria

- The work draft passes `verify-skill-spec.mjs` with the strict budget and the parameters above.
- The review draft transcribes the body and the six references into Chinese without new concepts, and the driver accepts it.
- `skills/dsh-spec-analysis/` equals the accepted work draft after landing, and this note is under `implemented/`.
- The body keeps only the layers and step order; each step reads its own reference, and no reference is required by a step's completion judgment while living elsewhere.
- The description triggers on analysis of any structurable object and not on a local edit whose structure is settled.

## Risks

- The broad object scope may over-trigger on ordinary reading or summarising tasks; the description's "analyzed and rebuilt" condition and the "not for local edits" line reduce the risk, but trigger quality is unverified.
- The definition-first discipline is demanding; a weak model may settle for a description. The failure patterns and the equivalence assertion target that risk but cannot remove it.
- Six step references are six possible loads; the body alone gives the order and the assertions but not the field lists. That is the budget route's deliberate cost.
- No script checks the artifacts; an over-broad definition or a missing membership condition is caught only by step 6.
- The landing imports a new generic skill into a package whose other shipped skills trace to upstream; this record is the deliberate-deviation trace, and review is the point to reject it.

## Related

- [Forging dsh-spec-workflow](2026-10-22-forging-dsh-spec-workflow.md) — the sibling forging; the workflow object's four-artifact analysis is recorded there and was produced with this method.
- [The skill forge](../../implemented/process/2026-10-21-forging-dsh-spec-skill-forge.md) — the composition discipline and precision reference this forging follows.
