# Agent Note: Forging dsh-spec-workflow from an applied four-artifact analysis

Status: rejected — abstract meta-method prompts do not converge stably; concrete prompts win until the method can be formally checked

English | [中文](2026-10-22-forging-dsh-spec-workflow.zh.md)

## Problem

The repository ships an agent-team workflow and a skill forge, but no method for deriving a workflow from a goal, a budget and an environment, then revising it as real results arrive. The design conversation found the control-loop answer, and the first two forgings drifted: the first spread it into a framework-shaped skill, and the second applied an earlier, shallower analysis method. The driver's third review required the analysis skill to cover every structurable object, to fix its formatting, and to reach the forge's precision before the workflow skill was reforged from it. This record covers the final forging, whose analysis was produced with the completed `dsh-spec-analysis` in the four-artifact product format.

## Proposal

Forge `dsh-spec-workflow` as a single-file Agent Skill with no script. Its layers are global definitions, a workflow-elements model, fifteen global rules, a mechanism-selection table, failure patterns, six SOP steps and outcome assertions. Each step has a completion judgment, a check method and failure recovery.

The method's content: a workflow is a derived, executable arrangement of work units that moves the current state toward a declared goal under binding constraints and a budget, together with the verifications and decision rules that let the arrangement be judged and revised on evidence. The skill fixes the loop — read the situation, compose, execute, assert, re-decide, close — and leaves the arrangement to the situation. Three assertions keep workflow feasibility, run progress and goal completion apart; two decision scopes keep local fixes from turning into churn and sunk cost from keeping a broken plan; execution integrity keeps state, action and result trustworthy; mechanisms are chosen only when they earn their cost. The skill names `dsh-spec-analysis` only in step 1, for an unclear goal.

The forging follows the adopter's defaults: work draft in the delivery language (English) with a Chinese trigger in the description, review draft in the adopter's language (Chinese) with an English trigger, record as this Agent Note, landing target `skills/dsh-spec-workflow/`. The skill ships no script: no universal state schema exists, and a fixed ledger would be the framework the design rejects.

The source is the shared conversation "Agent编排本质与组合"; this record cites it and the forged skill does not. Its relevant content is inlined here, because the record does not depend on a link:

- Orchestration is a closed control loop over task execution, not a plan; the loop reads the situation, acts, verifies progress, and re-decides.
- A workflow is a derived arrangement of work units, not a fixed procedure. What can be fixed is the method — understand, deconstruct, dispose, recompose, assert, loop — while the arrangement follows the situation.
- Assertions separate three layers: workflow feasibility before execution, run progress after execution, and goal completion at the close. Each assertion result selects continue, adjust, re-orchestrate, ask, or stop, with a named scope.
- Mechanisms (agent team, Ralph loop, DAG, dedicated agents, context isolation, single writer) are optional means chosen only when they earn their cost; they are not the definition of the workflow.
- Bounded investigation, a single authoritative source for facts, and per-action completion criteria, check method and failure handling carry over. The forge's specific rigidities — fixed SOP stages, one central record, a no-ask rule — do not.
- The conversation's later pass names this transferable meta-method explicitly and warns that copying the forge's domain procedure would be the wrong move.

### Forging settings

| Setting | Value |
|---|---|
| Mode | create; distilled from an upstream conversation and an applied four-artifact analysis, revised three times after review corrections |
| Upstream | the shared conversation; the four-artifact product below; the completed `dsh-spec-analysis` |
| Draft parent / landing parent | `.agents/dsh-spec-skill-forge/draft/` / `skills/` |
| Languages | delivery English, review Chinese (the adopter's language), additional trigger Chinese |
| Description | trigger condition in English plus Chinese trigger keywords; no "explains" or "completed" |
| Record | this note |
| Acceptance | pending; the review draft is submitted to the driver before landing |
| Rollback | before acceptance, delete this note triplet; after landing, delete `skills/dsh-spec-workflow/` and the note triplet together |

### Workflow deconstruction

This is the four-artifact product the driver required before the recomposition. It was produced with the completed `dsh-spec-analysis`.

**1. Object definition.** Kind: a work arrangement. Essence: the purpose is to move the current state toward the goal under constraints; the mechanism is a closed control loop that represents the situation, chooses an action, acts, verifies and re-decides. Definition: a workflow is a derived, executable arrangement of work units that moves the current state toward a declared goal under binding constraints and a budget, together with the verifications and decision rules that let the arrangement be judged and revised on evidence. Positive case: a three-unit plan, each unit with an observable verification, a run assertion and a decision rule that revises the plan when a verification fails. Negative cases: a goal statement has no arrangement; an activity list without verification cannot be judged; a procedure mandated verbatim by the request is not derived. Boundary case: a single action with success evidence is a degenerate workflow that runs at the lowest depth.

**2. Elements and membership conditions.**

| Element | Definition | Membership condition | Clauses supported |
|---|---|---|---|
| Goal and success evidence | The target condition and the observable result that marks fulfilment | States a target condition and an observable result | Declared goal |
| Situation model | Binding and tradeable constraints, budget, capabilities and limits, current state and decision-changing unknowns | Records each of these, with unknowns marked by impact and decidability | Constraints, budget, state |
| Work units | The actions that change the state | Each names an action, an expected result and a verification | Executable arrangement |
| Dependencies | The order, data, authority or resource relations between units | Each names its kind and the units it connects | The arrangement |
| Verifications | The observable outputs that judge a unit and the goal | Each names the output, the unit result it judges and the goal evidence it contributes to | Judged progress |
| Assertions | The checks of the arrangement, the run and the goal | Three checks exist: before execution, after execution, at the close | Judged and revised |
| Decision rules | The mapping from an assertion result to the next action and scope | Each result maps to continue, adjust, re-orchestrate, ask or stop, with a scope | Revision on evidence |
| Authoritative state and evidence | The facts the next decision needs and the real outputs | Each fact carries a source and version; outputs are retained | State and revision |
| Governance constraints | Write ownership, identity and lifecycle, task-context scope, permissions and risk limits | Each applies to a named unit or resource | Binding constraints |
| Budget | The cost, time and quality limits and the optimisation among them | States the limits, the optimisation and the spend | Budget |
| Close and escalation | The single terminal status with the evidence it requires | Names one status and the evidence that supports it | Judged completion |

Assertions: coverage (every clause has an element), exactness (no element is surplus), partition (each part belongs to one element) and equivalence (the elements compose the definition).

**3. Relations, rules and recomposition method.**

| Relation | Judgment condition | Composition effect |
|---|---|---|
| Goal to situation | The situation model cites the goal and the success evidence | Bounds the situation |
| Situation to units | Every unit is allowed by the recorded capabilities, permissions, constraints and budget | Bounds execution |
| Units to dependencies | The dependency graph is valid and every prerequisite is placed | Orders the units |
| Units to verifications | Every unit has exactly one observable verification | Makes progress judgeable |
| Verifications to assertions | The assertions aggregate the verifications and the goal evidence | Produces a run status |
| Assertions to decision rules | Every assertion result maps to one action and one scope | Selects the next action |
| Decision rules to state | Decisions, evidence and sources are recorded | Keeps the state authoritative |
| Governance to units | Write ownership, context scope, identity and permissions constrain execution | Keeps action controlled |
| Budget to situation, units and decisions | The budget bounds investigation, execution and continuation | Keeps spend within limits |
| Assertions and decisions to close | Exactly one close status follows with its evidence | Ends the work honestly |

Rules: no unit without a goal trace or a verification; no execution while the workflow assertion has a blocking unknown; no close without success evidence; mechanisms are optional; one writer per shared mutable resource; task context at the minimum sufficient set; environment limits are stated, not assumed. Recomposition method: frame the goal, success evidence and situation (elements 1, 2, 8); derive units, dependencies and verifications (3, 4, 5); choose the simplest structure and mechanisms under governance and budget (9, 10); run the workflow assertion (6); execute and update the state (8); run the run assertion (6); re-decide and record (6, 7, 8); close (11). Each step has inputs, a condition and an output. Sufficiency: a test instance built by this order passes the assertions, and no unstated relation is needed.

**4. Evaluation criteria.** Source route: the mainstream closed-loop standard (plan-do-check-act), adapted to agent work, plus the repository's evidence and single-writer norms.

| Criterion | Definition | Evidence method | Priority | Source |
|---|---|---|---|---|
| Definition fidelity | The instance is derived, executable, verified and revisable | Check the four properties on the instance | Required | Mainstream control-loop practice |
| Coverage | Every goal clause has units and every unit has a verification | Clause-to-unit and unit-to-verification matrix | Required | Purpose-derived |
| Dependency validity | Order, data, authority and resource relations hold | Dependency graph check | Required | Mainstream practice |
| Evidence sufficiency | Every claimed pass has observable output and the close status matches its evidence | Assertion records and run output | Required | Repository evidence norm |
| Revision capacity | Assertion results change action and the decision scope is named | Step 5 mapping check | Required | Mainstream control-loop practice |
| Boundary integrity | Constraints, permissions, budget, write ownership and context scope hold | Governance check per unit | Required | Repository single-writer norm |
| Simplicity | The structure is the simplest reliable and every mechanism is justified | Mechanism-to-need check | Required | Purpose-derived |
| Honesty | Unverified items, risks and environment limits are named and no stop is reported as completion | Close status review | Required | Repository evidence norm |

Sufficiency: every definition clause and every relation is judged by at least one criterion, and no criterion restates another.

**5. Assertions and recomposition.** The definition, membership, relation and evaluation assertions were run on the model. The skill recomposes from the four artifacts: definition to the introduction and definitions; elements and membership conditions to the workflow-elements table; relations and rules to the global rules; recomposition method to the six steps; evaluation criteria to the outcome assertions. The skill's own structure mirrors the four artifacts.

### Collection

- **Docs.** From the conversation: the control-loop reading of orchestration, the workflow definition, the assertion layers, the decision scopes, the optional mechanisms, and the governance constraints. From the driver: the rejection of the framework shape, the requirement to complete the analysis method first and reforge this skill from its four artifacts, the precision requirement, and the shorter name. From the repository: the agent-team note, the notes contract and the forge skill.
- **SOP.** The six steps: read the situation, compose, execute, assert the run, re-decide, close.
- **Script.** None. The workflow's state format is environment-specific and no universal schema exists, so a fixed ledger would be the framework the design rejects; the forge's "without Script, skip and record" branch applies.
- **Uncollected leads.** The conversation's early sections on agent-team and Ralph mechanics; external workflow and control-loop literature beyond the cited plan-do-check-act standard; and the target harness's actual scheduling capabilities. None can change the skill's design further.

### Deconstruction units

- **U1, conversation messages 12–14 and 27.** Orchestration as a closed control loop with a derived arrangement: read the situation, act, verify, re-decide; the loop, not the plan, is the method. Purpose: a workflow that is revised by evidence. Covers C1–C4.
- **U2, conversation messages 22–27 and driver review 1.** Mechanisms are options; the simplest reliable structure wins; three assertions and two decision scopes keep feasibility, progress and completion apart; execution integrity keeps state, action and result trustworthy. Purpose: no framework, honest judgement. Covers C5–C6.
- **U3, driver reviews 2 and 3.** The analysis method must be completed first and applied to the workflow object; the four artifacts precede the recomposition; the precision must reach the forge's level. Purpose: the skill is forged from an analysis, not from prose. Covers C7–C8.
- **U4, driver reviews 3–4 and the repository declaration.** The two skills relate only at the intent stage; the names are shorter with the prefix kept; self-analysis is not surfaced; the record is an Agent Note; languages and the no-script rule follow the forge. Purpose: a standalone workflow skill with a forge-compliant record. Covers C9–C12 and the extraction correction.

### Dispositions

| Upstream item | Disposition | Location | Basis |
|---|---|---|---|
| Workflow definition and control-loop essence | Keep | Introduction, definitions, steps 1–6 | The analysis's definition artifact |
| The eleven elements and their membership conditions | Keep | Workflow-elements table and rule 2 | The analysis's element artifact |
| The relations and rules, including the recomposition order | Keep | Fifteen global rules, mechanism table and steps 2–6 | The analysis's recomposition-method artifact |
| The evaluation criteria and their source route | Adapt | Outcome assertions | The analysis's evaluation-standard artifact, compressed to the skill's final checks |
| Three assertion layers and two decision scopes | Keep | Definitions, rules 4 and 8, steps 2, 4, 5 and 6 | The analysis's relations and criteria |
| Governance invariants and execution integrity | Adapt | Rules 5 and 9–11, definitions, close statuses | The analysis keeps them as decision constraints, not a structure |
| Agent Team, Ralph loop, DAG as the means | Dissolve | Rule 12 and the mechanism-selection table only | The analysis treats them as optional mechanisms |
| Registry YAML, context-packet template and other schemas | Dissolve | Not carried | No environment-neutral schema; the properties remain as rules |
| Ruling, SSOT, bounded investigation | Adapt | Rules 6, 7, 14; definitions | The analysis method's transferable rules |
| The analysis method | Re-bind | Conditional reference in step 1 only | The driver limits the relation to the intent stage |
| A deterministic workflow ledger script | Dissolve | No script shipped | The analysis's recomposition chose no code artifact |
| The earlier long name `dsh-spec-adaptive-workflow` | Adapt | `dsh-spec-workflow` | The driver's review corrected the name for length; the prefix stays |
| Record as the adopter's decision mechanism | Keep | This Agent Note | The repository declares the notes form in `AGENTS.md` |
| C5: mechanisms are options and the simplest reliable structure wins | Keep | Rule 12 and the mechanism table | U2; the analysis's rule table |
| C6: three assertions, two decision scopes and execution integrity | Keep | Rules 4, 8 and 9; steps 2, 4, 5 and 6 | U2; the analysis's relations and criteria |
| C7: the two skills relate only at the intent stage | Keep | Step 1's conditional reference | U3 |
| C8: four-artifact analysis before recomposition, at forge precision | Keep | The Workflow deconstruction section, produced with `dsh-spec-analysis` | U3 |
| C9: shorter name with the prefix kept | Adapt | `dsh-spec-workflow` | U4 |
| C10: self-analysis is not surfaced | Keep | No self-analysis section; the four artifacts stand alone | U4: analysis already contains it |
| C11: record, languages, no script and landing follow the repository and forge defaults | Keep | Forging settings; no script shipped | U4 and the forge defaults |
| C12: extraction follows the forge's resource rule | Keep | This single-file skill has no reference split, so no step depends on a reference it does not read | U4; the forge's Resources rule |

Coverage: C1–C12 are each covered by exactly one unit or disposition row, and no row lacks a basis.

### Verification

`node skills/dsh-spec-skill-forge/script/verify-skill-spec.mjs .agents/dsh-spec-skill-forge/draft/dsh-spec-workflow --strict-budget --name-max 64 --description-max 1024 --compatibility-max 500 --max-lines 500 --max-tokens 5000 --cjk-tokens-per-char 0.6 --other-tokens-per-char 0.3` → 10 checks, 0 failed, 188 lines, ~4,759 tokens; the strict budget passes.

Non-mechanical judgments, made directly: the description names budgeted multi-step work, mechanism choice, verification and re-planning as triggers and excludes a single action or a fixed procedure; every step carries completion, check and failure recovery; the workflow-elements table states definitions, membership conditions and supported clauses for all eleven elements; the action table maps each assertion result to one action and one scope; mechanisms remain optional; environment limits are stated rather than assumed; the close statuses are mutually exclusive and evidence-bound; terms have one referent; the analysis's four artifacts map onto the skill's layers. The review draft is a language projection and is not judged again.

The note gates also pass: `translation-pair check` reports the two forging records consistent, `notes check --all` reports 26 notes with consistent structure, and `md-links check` resolves the four record files.

External trigger quality, cold start and representative-task utility are unverified: this environment has no harness that installs the skill for its target audience. They are recorded as a gap, not as a pass.

### Review and landing

Four review corrections shaped this forging. The first rejected the framework drift, raised the precision and shortened the name. The second required the analysis method to be completed first and the workflow skill to be reforged from its four-artifact analysis. The third broadened the analysis method's object scope, fixed its formatting and raised it to the forge's precision. The fourth removed the separate self-analysis surface and rebuilt the analysis method's extraction into per-step references, so this record's analysis was re-run with the completed method. The review draft is at `.agents/dsh-spec-skill-forge/review/dsh-spec-workflow/` in Chinese with an English trigger. It is submitted to the driver for acceptance, changes or rejection. Landing copies the work draft to `skills/dsh-spec-workflow/`, removes only this skill's draft and review directories, and moves this note to `implemented/`.

## Alternatives considered

**Ship a framework with a fixed state model, registry and write leases.** It lost because the applied analysis dissolved those schemas into principles; a framework constrains the orchestration it was meant to serve.

**Keep the method as principles without SOP steps.** It lost because a skill that only states principles gives an agent no completion judgment, check method or failure recovery.

**Merge it with the analysis skill.** It lost because the driver keeps them independent; the analysis method is optional at the intent stage and is not the workflow skill's foundation.

**Make an agent team the default mechanism.** It lost because the analysis treats a team as an option for independent work that needs separated roles, not as the method's shape.

**Use the Ralph loop as the core.** It lost for the same reason: a loop is a mechanism the method may choose, not the method itself.

**Ship a workflow ledger script.** It lost because no universal state schema exists; the analysis's recomposition chose no code artifact.

**Keep the name `dsh-spec-adaptive-workflow`.** It lost because the driver's review named it too long; `dsh-spec-workflow` keeps the prefix and the workflow intent.

**Write one shared record for both forged skills.** It lost because `AGENTS.md` names the record by skill name, and the two skills have independent acceptance.

## Acceptance criteria

- The work draft passes `verify-skill-spec.mjs` with the strict budget and the parameters above.
- The review draft transcribes the work draft into Chinese without new concepts, and the driver accepts it.
- `skills/dsh-spec-workflow/` equals the accepted work draft after landing, and this note is under `implemented/`.
- The description triggers on budgeted multi-step work that needs a derived path, and not on a single action or a request that fixes the steps.
- The eleven elements and their membership conditions are present in the skill, and `dsh-spec-analysis` is referenced only in step 1.

## Risks

- Its trigger boundary overlaps the agent-team workflow, which requires an explicit driver request, and the skill forge's planning phase; the description and the "not for" line reduce the overlap, but trigger quality is unverified.
- The method grants the executor wide latitude; rules 12 and 13 constrain it, but a weak model may ask too late or too seldom.
- Without scripts, no mechanical gate enforces budget accounting, state versions or write ownership; the method depends on the executor's evidence discipline.
- The applied analysis is recorded from one design pass; a second pass on a real task could move elements between the skill's layers.

## Related

- [Forging dsh-spec-analysis](2026-10-22-forging-dsh-spec-analysis.md) — the sibling forging whose four-artifact method produced the deconstruction above.
- [The agent-team workflow ships as a skill](../../implemented/process/2026-10-02-the-agent-team-workflow-ships-as-a-skill.md) — the team mechanism whose use this skill treats as an option.
- [The skill forge](../../implemented/process/2026-10-21-forging-dsh-spec-skill-forge.md) — the composition discipline and precision reference this forging follows.
