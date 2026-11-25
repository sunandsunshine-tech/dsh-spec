---
name: dsh-spec-skill-forge
description: "Use when creating, rewriting, or migrating an Agent Skill from a request, source, or existing skill, or when its role, structure, triggers, or specification conformance needs work. Not for installing, loading, or merely using a skill, or editing prompts outside a skill. 用于根据请求、来源或现有技能创建、改写或迁移 Agent Skill，或在其角色、结构、触发边界或规范符合性需要处理时使用。不用于安装、加载或仅使用技能，也不用于编辑技能之外的提示词。"
license: "MIT; bundled dependency notices in THIRD_PARTY_NOTICES"
compatibility: "Requires Node.js 24.11+ on the 24 line or 26+ for the bundled scripts. No build step or install."
---

# Skill forging

Forge one Agent Skill from the request, a source, or an existing skill, and keep the decisions behind it as current facts.

## Guiding principles

**Context, not control.** A forged skill shapes the agent's context, not its path. Apply the project's prompt requirements (when available, consider using the `dsh-spec-agent-experience` skill) when deciding what context it carries; reserve control for authorization, irreversible actions, safety and required validation.

**Anchors make context judgeable.** Express that context in the form the task demands — a natural-language contract, a strong type, a checked script, a worked example. Positive and negative boundaries and verification conditions state what must stay true, what must not happen and how completion is decided; they are not a workflow. The anchoring need not be mechanically complete. For an ambiguous area that could affect safety, correctness or produce substantial irreversible consequences, state a safety fallback and its trigger. For an open area, state the allowed range and the boundaries it must not cross. The design is effective when its context and anchors constrain the goal while leaving the route open.

## Defaults

Apply this skill's use-site default only when neither the request nor existing project instructions choose one. Treat existing instructions as authoritative read-only input; do not ask for, create, modify, or copy instructions merely to select a default.

## Tools

Run these from the project root; `<skill-dir>` is the directory containing this `SKILL.md`.

- `node <skill-dir>/scripts/forge.mjs draft <name> [--from <existing-skill-dir>]` — creates the work directory for `<name>`, optionally seeded from an existing skill directory.
- `node <skill-dir>/scripts/forge.mjs pair <name> [--companion <suffix>]...` — reports the declared review drafts; it writes nothing.
- `node <skill-dir>/scripts/forge.mjs publish <name> --into <landing-dir> [--companion <suffix>]...` — copies the accepted work directory to `<landing-dir>` and removes the work directory.
- `node <skill-dir>/scripts/verify-skill-spec.mjs [<target-skill-dir>]` — the mechanical gate on a skill directory.

Each command's `--help` lists its options; the gate reports one line per check.

## Limits

Read [the Agent Skills index](https://agentskills.io/llms.txt) and the best-practices page it links before writing the forged skill; read the other pages it links on demand; write the forged skill to their requirements. The linked set is whatever the index links when it is read; do not keep a fixed list. Record each page read and the date it was read; when a page cannot be read, read [the offline fallback](references/offline-skill-authoring.md) in its place and record which page was unreadable. The fallback is a distilled snapshot, not a second authority; the online originals win whenever they can be read.

The Agent Skills best practices outrank this skill's guiding principles and the package's prose and prompt guidance. For the forged skill's prose, apply the project's prose requirements (when available, consider using the `dsh-spec-prose-standard` skill); for its instruction and context structure, apply the project's prompt requirements (when available, consider using the `dsh-spec-agent-experience` skill). When they conflict, the Agent Skills best practices decide; otherwise the more specific owner decides: the project prompt requirements own prompt and context structure, and this skill owns the forging process and artifact decisions.

### Stop

Stop and wait on an unauthorized overwrite or deletion of an existing skill, on an operation the environment forbids or that cannot be reversed, and on the final review's acceptance. Publishing over a same-name skill requires that acceptance. Everything else is a ruling in the record: do not ask, confirm, show drafts or wait outside these. On a stop, report the blocker, the rulings tried and the reversible options.

## Process

### Intent

Settle from the request and the adopter's standing instructions (`AGENTS.md` or the file it cites): name, goal, boundary, deliverable, locations and languages; the target audience and its domain; and the runtime, tools and constraints of its environment. Write the forged skill in English unless the adopter declares another delivery language.

Classify execution capabilities as required properties or optional mechanisms. A preferred optional capability — including a subagent, parallel execution, or an isolated context — must not be the only route to a required result. State a completion path that preserves the required quality when the capability is absent, or an explicit pre-action handoff naming the unfinished work and the missing capability.

Make the description a selection projection of the source: the skill's actual role, positive trigger moments and objects, and important exclusions. For each source task family, preserve a current capability or record why it is excluded; advertise only behavior the loaded skill supplies. Keep execution detail in the body or reference. No fixed sentence formula is required, and the character limit is a constraint, not a quota. Within the Stop boundaries the design is open: choose the structure, wording and scripts that fit the source.

Decide whether the forged skill needs a script. A missing runtime or tool is an error exit and a recorded ruling, not a stop.

### Source

Every requirement, prohibition, condition or fixed choice in the source is a source constraint. List each with its location. Deconstruct a paragraph that states a way of working and is followed by concrete instructions as one unit, extracting its steps, decision rules, roles and structure; concrete rules alone are not a paragraph. Merge duplicates by purpose while keeping every location.

Collect only design-changing material; stop when new material changes nothing. Without an upstream, the request's requirements are the source. A fact the request and the standing instructions cannot confirm becomes a ruling — the decision that best fits the purpose, changes least and is reversible, recorded — not an invention.

Only the request, the current contract and the adopter's standing instructions decide what the new design must satisfy. An existing decision record explains an earlier choice; it supplies a requirement only where one of them keeps that requirement in force.

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

### Review

A review starts when the adopter declares review-draft suffixes with repeated `--companion <suffix>`; a review draft is a regular file beside its `.md` source whose name ends with a declared suffix. With no declaration there are no declared review drafts. Declaring a suffix does not require every source to carry a draft: a source may carry no draft, one draft or several, and overlapping suffixes resolve to the longest declaration. A declared suffix cannot be `.md`; it may name a translation or the project's consistency record. A consistency record associated with a review draft is declared as a companion (when available, consider using the `dsh-spec-translate-docs` skill). With no declaration, `pair` lists possible review drafts: a regular file whose shortest dotted suffix resolves to an existing `.md` source. A file is a review draft only when its suffix is declared; undeclared candidates are reported and `publish` copies them as ordinary content.

The delivery side's description leads with the delivery language and appends the additional trigger language. A review draft reverses that order: its own language first, the delivery language as the additional trigger language. When the languages match, the review draft uses one language. The additional trigger language defaults to the adopter's review language; when it equals the delivery language, omit it or name another.

Write a draft, then run `pair` with the same declarations. It reports each draft/source pair and fails on a draft without a source; it writes nothing. The project's translation consistency gate owns whether the translation is current; the forge neither writes nor checks a consistency record. Pass the same `--companion` set to `publish`: it refuses an orphan draft, removes the declared drafts from the work directory, copies the work directory, and then removes the work directory. Before `publish`, remove any review-draft-only content from the work-draft sources. A file whose suffix is not declared is copied as ordinary content. The work directory is the only authority; a draft keeps concepts and names aligned and introduces no new concept. The final review submits the drafts and waits for the adopter to accept, change or reject the submission.

## Verification

Every requirement carries a verification anchor at the most precise level available; a requirement without one is prose. An anchor is precise when two executors reach the same decision from it; precision, not the number of anchors or the share carried by scripts, decides whether an anchor is kept.

| Anchor | Do | Evidence |
|---|---|---|
| Mechanical | A command decides it. | Command and output |
| Judged | A named guide or reference decides it; state one conclusion per item. | One conclusion per item |
| Unverified | No precise check exists for the item. | The item and the reason |

Run the gate as a separate read-only check; `publish` does not run it. When review is needed, run `pair` so that an orphan draft fails and the project's translation consistency gate can check the translation.

A natural-language requirement central to the forged skill carries a development eval scenario when realistic prompts can falsify it and no deterministic check decides it. Capability-dependent behavior covers both capability profiles. Model evals run when the owned behavior changes and remain outside the delivered skill. Description changes carry recorded positive and near-miss trigger evaluations; when role, activation, or exclusions change, co-evaluate the description, body boundary, and trigger set. Semantic quality is judged, not regex-matched.

**Complete**: every source constraint has one disposition row with its home; every requirement of the forged skill carries one anchor; for every capability-dependent requirement, the record states a conclusion for the capability-present and capability-absent profiles; absent-capability evidence is either a completed observable result with its owning validation or an explicit handoff; the gate passed with the parameters used; every judged item has a conclusion; every unverified item carries its reason; the declared review drafts are translated and the project's translation consistency gate has been run when review was needed; a forged skill that declares a default applies it only when neither the request nor existing project instructions choose one, while treating instructions as read-only input and never asking for, creating, modifying, or copying them merely to select a default; the record states the evidence, the pages read and their dates, and the rulings as current facts; no round or review narrative remains.

**Failure**: fix and rerun; never claim a failed or unrun check as passed. An unresolved gap: record a ruling.

## Record

Write at the location named by the adopter's standing instructions or its existing decision-record mechanism (when available, use the `dsh-spec-agent-notes` skill); otherwise `record/<name>.md` under the forge directory the script uses. Write the record in English. Its translation follows the adopter's standing instructions; without them, translate it into the adopter's language. When the adopter's language is English, no separate translation is produced. The adopter owns the translation mechanism and its consistency record.

The record states the current design, not the forging's history. Without an existing mechanism, it states the goal; the source revision read (repository, revision and read date, without working-copy paths); the settings in effect; the disposition table; each ruling; the current requirement anchors and verification evidence; the pages read and their dates; the unverified items with their reasons; the risks and the rollback point; and the publish authorization state.

Update the record in the same change that alters a fact it states. On every round, rewrite the affected facts in place and delete the facts that no longer hold; never append a round, a review exchange, a draft ordinal, a dated revision narrative, or a before-and-after comparison. A decision that replaces an earlier one is written as the current decision; the superseded fact is removed, not kept as history. Version control and the conversation own the process; the record owns what is true now. Keep the record outside the forged skill directory: one record, no second state store.
