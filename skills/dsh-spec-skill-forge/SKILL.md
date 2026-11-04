---
name: dsh-spec-skill-forge
description: Use when creating, writing, rewriting, forging, auditing, or verifying an Agent Skill (SKILL.md) — its description, structure, triggers, or specification conformance need work — from an idea, reference material, or one or more existing skills. Produces the skill directory and a record of the decisions behind it. Not for merely installing, loading, or using an installed skill. 用于创建、编写、改写、锻造、优化或核验技能（Agent Skill / SKILL.md）：确定技能描述、触发时机、结构与规范符合性，产出技能目录与锻造记录；不用于安装、加载或使用已安装的技能。
compatibility: Requires Node.js 22.19+ or 24+ for scripts/verify-skill-spec.ts; no build step or install.
---

# Skill Forge

Forge an Agent Skill and record why each part of it exists.

A skill is a natural-language function:

- a description that says when it runs and on what;
- parameters with defaults;
- a body of steps, each ending in an assertion;
- citations of the files and facts it needs.

## Terms

Each term is defined once. Later text cites its exact designator.

- **Driver** — the human who directs the agent.
- **Adopter** — the person who uses this skill to forge a skill; usually the driver.
- **Adopter's environment** — where the forging happens: the adopter's project, decision mechanism, draft and record, and tooling.
- **Target audience** — the people or agents who will use the forged skill, and their project.
- **Target audience's domain** — the field the forged skill serves and how it speaks — names and conventions; it decides term meanings and which disposition rung a rewrite lands on.
- **Target audience's environment** — the runtime and tools the forged skill needs to do its work, whether from a script or from its instructions.
- **Reference upstream** — the material or existing skills a forging draws its constraints from; cited as "the upstream".
- **Forge skill** — this skill.
- **Forged skill** — the product of this skill; when the forge is applied to itself, the same skill.
- **Adopter's declared place** — the adopter's `AGENTS.md` or declared file: names the decision mechanism and the draft's parent.
- **Target audience's declared place** — the target audience's `AGENTS.md` or declared file: supplies the instance values customizing the defaults.
- **Record** — where the forging decisions and their bases are written: the adopter's decision mechanism (notes tree, ADR set, decision log) or the fallback file when there is none. "The record" locates it.
- **Target-audience fact** — a checkable statement about the target audience's domain, environment, or declared place.
- **Ruling** — a decision where the criteria leave a choice: the driver's, or the one made when no driver answers; "Escalation and rulings" gives its rules.
- **Source constraint** — a statement of the upstream that binds the target audience; step 1 enumerates them.
- **Disposition** — the decision taken for a source constraint; `references/dispositions.md` gives the forms.
- **Home** — one place where a definition, rule, or fact is written; every other mention cites it.
- **Gate** — the mechanical checker this skill ships: `scripts/verify-skill-spec.ts`.
- **Landed artifact** — the draft or rendition when one is made: the version verified, accepted and placed at the forged skill's path.
- **Specification** — the Agent Skills specification; sources in `references/spec-checks.md`.

**With no driver**, every question to the driver or adopter is answered by a ruling: the option that changes least and can be undone. Record it, preferring to stop over inventing; a forging that would replace an existing skill stops and reports.

## Requirements on the forging process

The record, the draft and the landing, the languages, escalation and rulings, and the deliverable boundary are in `references/process-rules.md`; read it before step 1.

## Requirements on the forged skill

Read `references/forged-skill-rules.md` before step 3 and when verifying.

## 1. Converge on intent and mode

1. **Set the process settings.** Settle the skill's name, the draft and landing locations ("The draft and the landing"), the three languages ("Languages"), and the record's location ("The record").
   - The name is at most 64 characters of lowercase letters, digits and single hyphens, matches the forged skill's directory, and has no hyphen at either edge.
   - Ask the driver; when no answer comes the defaults apply, and with no driver the ruling does.
2. **Purpose and idea.** Settle:
   - the concrete problem;
   - the requirements;
   - the wanted effect;
   - the expected deliverable and use.
   The driver may raise them; an agent may raise the idea and report it to the driver to decide. With no driver, forge only when the task states the intent; otherwise stop and report.
3. **Mode.**
   - **Creation** — new from an idea, or distilled from the upstream. The upstream may be anything: a skill, documents, instruction files, scripts.
   - **Iteration** — an existing skill. Read its current `SKILL.md` and its earlier decision records, found where that environment keeps decisions, as "The record" finds them. Where none can be located, treat it as new and record that.
4. **Enumerate the source constraints.** List them with their locations. A sentence is a source constraint when it says what must, must not, or may only be done — whatever words it uses.
   - Merge duplicates into one entry carrying every location; merge by purpose, never by wording.
   - With no upstream, list the requirements the driver stated instead.

**Assertion.**

- Complete when: the record carries the problem, the expected deliverable, the name, the mode, the languages, both locations, and the constraints with their locations.
- Measure: every upstream constraint has a location; every driver-stated requirement is listed; every duplicate is merged; every conflict is resolved or escalated.
- If it fails: ask the driver and keep recording. With no driver, settle a ruling and continue, or stop and report. Do not draft.

## 2. Anchor the audience, its domain and environment, its declared place, and the terms

1. **Anchor the target audience and its domain.** State who they are and the field the forged skill serves; record how it speaks — names and conventions. The domain decides term meanings and which disposition rung a rewrite lands on.
   - List as facts what the domain requires — tools, directories, conventions — and what it lacks.
   - Learn them from the upstream's domain, the audience's repositories and documents, or the driver; a fact a disposition needs that none establishes is escalated.
   - When the upstream was written for a different domain, or an older state of this one, list every difference; each difference is what a disposition decides against.
2. **Anchor the target audience's environment.** Name the runtime and tools the forged skill needs — those a bundled script runs on, those its instructions invoke, or those the audience must have. They go into `compatibility` and, when there is a script, its header; the record keeps the facts.
3. **Anchor the target audience's declared place.** Record whether it has one; when it exists, it supplies the instance values that customize the defaults; when it does not, the forged skill's defaults stand.
4. **Anchor the terms.** For every term the text will use, settle its designator, its domain meaning, and its home.
   - The anchor list is working material in the record. A term of the forged skill is defined there; a term the domain owns keeps the domain's meaning and is defined where the skill needs it.
   - A term that cannot be disambiguated is escalated, not guessed.
5. **Collect the three elements.** Collect until three things can be analysed:
   - Docs: concepts, schemas, templates;
   - SOP: how the work flows — pipelines, branches, decision rules;
   - Script: the deterministic work only code should do.
6. **Stop collecting.** Stop once the three elements are covered; record the remaining leads and their expected value, and let the driver decide whether to continue.

**Assertion.**

- Complete when: the record states the audience, its domain, its environment when it depends on a runtime or a tool, whether it has a declared place, the differences from the upstream's domain, and every term's home and meaning; the Docs, SOP and Script inputs and gaps are listed, and the leads recorded.
- Measure: no unknown remains that a disposition or an assertion would depend on.
- If it fails: collect more, or escalate what cannot be confirmed and record it. With no driver, settle a ruling and continue, or stop and report. Do not draft.

## 3. Draft and dispose

Write the draft at the draft location. Before the two disposition passes, read `references/dispositions.md` and fill the constraint table as they run.

**First pass, deconstruction.** Look for one or more passages of the upstream: a part smaller than the whole upstream that states a way of working that several concrete instructions follow. Extract each passage's steps, decision rules, roles and structure; one unit per passage. A list of concrete rules is not a passage; when the upstream has none, every constraint goes through the second pass.

**Second pass, one constraint at a time.** Apply the ladder to each source constraint not covered by a deconstruction unit. The honesty rules in `references/dispositions.md` apply during the passes and the assembly.

**Assembly.** Rewrite the upstream for the target audience, replacing what carries no meaning for them; a gap found while drafting is collected narrowly and recorded. The body carries the core intent and scope, shared concerns, and the steps. Each step ends with an assertion:
- what proves the step complete;
- the measure it must meet;
- how to recover if it fails.
No trailing global checklist. Write the description as `references/forged-skill-rules.md` requires.

**Convergence.** After each change, show the driver the file and the diff. Keep the loop cheap: the gate and judgement checks (step 5) run when the driver states the design is settled, not after every exchange. A settled design is agreed, not accepted; with no driver, a ruling replaces that statement. A real run, an independent read and a full regression belong to the adopting project's release process.

**Assertion.**

- Complete when: every unit has a disposition and a basis, and the coverage rule in `references/dispositions.md` holds. The `SKILL.md` has frontmatter `name` and `description`, and every step ends with an assertion. There is no trailing checklist. The record has the constraint table.
- Measure: each row names a constraint or passage, a disposition, a location and a basis. Each assertion has all three parts.
- If it fails: resolve the failing entry with the driver. With no driver, settle a ruling and continue, or stop and report. Escalate an entry that cannot be decided.

## 4. Bundle the script when there is one

Skip this step when the forged skill bundles no script. When it needs deterministic work that only code should do:

1. **Name the script's runtime.** From the target audience's environment, name the runtime the script must run on; write it in the script header and `compatibility`.
2. **Probe the development tooling.** Probe the adopter's environment for tooling to develop and test the script — a runtime to reuse, or the stack — and ask the driver to settle it.
3. **Record the gap.** When the development runtime and the script's runtime differ, record how the script will be tested on the script's runtime; if it cannot be, the judgement check records "unverified".
4. The script declares its dependencies, inputs, outputs and exit codes in its header, and runs on the script's runtime with no install step.
5. Read the "Scripts, when bundled" check in `references/spec-checks.md` when writing the script.
6. Test the script on its runtime when available; record the test and its output.
7. Bundle the script under `scripts/`, and record the stack, the dependencies, and what to do when the script's runtime is absent.
8. Where the script writes files, uses the network, or runs Git, confirm with the driver which of these are allowed.

**Assertion.**

- Complete when: the runtime is named in the header and `compatibility`; the script is self-contained and declares its dependencies, inputs, outputs and exit codes; its test is recorded, or "unverified" when the runtime is unavailable; allowed writes, network access and Git are confirmed where they occur; the record holds the stack, the dependencies, and what to do when the runtime is absent.
- Measure: every declared item appears in the script's header. The test output is in the record.
- If it fails: do not ship the script. Record the blocker and escalate. With no driver, settle the ruling or stop and report.

## 5. Verify and route

This step runs on a settled design and verifies the forged skill against the specification; it does not re-judge the earlier steps, whose conditions belong to their own assertions.

1. **Gate the draft.** From this skill's directory, run `node scripts/verify-skill-spec.ts <draft-directory>`, the absolute path of `<draft's parent>/<name>/`. Never run it without a directory: it would then check this skill itself and pass.
2. **Make the rendition.** When "Languages" says one is due, write it at the rendition location ("The draft and the landing").
3. **Run the judgement checks on the landed artifact.** Read `references/spec-checks.md` and run the judgement checks it lists on the landed artifact — its description and any bundled script. Record each result.
   - When a check cannot run — no agent harness in the target audience's environment, no runtime — record "unverified" and why.
   - Never record a pass that did not happen.
4. **Gate the landed artifact and route its budget.** Run the gate with `--strict-budget` on the draft directory, or on the rendition at `<draft's parent>/rendition/<name>/` when one was made; it must exit 0. When the file is over the default:
   - move long templates, schemas and lookup tables to `references/*.md`, with every citation saying when to read it;
   - move static resources such as templates and images to `assets/`;
   - move the steps themselves to `references/<step>.md` only when the file is still over and nothing of the first two kinds is left — when deleting one more sentence would lose a constraint or an assertion;
   - run the gate again after each move.
5. **Record, accept, and land.** Record both gate outputs and the driver's acceptance of the landed artifact. Then place it at `<forged skill's parent>/<name>/`, moving it when it is elsewhere. With no driver, record the ruling that stands in its place.

**Assertion.**

- Complete when: the gate exits 0 with `--strict-budget` on the landed artifact. Every judgement check has a recorded result, or a recorded "unverified" with its reason. The record holds the command output and the acceptance, and the landed artifact is at the forged skill's path.
- Measure: no check is claimed that was not run. The record names the landed artifact.
- If it fails: fix the draft. When the fix cannot be derived from the upstream, escalate instead of inventing. With no driver, settle the ruling or stop and report.
