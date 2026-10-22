---
name: dsh-spec-skill-forge
description: "Use when creating, writing, rewriting, forging, improving, auditing, verifying, adapting, or migrating an Agent Skill (SKILL.md) — its description, structure, triggers, or specification conformance need work — from an idea, reference material, or one or more existing skills. Produces the skill directory and a record of the decisions behind it. Not for merely installing, loading, or using an installed skill. 用于创建、编写、改写、锻造、优化、核验、适配或迁移技能（Agent Skill / SKILL.md）。确定技能描述、触发时机、结构与规范符合性，产出技能目录与锻造记录。不用于安装、加载或使用已安装的技能。"
compatibility: "Requires Node.js 22.19+ or 24+ for the bundled scripts. No build step or install."
---

# Skill forging

Skill forging creates or rewrites an Agent Skill from a request, project context or upstream reference. It organizes Docs, SOP and Script into one skill, checks it against the specification, forms the landed artifact and records decisions. It delivers the forged skill directory. Installing, loading, running or using the forged skill is out of scope.

## Global definitions

- **Driver**: person directing the agent.
- **Adopter**: person using this skill, usually the driver.
- **Adoption environment**: adopter's project, decision-record mechanism, records, languages and tools.
- **Target audience**: people or agents using the forged skill.
- **Target audience's domain**: names, conventions and term meanings the skill serves.
- **Target audience's environment**: runtime, tools and constraints.
- **Declaration location**: adopter's or target's `AGENTS.md` or cited file. Adopter's supplies settings, target's custom values.
- **Delivery language**: forged skill body's language.
- **Review language**: review draft body's language.
- **Additional trigger language**: trigger keywords beyond delivery language in the landed description.
- **Decision-record mechanism**: project's existing decision form, such as note tree, ADR set or decision log.
- **Docs**: definitions, facts, constraints, schemas, templates and references.
- **SOP**: definition, steps, decision rules, completion judgments and failure recovery.
- **Script**: deterministic work code should do.
- **Three elements**: Docs, SOP and Script.
- **Upstream reference**: material or existing skill supplying the three elements.
- **Source constraint**: upstream requirement, prohibition or condition limiting the forged skill.
- **Disposition**: decision on a source constraint.
- **Forged skill**: skill this forging produces.
- **Forge directory**: parent of record, work draft and review draft.
- **Work draft**: delivery-language working copy.
- **Review draft**: review-language copy.
- **Landed artifact**: complete skill in the forged skill directory.
- **Home**: one place where a definition, rule or fact is written.
- **SSOT**: single source of truth.
- **Unambiguity**: each term, concept and decision point has one interpretation.
- **Record**: where decision bases, check results and delivery information go.
- **Structure checker**: target project's structure-checking tool.
- **Ruling**: when request or declaration cannot decide, the decision that best fits purpose, changes least and is reversible, recorded.
- **Hard red line**: condition that cannot continue without environment change or irreversible operation.
- **Specification**: Agent Skills specification.

## Global rules

### Interaction

Outside hard red lines and final review, forging does not ask, confirm, show drafts or diffs, or wait. Decisions are rulings in the record. Hard red lines are only these:

- Unauthorized overwrite or deletion of an existing skill.
- A required change to the adopter's or target audience's declaration location.
- A file, network or Git action the adoption environment forbids.
- The adoption environment lacks the runtime or tool a Script needs.
- The source purpose conflicts with a target-domain red line.

On a hard red line, stop with the blocker, rulings tried and reversible options, and wait for the driver. Other decisions are rulings in the record. Final review submits the review draft and waits for acceptance, changes or rejection.

### Languages

The work draft and landed artifact use the delivery language. The review draft uses the review language.

The work draft and landed description lead with the delivery language and add the additional trigger language as keywords. The review draft reverses this: review language first, delivery language as keywords. When the languages differ, swap them. When they match, the review draft uses only the review language.

The review draft transcribes the work draft into the review language. Keep concepts and names aligned, introduce no new concepts, and fit the review language and domain. Do not transcribe word for word.

Default values:

| Language | Default |
|---|---|
| Delivery language | English |
| Review language | The adopter's language. Without an adopter, the request's language |
| Additional trigger language | The review language. When it equals the delivery language, name another or omit it |

### Forge directory

Unless the adopter names another place, the forge directory is `.agents/dsh-spec-skill-forge/` at the project root. If it is not writable, use a ruling to choose another place and record it.

### Record

Record locations, in order:

1. The location the adopter's declaration or existing decision-record mechanism names.
2. `record/<name>.md` under the forge directory. If it exists, use a ruling to choose another place and record it.
3. If the forge directory is not writable, use a ruling to choose another place and record it.

Follow the existing decision-record mechanism. Include goal, mode, settings, dispositions, check results, review conclusion, unverified items, risks and rollback point. Without a mechanism, use these as headings.

Write each decision when settled. On conflict, record the conflict and resolution. Keep the record outside the forged skill directory. Use one record, with no second state store, round document or process log.

### Drafts

A work draft is a delivery-language working copy. It may change during the loop, is not written to the final path, and is not shown. It goes in `draft/<name>/` under the forge directory. The review draft goes in `review/<name>/`, in the review language. Structure checks and skill-specification assertions run only on the work draft. The review draft is its language projection and is not judged again.

A review draft exists only when all hold:

- The structure check passes.
- The skill-specification assertion is met.
- Review is needed.

Regenerate or update it when the work draft changes. Remove it when either holds:

- The structure check or skill-specification assertion fails.
- Review is not needed.

Do not update the review draft in an autonomous loop. `script/forge.mjs` performs the lifecycle: `draft`, `review` and `land`, with `--help` listing the interface. After landing, delete only `draft/<name>/` and `review/<name>/`; the shared directories stay.

### Resources and ownership

Resources a step needs go inside or next to that step. Resources the whole skill needs go to the matching home: definitions to global definitions, rules to global rules, outcome judgments to outcome assertions.

Reference only material that is optional, plays no part in a step's completion judgment, can load on demand and is cohesive enough to extract. Do not split other material: it would load anyway, and the split adds cost.

Script may be called wherever deterministic work needs it, not only in SOP steps.

### SSOT (single source of truth)

Write to the home. Do not define or explain the same content twice. The home follows the content:

| Content | Home |
|---|---|
| Skill rules and steps | The skill body |
| Record content | The record |
| Domain facts | The record keeps working material |
| Terms | The forged skill defines terms at their definition |
| Environment and runtime | `compatibility` or the script header |
| Default values | The skill |
| Custom values | The target audience's declaration location |

Each rule has one authoritative text. A second is a violation.

### Unambiguity

Each term has one meaning, each concept one name, and each decision point one interpretation. For an everyday word with several meanings, state its meaning at its definition and disambiguate once. For a preserved degree of freedom, state what the executor may decide and on what basis.

### Format and description

The following is the default format. The adopter's declaration may override it.

Use commas for parallel words. Write conditions, branches and flows as lists or tables, not one sentence. Prefer tables for structured content. The form inside a layer is unrestricted. Titles and layout follow the content. Do not use a template or copy an upstream format.

description is the trigger condition. State what the skill does and when to use it, in everyday words, with task keywords and the additional trigger-language keywords the language rules require.

## SOP steps

1. Intent recognition. Read `references/1-intent.md`.
2. Collect, analyze and dispose of the three elements. Read `references/2-analyze-and-dispose.md`.
3. Recomposition. Read `references/3-recomposition.md`.

Each step's content, completion judgment, check method and failure recovery live in its reference file. They move with the step.

## Outcome assertions

The forged skill must satisfy:

- Global rules.
- Every SOP step's assertions.
- [Agent Skills specification](https://agentskills.io/specification).
- [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices).

For mechanically decidable checks, use `script/verify-skill-spec.mjs` first. `--help` lists what it supports. For a check the script does not support, write a temporary script to judge it. Judge non-mechanical parts directly. Take check parameters from the specification and best practices.

Default token estimates:

| Language | Token estimate |
|---|---|
| Chinese | 0.6 tokens/character |
| English | 0.3 tokens/character |

When the body exceeds the budget, adjust in order:

1. Compress wording without losing precision.
2. Extract under "Resources and ownership": reference only material that is optional, loadable on demand and cohesive.
3. Extract every SOP step whole into `references/<step>.md`. The body keeps step order and each step's reference. Assertions and dependencies move with the step. When part of a step was extracted earlier, inline it back before extracting the whole step. Keep a split only when the extracted step itself is still over budget.
4. Rerun the structure checker after each change. When the outcome assertion changes the skill, run the skill's SOP again.

**Complete**: the forged skill satisfies global rules, every SOP step's assertions, the specification and best practices. Mechanically decidable checks pass through the formal or a temporary script, and non-mechanical judgments are direct.

**Check**: mechanical checks run through the formal or a temporary script, record output, and take parameters from the current specification. Non-mechanical judgments state a conclusion directly. No check is claimed that did not run.

**Failure**: compress, extract or route as above, then run the skill again. When still unresolved, use a ruling and record it.
