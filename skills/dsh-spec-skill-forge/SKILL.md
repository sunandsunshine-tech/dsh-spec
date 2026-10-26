---
name: dsh-spec-skill-forge
description: "Use when creating, writing, rewriting, forging, improving, adapting, or migrating an Agent Skill (SKILL.md) — its description, structure, triggers, or specification conformance need work — from an idea, reference material, or one or more existing skills. Produces the skill directory and a record of the decisions behind it. Not for merely installing, loading, or using an installed skill. 用于创建、编写、改写、锻造、优化、适配或迁移技能（Agent Skill / SKILL.md）。确定技能描述、触发时机、结构与规范符合性，产出技能目录与锻造记录。不用于安装、加载或使用已安装的技能。"
compatibility: "Requires Node.js 22.19+ or 24+ for the bundled scripts. No build step or install."
---

# Skill forging

## Guiding principle

Choose the anchoring form that fits how determinate the goal and task are — a natural-language contract, a strong type, a mechanical check script, and so on — and turn the expectations of AI into precise grounds for convergence. Positive boundaries provide centripetal force, negative boundaries provide repulsive force, and verification conditions decide whether to continue, adjust or stop. The anchoring functions need not be mechanically complete. For an ambiguous area that cannot be reliably defined and could affect safety, correctness or produce substantial irreversible consequences, set a safety fallback, state its trigger conditions, and establish a blocking or handover mechanism. For an open area that needs no prior definition, state the range in which divergence is allowed and the boundaries it must not cross. A scheme's effectiveness depends on the anchors' actual constraining power over the goal and on how well the anchoring form matches the nature of the task.

## Tools

- `scripts/forge.mjs` — creates the work directory, records translation pairs and publishes the work directory. Its `--help` lists the commands and options.
- `scripts/verify-skill-spec.mjs` — the mechanical gate. Its `--help` lists the limits and options; it reports one line per check.

Run `forge.mjs` from the project root; the gate takes the skill directory as its argument.

## Limits

Read [the Agent Skills index](https://agentskills.io/llms.txt) and the best-practices page it links before writing the forged skill; read the other pages it links on demand; write the forged skill to their requirements. The linked set is whatever the index links when it is read; do not keep a fixed list. Record each page read and the date it was read; when a page cannot be read, read [the offline fallback](references/offline-skill-authoring.md) in its place and record which page was unreadable. The fallback is a distilled snapshot, not a second authority; the online originals win whenever they can be read.

### Stop

Stop and wait on an unauthorized overwrite or deletion of an existing skill, on an operation the environment forbids or that cannot be reversed, and on the final review's acceptance. Publishing over a same-name skill requires that acceptance. Everything else is a ruling in the record: do not ask, confirm, show drafts or wait outside these. On a stop, report the blocker, the rulings tried and the reversible options.

### Intent

Settle from the request and the adopter's declaration (`AGENTS.md` or the file it cites): name, goal, boundary, deliverable, locations and languages; the target audience and its domain; and the runtime, tools and constraints of its environment.

Derive the trigger vocabulary and the excluded adjacent tasks from the source. Within the Stop boundaries the design is open: choose the structure, wording and scripts that fit the source.

Decide whether the forged skill needs a script. A missing runtime or tool is an error exit and a recorded ruling, not a stop.

### Source

Every requirement, prohibition, condition or fixed choice in the source is a source constraint. List each with its location. Deconstruct a paragraph that states a way of working and is followed by concrete instructions as one unit, extracting its steps, decision rules, roles and structure; concrete rules alone are not a paragraph. Merge duplicates by purpose while keeping every location.

Collect only design-changing material; stop when new material changes nothing. Without an upstream, the request's requirements are the source. A fact the request and the declaration cannot confirm becomes a ruling — the decision that best fits the purpose, changes least and is reversible, recorded — not an invention.

### Disposition

For each unit take the first applicable disposition:

| Disposition | When | Action |
|---|---|---|
| Keep | The original wording and sense hold | Carry it, adjusting only language and layout |
| Adapt | The referent exists and only its value or name differs | Instantiate the target value |
| Re-bind | The referent is gone but an equivalent means exists | Abstract to purpose, find the equivalent means, make it concrete and executable |
| Dissolve | The referent is gone and no equivalent means exists | Do not carry it; record the target fact, its check and what takes over |

One row per unit: source location, disposition, target location and basis (a target-domain fact, the skill's purpose, the upstream text or a ruling). A change states the part kept and the forcing fact; a dissolve states the check that takes over. Coverage: every constraint has one unit and one home, a deconstructed unit covers every constraint its paragraph states, and no disposition repeats or conflicts.

Turn an unclear example into a ruling. For example: a fixed path becomes Adapt; a tool the target lacks becomes Re-bind when an equivalent exists, otherwise Dissolve; a rule whose referent is gone becomes Dissolve with the check that replaces it.

### Script conversion

A requirement a command can decide exactly becomes a script. A requirement only judgment can decide stays prose with its authority named and one recorded conclusion; when neither exists, record the item unverified.

### Review

A review is needed when the review language differs from the delivery language, or when the adopter asks for one. A review copy is a translation pair: `<source-basename>.<lang>.md` beside its source `.md` and `<source-basename>.i18n.yaml` recording the source hash; for `SKILL.md` the pair is `SKILL.<lang>.md` and `SKILL.i18n.yaml`. `<lang>` is the review language. Write the translation, then run `review` to record the hash; `review --check` lists pairs whose source changed, whose translation is missing, or whose record is missing. Translate those again and rerun. Only `.md` files are paired; scripts and assets are not translated.

The work directory is the only authority; a translation keeps concepts and names aligned, introduces no new concept and does not transcribe word for word. Pairs live beside their sources in the work directory; `publish` removes them from the work directory, copies the work directory, and then removes the work directory. The final review submits the pairs and the record, and waits for the adopter to accept, change or reject the submission.

## Verification

Every requirement carries a verification anchor at the most precise level available; a requirement without one is prose. An anchor is precise when two executors reach the same decision from it; precision, not the number of anchors or the share carried by scripts, decides whether an anchor is kept.

| Anchor | Do | Evidence |
|---|---|---|
| Mechanical | A command decides it. | Command and output |
| Judged | A named guide or reference decides it; state one conclusion per item. | One conclusion per item |
| Unverified | No precise check exists for the item. | The item and the reason |

Run the gate as a separate read-only check; it reports one line per check and its `--help` lists the options. `publish` does not run the gate. When review is needed, run `review --check` so that an out-of-date pair fails.

**Complete**: every source constraint has one disposition row with its home; every requirement of the forged skill carries one anchor; the gate passed with the parameters used; every judged item has a conclusion; every unverified item carries its reason; the translation pairs are current when review was needed; the record carries the evidence, the pages read and the rulings.

**Failure**: fix and rerun; never claim a failed or unrun check as passed. An unresolved gap: record a ruling.

## Record

Write at the location the adopter's declaration or existing decision-record mechanism names; otherwise `record/<name>.md` under the forge directory the script uses. Follow an existing mechanism; without one, record goal, settings, the disposition table, the pages read, check results, review conclusion, unverified items, rulings, risks and rollback point. Write each decision when settled; on conflict record it and the resolution. Keep the record outside the forged skill directory. One record, no second state store or process log.

## Defaults

| Setting | Default |
|---|---|
| Delivery language | English |
| Review language | The adopter's language; without an adopter, the request's language |
| Additional trigger language | The review language, appended to the description's trigger keywords; when it equals the delivery language, name another or omit it |
