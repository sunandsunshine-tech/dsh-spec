# Agent Note: Forging dsh-spec-skill-forge

Status: implemented

English | [中文](2026-10-19-forging-dsh-spec-skill-forge.zh.md)

## Problem

The forge skill adapts a source to a target audience, but the point where adaptation is decided — which rule keeps its meaning, which is re-bound, which loses its referent — was left to the judgement of whoever executed it. Two executions from the same material and the same decisions could produce different skills, and nothing in the text could call either one wrong. The forging also kept a decision record of its own, separate from the project's decision mechanism, so its decisions landed in a second log the next session would not read.

## Decision

The forged skill is a five-step procedure — converge, anchor, draft and dispose, bundle a script, verify and route — with four references (the forged-skill rules, the process rules, the dispositions, the specification checks) and one script, the mechanical gate.

**The adaptive core is constraint, disposition, basis.** The upstream's binding statements are enumerated with their locations. A deconstruction pass extracts passages that state a way of working; every other constraint takes the first rung that holds — keep, adapt, re-bind, dissolve. The constraint table records the upstream item, the disposition, the location in the forged skill, and a basis: a target-audience fact, a purpose, the upstream text, or a decision made in the forging. Coverage, the burden of proof and the honesty rules live in `skills/dsh-spec-skill-forge/references/dispositions.md`. Naming the upstream's own domain is conditional on the upstream having one, and the recorded differences are part of step 2's assertion.

**The target audience is three things, not one.** Its *domain* is the field and how it speaks; it decides term meanings and which rung a rewrite lands on. Its *environment* is the runtime and tools the forged skill needs to do its work, whether it runs them from a script or invokes them from its instructions; those go into the forged skill's `compatibility` field and, when there is a script, its header. Its *declared place* is its `AGENTS.md` or a file it declares; when it exists it supplies the instance values that customize the forged skill's defaults, and when it does not the defaults stand. The *adopter's environment* is separate: where the forging happens, its decision mechanism, the draft and the record, and the tooling available to write and test the script. Conflating any two of these moves a fact to the wrong home.

**The record is the project's decision mechanism.** A forging writes its decisions into the adopter's notes tree, ADR set or decision log, bound to that mechanism's form; with no mechanism named and no driver, the fallback is `<draft's parent>/forge-record/<name>.md`. This repository declares the form in `AGENTS.md`: an Agent Note at `.agents/dsh-spec/notes/{proposed,implemented}/process/YYYY-MM-DD-forging-<skill-name>.md`, dated the day the forging starts and moved to `implemented/` when the forged skill ships. This note is the record of this forging in that form.

**The budget estimate is tokenizer-aware.** The gate keeps the specification's 5,000-token limit and estimates at 3.3 non-CJK characters per token by default — the low end of models released in 2026, measured English prose running about 3.3–4.7 characters per token — while charging CJK ideographs 1.1 tokens each and CJK punctuation and fullwidth forms one token, the conservative edge of the observed 0.6–1.1 tokens per CJK character. `--chars-per-token` matches a tokenizer for non-CJK text. The process rules live in `skills/dsh-spec-skill-forge/references/process-rules.md` so the body passes the conservative estimate. Sources: [DeepSeek token usage](https://raw.githubusercontent.com/thevibeworks/deepseek-docs/refs/heads/main/content/en/quick_start/token_usage.md), [tokenizer efficiency benchmark](https://zenodo.org/records/19314968), [Presenc AI comparison](https://presenc.ai/research/llm-tokenizer-efficiency-comparison-2026), [character-per-token table](https://docs.rs/char-token-est/latest/src/char_token_est/lib.rs.html).

**Unambiguity and single source.** A term is defined once and cited by its exact designator; a definition, rule or fact has one home. The references hold the lookup tables and the judgement checks, and the gate owns the mechanical checks its output lists. The description is the skill's trigger and is tested before acceptance.

**Cheap convergence, staged verification.** After each change the driver sees the file and the diff. The gate and judgement checks run when the driver states the design is settled, not after every exchange; acceptance follows verification. A real run, an independent read and a full regression belong to the adopting project's release process.

**The previous 121-line skill is this forge's own half-finished state, not an upstream reference.** It was kept in place and re-tested rule by rule; the rules that changed are the decisions above, and no source-constraint table is due for a source that is this skill's earlier self.

### Forging settings

| Setting | Value |
|---|---|
| Mode | iteration; the skill applied to itself |
| Upstream | the Agent Skills specification and the design decisions of session `7e1b9dda`; the previous 121-line skill was this forging's own earlier state, not an upstream |
| Draft parent / forged skill's parent | `docs/skills-draft/` / `skills/`; the draft was removed after landing |
| Languages | draft Chinese, target English, request Chinese; the English landed artifact is the rendition |
| Record | this note |
| Acceptance | the driver accepted the landed artifact on 2026-10-19 |

### Anchor list

| Designator | Meaning | Home |
|---|---|---|
| Driver | the human who directs the agent | `skills/dsh-spec-skill-forge/SKILL.md` "Terms" |
| Adopter | the person who uses the skill to forge a skill | "Terms" |
| Adopter's environment | where the forging happens: project, decision mechanism, draft and record, tooling | "Terms" |
| Target audience | the people or agents who use the forged skill, and their project | "Terms" |
| Target audience's domain | the field and how it speaks; decides meanings and disposition rungs | "Terms" |
| Target audience's environment | the runtime and tools the forged skill needs, scripted or instructed | "Terms" |
| Adopter's declared place | the adopter's `AGENTS.md` or declared file; names the mechanism and draft parent | "Terms" |
| Target audience's declared place | the target audience's `AGENTS.md` or declared file; supplies instance values | "Terms" |
| Reference upstream | the material or existing skills the constraints come from | "Terms" |
| Forge skill | this skill | "Terms" |
| Forged skill | this skill's product | "Terms" |
| Record | the project's decision mechanism or the fallback file | "Terms", `references/process-rules.md` "The record" |
| Target-audience fact | a checkable statement about domain, environment or declared place | "Terms" |
| Ruling | a decision where the criteria leave a choice | "Terms", `references/process-rules.md` "Escalation and rulings" |
| Source constraint | an upstream statement that binds the target audience | "Terms", step 1 |
| Disposition | the decision taken for a source constraint | "Terms", `skills/dsh-spec-skill-forge/references/dispositions.md` |
| Home | the one place a definition, rule or fact is written | "Terms", `skills/dsh-spec-skill-forge/references/forged-skill-rules.md` |
| Gate | `skills/dsh-spec-skill-forge/scripts/verify-skill-spec.ts` | "Terms" |
| Landed artifact | the draft or rendition, verified, accepted and placed | "Terms" |
| Specification | the Agent Skills specification | "Terms" |

## Alternatives considered

**Tiers of the target audience.** Subdivision and grouping have no natural end, so every tier set guesses at a space that keeps growing. The constraint-travelling criteria replace them: a source constraint and its disposition are countable on the upstream side, which is what coverage needs.

**A separate working record beside the project's decision mechanism.** It duplicates the mechanism and leaves the next session reading a log the project does not own. The project's notes, ADRs or decision log already carry decisions, their reasons and rejected directions; the forging record is bound into that form, and only a project with no mechanism named and no driver gets the fallback file.

**One "target audience environment".** It hid three different things under one name: the domain that decides meanings, the runtime the skill must run on, and the declared place that supplies instance values. The split costs two designators and moves every fact to the home that can check it.

**A compatibility-language designator.** "Compatibility" collides with the specification's `compatibility` frontmatter field, which means environment requirements. *Request language* says what the designator is for.

**Mutual exclusivity between this skill's description and every other skill's.** Which skills an audience has installed is open, so the requirement is unenforceable; self-containment replaces it.

**"Obligation" as the unit.** Whether an instruction protects an obligation is inferred from the environment rather than read from the text, so two executions would enumerate different sets. The pair of source constraint and disposition is countable.

**A configuration surface inside the forged skill for adjustable values.** A default lives in the skill and its instance value belongs to the declared place, so a second surface duplicates ownership.

**A fixed section skeleton for the forged skill.** Form follows content; a skeleton fights the material and, in a paradigm-derived skill, fights the paradigm.

**A record format imposed on the adopter.** The record binds to the mechanism the project already reads; imposing sections would intrude on that project's space.

**Naming the companion skills a forged skill depends on.** It is an assertion the forge cannot keep; a named example is a matching hint that costs nothing when the skill is absent.

## Consequences

The forging buys a procedure whose adaptation decisions are countable and checkable: every upstream constraint has a disposition and a basis, the gate checks the mechanical half, and the record lives where the project reads decisions. The landed artifact passes the gate under the conservative estimate and a cold start executes steps 1–5 from the skill directory alone.

The costs are real. A notes-format record is heavier than a working log, and the fallback keeps only the smallest forges cheap. Semantic judgement is narrowed, not removed: coverage, entries and designator identity are checkable, but single-source ownership and trigger quality still need a strong model or a person. The four target-audience/adopter terms have to stay apart; renaming one silently is the failure they were introduced to prevent. The budget stays an estimate — 3.3 non-CJK characters per token and 1.1 tokens per CJK ideograph at the conservative edge, with `--chars-per-token` tuning the non-CJK side only — and any addition to the body routes content out first. Kana and hangul are charged at the non-CJK rate. Trigger quality remains unverified in this environment.

## Verification

The landed artifact: `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.ts skills/dsh-spec-skill-forge --strict-budget` → `11 check(s), 0 failed`, exit 0, 161 lines, ~4667 tokens at 3.3 chars/token.

The functional suite: `node --test 'tests/**/*.test.ts'` → 39/39 pass, 25 of them gate cases.

The judgement checks: trigger quality is unverified — this environment has no agent harness in a target audience's environment to load the forged skill; the reason is recorded rather than a pass. The script design check passes: the gate is non-interactive, documents `--help` with examples and exit codes, prints structured output with `--json`, separates stdout from stderr, and exits 0/1/2 meaningfully.

The records and links: `dsh-spec notes check --all` → 24 notes, structure and format consistent; `translation-pair check` on this note → consistent; `md-links check` on the touched files → all links resolve.

## Related

- [Forging dsh-spec-skill-forge (2026-10-21 proposal)](../../proposed/process/2026-10-21-forging-dsh-spec-skill-forge.md) — a proposed composition-first redesign; this note remains the record of the shipped five-step skill until that proposal ships.
