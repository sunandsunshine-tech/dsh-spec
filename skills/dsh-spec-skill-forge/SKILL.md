---
name: dsh-spec-skill-forge
description: "Use when creating, writing, rewriting, forging, improving, auditing, verifying, adapting, or migrating an Agent Skill (SKILL.md) — its description, structure, triggers, or specification conformance need work — from an idea, reference material, or one or more existing skills. Produces the skill directory and a record of the decisions behind it. Not for merely installing, loading, or using an installed skill. 用于创建、编写、改写、锻造、优化、核验、适配或迁移技能（Agent Skill / SKILL.md）。确定技能描述、触发时机、结构与规范符合性，产出技能目录与锻造记录。不用于安装、加载或使用已安装的技能。"
compatibility: "Requires Node.js 22.19+ or 24+ for the bundled scripts. No build step or install."
---

# Skill forging

Create or rewrite an Agent Skill from a request, project context or upstream reference: identify the intent, dispose of the source material, write the content under the Agent Skills guides, check it mechanically, land the artifact and record the decisions. Installing, loading, running or using the forged skill is out of scope.

## Definitions

- **Driver**: person driving the forging.
- **Adopter**: person using this skill.
- **Adoption environment**: adopter's project, decision-record mechanism, records, languages and tools.
- **Target audience**: people or agents using the forged skill, together with the names, conventions and term meanings of their domain.
- **Target audience's environment**: runtime, tools and constraints.
- **Declaration location**: the adopter's or target audience's `AGENTS.md` or cited file.
- **Delivery language**: forged skill body's language.
- **Review language**: review draft body's language.
- **Additional trigger language**: trigger keywords beyond the delivery language in the landed description.
- **Decision-record mechanism**: project's existing decision form, such as note tree, ADR set or decision log.
- **Docs**: the forged skill's definitions, facts, constraints, schemas, templates and references.
- **SOP**: the forged skill's steps, decision rules, completion judgments and failure recovery.
- **Script**: the deterministic work the forged skill's code does.
- **Forged skill**: skill this forging produces.
- **Source constraint**: upstream requirement, prohibition or condition limiting the forged skill.
- **Disposition**: decision on a source constraint.
- **Forge directory**: parent of record, work draft and review draft.
- **Work draft**: delivery-language working copy.
- **Review draft**: review-language copy.
- **Landed artifact**: complete skill in the forged skill directory.
- **SSOT**: single source of truth.
- **Unambiguity**: each term, concept and decision point has one interpretation.
- **Record**: where decision bases, check results and delivery information go.
- **Ruling**: when request or declaration cannot decide, the decision that best fits purpose, changes least and is reversible, recorded.
- **Hard red line**: condition that cannot continue without environment change or irreversible operation.

## Global rules

### Interaction

Outside hard red lines and final review, do not ask, confirm, show drafts or diffs, or wait; decisions are rulings in the record. Hard red lines:

- Unauthorized overwrite or deletion of an existing skill.
- A required change to the adopter's or target audience's declaration location.
- A file, network or Git action the adoption environment forbids.
- The adoption environment lacks the runtime or tool a Script needs.
- The source purpose conflicts with a target-domain red line.

On a hard red line, stop with the blocker, the rulings tried and reversible options, and wait for the driver. Final review submits the review draft and waits for acceptance, changes or rejection.

### Languages

The work draft and landed artifact use the delivery language; the review draft uses the review language. Descriptions lead with their own language and append the other's keywords: work draft and landing delivery first, review draft review first. When the languages match, the review draft uses only the review language.

The review draft transcribes the work draft, keeping concepts and names aligned, introducing no new concept, and not transcribing word for word.

Default values:

| Language | Default |
|---|---|
| Delivery language | English |
| Review language | The adopter's language; without an adopter, the request's language |
| Additional trigger language | The review language; when it equals the delivery language, name another or omit it |

### Forge directory

Unless the adopter names another place, use `.agents/dsh-spec-skill-forge/` at the project root. If it is not writable, choose another place by ruling and record it.

### Record

Record locations, in order:

1. The location the adopter's declaration or existing decision-record mechanism names.
2. `record/<name>.md` under the forge directory; if it exists, choose another place by ruling and record it.
3. If the forge directory is not writable, choose another place by ruling and record it.

Follow the existing decision-record mechanism and include goal, mode, settings, dispositions, check results, review conclusion, unverified items, risks and rollback point (use these as headings without a mechanism). Write each decision when settled; on conflict record it and the resolution. Keep the record outside the forged skill directory; one record, no second state store, round document or process log.

### Drafts

The work draft goes in `draft/<name>/`, is a delivery-language working copy, may change during the loop, is not written to the final path and is not shown. The review draft goes in `review/<name>/`, in the review language. Structure and content checks run only on the work draft; the review draft is its language projection and is not judged again.

A review draft exists only when the structure and content checks pass and review is needed; regenerate it when the work draft changes, and remove it when either check fails or review is not needed. Do not update it in an autonomous loop.

`script/forge.mjs` performs the lifecycle — `draft`, `review`, `land`; `--help` prints the interface. After landing, delete only `draft/<name>/` and `review/<name>/`; the shared directories stay.

### Format

The forged skill's body has no mandated format; concise stepwise guidance with examples beats exhaustive prose.

- Write conditions, branches and flows as lists or tables, not as one sentence.
- Prefer tables for structured content; use commas for parallel words.
- Titles and layout follow the content; do not impose a template or copy an upstream format.

### SSOT and unambiguity

A definition, rule or fact has one home: skill rules and steps in the body, record content in the record, domain facts in the record's working material, terms at their definition, environment in `compatibility` or the script header, defaults in the skill, custom values at the target's declaration location. Each rule has one authoritative text; a second is a violation.

Each term has one meaning, each concept one name, each decision point one interpretation. For an everyday word with several meanings, state its meaning at its definition and disambiguate once. For a preserved degree of freedom, state what the executor may decide and on what basis.

## SOP steps

### 1. Intent recognition

Determine from the request, adoption environment and declaration:

- Name, goal, boundary, deliverable, mode and locations: forge directory, landing and record.
- Languages and forge settings from the declaration.
- Target audience and domain: who uses the skill, the names, conventions and term meanings it serves, required tools, directories and constraints, and differences from upstream listed for disposition.
- Adoption environment and Script: whether deterministic work needs one; the runtime and tools the target audience's environment provides; whether the adoption environment can build and run it; and the test route when the development and target runtimes differ.

Modes: create distills from an idea or upstream; iterate reads the current skill and existing records, treats a missing record as create, and records that. The name is at most 64 characters of lowercase letters, digits and hyphens, has no leading, trailing or repeated hyphen, and matches the directory. Determine the problem, needs, expected effect and use, not whether the work is worth doing.

A missing Script runtime or tool is a hard red line: stop with the blocker, the rulings tried and the reversible options, and wait for the driver.

**Complete**: goal, boundary, deliverable, mode, locations, languages, audience, domain and the Script decision are clear.

**Check**: another executor can restate them from the request and record, and no unknown controls the main design.

**Failure**: fill reversible defaults or record a ruling; a missing runtime or tool stops at the hard red line.

### 2. Collect, analyze and dispose of the source material

The three elements are Docs, SOP and Script. Anchor first: the audience, domain and environment come from step 1; read the target's declaration location for custom values or use defaults; settle each term's referent, meaning and home, recording unclear ones as rulings.

Collect only design-changing material from the request, project context or upstream; stop when new material changes nothing; record uncollected leads and their expected value. Every "must", "must not" or "only" is a source constraint: list it with its location, merge duplicates by purpose while keeping every location, use the request's requirements without an upstream, and record unconfirmed facts as rulings rather than inventing them.

Deconstruct an upstream paragraph that states a way of working and is followed by concrete instructions as one unit, extracting steps, decision rules, roles and structure; concrete rules alone are not a paragraph, and without such paragraphs dispose of constraints one by one.

For each uncovered constraint, take the first applicable disposition:

| Disposition | When | Action |
|---|---|---|
| Keep | Original wording and sense hold | Carry it, adjusting only language and layout |
| Adapt | The referent exists and only its value differs (path, command, parameter, limit, name) | Instantiate the target value; defaults stay in the skill, custom values come from the declaration |
| Re-bind | No referent, or a different name | Abstract to purpose, find an equivalent means, make it concrete and executable |
| Dissolve | Nothing holds | Do not carry it; record the target fact, its check and what takes over the responsibility |

Record one row per unit: upstream location, disposition, location and basis (a target-domain fact, the skill's purpose, the upstream text or a ruling). A change states the part kept and the forcing fact; a dissolve states the check. Coverage: a deconstructed unit covers every constraint its paragraph states, each remaining unit covers one, and each constraint has exactly one unit. Honesty: do not assert installed skills; state responsibility and try order; introduce examples with "for example"; unclear examples become rulings.

**Complete**: the three elements are identified, every constraint has a disposition, location and basis, and no content lacks a home.

**Check**: later writing materials are located, coverage holds, and no disposition repeats or conflicts.

**Failure**: fill dispositions, narrow scope, record the gap or resolve the conflict, or record a ruling.

### 3. Write the skill content

Before writing, read [Agent Skills Best Practices](https://agentskills.io/skill-creation/best-practices) and all content it links, and follow them as written. Record each source read, its date and any source that cannot be read.

Only when those sources cannot be read, read [the offline fallback](references/offline-skill-authoring.md) and record which source was unreadable. The offline fallback is a distilled snapshot, not a second authority; the online originals win whenever they can be read. Global rules still govern process; the Agent Skills guides govern the forged skill's content.

Check the draft:

| Check | Do | Evidence |
|---|---|---|
| Mechanical | Run `node <skill-root>/script/verify-skill-spec.mjs <work-draft>`; for unsupported checks write and run a temporary script | Command and output; never claim an unrun check |
| Description triggering | Build the query set, run each query the guide's number of times, compare with its threshold, split train and validation, select by validation | Query set and results; unverified without an observing client |
| Scripts | Probe each script on the runtime step 1 settled: `--help`, non-interactive, structured stdout and diagnostic stderr, documented exit codes, dry-run where required | Command and output; a missing runtime stays the step 1 hard red line |
| Content | Judge the draft against the best-practices guide item by item | Each conclusion |

**Complete**: the work draft and landed artifact satisfy the guides' content obligations and the global rules; the checks above ran and are recorded; the review draft is the work draft's review-language projection; the record carries the checks, URLs and rulings. The artifact, drafts and record together complete the forging; no separate global assertion list exists.

**Check**: every row of the table above has a command output, a recorded result or an explicit unverified state.

**Failure**:

- A failed check: fix it and rerun, never claiming otherwise.
- An unreachable guide: use the offline fallback and record it.
- An unrunnable trigger evaluation: record it as unverified.
- An over-size body: record the ruling and its reason.
- An unresolved gap: record a ruling, or stop at a hard red line.
