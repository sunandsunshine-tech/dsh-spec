---
name: dsh-spec-skill-forge
description: "Use when creating, writing, rewriting, forging, improving, auditing, verifying, adapting, or migrating an Agent Skill (SKILL.md) — its description, structure, triggers, or specification conformance need work — from an idea, reference material, or one or more existing skills. Produces the skill directory and a record of the decisions behind it. Not for merely installing, loading, or using an installed skill. 用于创建、编写、改写、锻造、优化、核验、适配或迁移技能（Agent Skill / SKILL.md）。确定技能描述、触发时机、结构与规范符合性，产出技能目录与锻造记录。不用于安装、加载或使用已安装的技能。"
compatibility: "Requires Node.js 22.19+ or 24+ for the bundled scripts. No build step or install."
---

# Skill forging

## Guiding principle

Turn every expectation of AI into precise, decidable anchors: state what is wanted (the positive boundary), what is excluded (the negative boundary), and how it is verified (the decision condition). A scheme's effectiveness depends on its anchors' precision, whether they are natural-language or mechanically executed.

## Tools

- `scripts/forge.mjs` — creates the work draft, projects the review draft and lands the work draft. Its `--help` lists the commands and options.
- `scripts/verify-skill-spec.mjs` — the mechanical gate. Its `--help` lists the limits and options; it reports one line per check.

Run both from this skill's root.

## Limits

Write the forged skill under the Agent Skills best practices and the content it links. Record each page read and the date it was read; when a page cannot be read, read [the offline fallback](references/offline-skill-authoring.md) in its place and record which page was unreadable. The fallback is a distilled snapshot, not a second authority; the online originals win whenever they can be read.


### Stop

Stop and wait only on an unauthorized overwrite or deletion of an existing skill, and on an operation the environment forbids or that cannot be reversed. Everything else is a ruling in the record: do not ask, confirm, show drafts or wait for anything else. On a stop, report the blocker, the rulings tried and the reversible options.

### Intent

Settle from the request and the declaration: name, goal, boundary, deliverable, mode, locations and languages; the target audience and its domain; and the runtime, tools and constraints of its environment. In create mode, distill from an idea or upstream material and treat the request's requirements as the source. In iterate mode, read the current skill and existing record; a missing record is create, recorded.

Derive the trigger vocabulary and the excluded adjacent tasks from the source.

Decide whether the forged skill needs a script: which deterministic work exists, which runtime and tools the target environment provides, whether the adoption environment can build and run it, and the test route when the development and target runtimes differ. A missing runtime or tool is an error exit and a recorded ruling, not a stop.

### Source

Every requirement, prohibition, condition or fixed choice in the source is a source constraint. List each with its location. Deconstruct a paragraph that states a way of working and is followed by concrete instructions as one unit, extracting its steps, decision rules, roles and structure; concrete rules alone are not a paragraph. Merge duplicates by purpose while keeping every location.

Collect only design-changing material; stop when new material changes nothing. Without an upstream, the request's requirements are the source. A fact the request and the declaration cannot confirm becomes a ruling — the decision that best fits the purpose, changes least and is reversible, recorded — not an invention.

### Disposition

For each unit take the first applicable disposition:

| Disposition | When | Action |
|---|---|---|
| Keep | The original wording and sense hold | Carry it, adjusting only language and layout |
| Adapt | The referent exists and only its value differs (path, command, parameter, limit, name) | Instantiate the target value |
| Re-bind | No referent, or a different name | Abstract to purpose, find an equivalent means, make it concrete and executable |
| Dissolve | Nothing holds | Do not carry it; record the target fact, its check and what takes over |

One row per unit: source location, disposition, target location and basis (a target-domain fact, the skill's purpose, the upstream text or a ruling). A change states the part kept and the forcing fact; a dissolve states the check that takes over. Coverage: every constraint has one unit and one home, a deconstructed unit covers every constraint its paragraph states, and no disposition repeats or conflicts.

Do not assert that a skill is installed; turn an unclear example into a ruling. For example: a fixed path becomes Adapt; a tool the target lacks becomes Re-bind; a rule whose referent is gone becomes Dissolve with the check that replaces it.

### Script conversion

A requirement a command can decide exactly becomes a script with parameters and safe defaults. A requirement only judgment can decide stays prose with its authority named and one recorded conclusion; when neither exists, record the item unverified.

### Review

A review draft is needed when the review language differs from the delivery language, or when the adopter asks for a read-only copy. The work draft is the only authority; the review draft is its projection, keeping concepts and names aligned, introducing no new concept and not transcribing word for word.

The projection's provenance lives in its frontmatter metadata and belongs to the script: edit the body, never the stamp. When the work draft changes, the projection is marked stale and the existing translation is kept until the file is translated again and accepted. Landing refuses a missing, stale or mismatched projection unless the record carries the exemption's reason and recheck condition. When the two languages match, the projection is a straight copy or is absent; landing does not require one.

The final review submits the review draft and waits for the adopter to accept, change or reject it.

## Verification

Every requirement carries a verification anchor at the most precise level available; a requirement without one is prose. An anchor is precise when two executors reach the same decision from it; precision, not the number of anchors or the share carried by scripts, decides whether an anchor is kept.

| Anchor | Do | Evidence |
|---|---|---|
| Mechanical | A command decides it. | Command and output |
| Judged | A named guide or reference decides it; state one conclusion per item. | One conclusion per item |
| Unverified | No precise check exists for the item. | The item and the reason |

Run the gate so that a missing file or a broken link fails; use its strict budget so that an over-size body fails too (its `--help` names that option).

**Complete**: every source constraint has one disposition row with its home; every requirement of the forged skill carries one anchor; the gate passed with the parameters used; every judged item has a conclusion; every unverified item carries its reason; the review projection is accepted when review was needed; the record carries the evidence, the pages read and the rulings.

**Failure**: fix and rerun; never claim a failed or unrun check as passed. An over-size body: route content to `references/` and rerun. An unresolved gap: record a ruling.

## Record

Write at the location the adopter's declaration or existing decision-record mechanism names; otherwise `record/<name>.md` under the forge directory the script uses. Follow an existing mechanism; without one, record goal, mode, settings, the disposition table, check results, review conclusion, unverified items, risks and rollback point. Write each decision when settled; on conflict record it and the resolution. Keep the record outside the forged skill directory. One record, no second state store or process log.

## Defaults

| Setting | Default |
|---|---|
| Delivery language | English |
| Review language | The adopter's language; without an adopter, the request's language |
| Additional trigger language | The review language; when it equals the delivery language, name another or omit it |
