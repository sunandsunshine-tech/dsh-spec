# Agent Note: Independent skills compose through workflow judgment

Status: implemented

English | [中文](2026-11-19-independent-skills-compose-through-workflow-judgment.zh.md)

## Problem

Skills install independently, but real work often places several of their generic capabilities in one task. A skill that tries to connect them by importing a sibling's command, record format or ordering stops working when that sibling is absent or replaced. Moving the whole relationship into one orchestrator makes that orchestrator own policies that belong to the participating skills. Treating a scope-wide policy as a corpus invariant creates another failure: adding an expensive target or companion can force a backfill of records that the task never touched.

The skills need a durable boundary for situations where their capabilities compose without becoming dependencies and without giving either side knowledge of the other's implementation.

## Decision

Each skill owns a generic capability at its own boundary, not its callers. It states the facts, operations and completion evidence needed to use that capability, and it continues to work when installed without the other skills that may participate in a larger task.

Composition is a workflow judgment made by the acting model from the task, the available skills and the project's declared evidence. The model selects the applicable skills, resolves project-specific values, supplies explicit inputs to each capability and combines their results. A skill does not invoke, name as a requirement, copy or parse a sibling's commands, paths, record format, internal ordering or defaults. When a skill names a sibling, it does so only as an availability-qualified optional example after stating the generic requirement.

A cross-boundary handoff carries generic facts rather than either side's internal representation. Examples include a declared scope, the current members of one unit, existing targets or companions, and a readiness result supplied by the mechanism that owns a consistency check. The receiving skill may validate the fact it owns, but it does not infer the provider's domain semantics from a private format.

Scope policy and per-unit composition are separate. Scope policy influences the selection made when a unit is created or intentionally revisited; it is not an invariant that every existing unit must immediately satisfy. Membership of one unit is determined at the operation that creates or changes that unit. A new requirement may therefore be adopted progressively as units are created or revised, while removing an existing member may be applied consistently across the eligible active corpus when the cleanup is cheap and deterministic. Sealed history never participates in a policy migration.

Control is reserved for authorization, irreversible actions, safety and required validation. An irreversible operation may require a fixed preparation, readiness and commit sequence because the cost of an accidental success cannot be repaired. The semantic choice that decides whether the operation is ready remains with the model or workflow; the mechanical gate verifies only the state and external readiness evidence it is given.

## Alternatives considered

**Make one skill a hard dependency of the other.** It gives one invocation path, but it prevents independent installation and turns an optional capability into a failure of the task that does not need it.

**Create a general orchestrator skill that owns every cross-skill relationship.** It centralizes composition, but the orchestrator must then duplicate each participant's policy, and every new combination expands its installation and review surface.

**Merge the participating skills.** It removes the handoff, but it also merges unrelated triggers, runtime requirements and ownership decisions for adopters that need only one capability.

**Copy the generic rules into both skills.** Each skill can then work alone, but two owners drift and the copied detail makes a sibling's implementation look mandatory.

**Let one skill read the other's records and call its commands directly.** It produces a convenient integrated path, but it makes private formats and invocation order public and breaks equivalent implementations.

**Fix the composed command sequence in the prompt.** It can make one known pair deterministic, but it prevents the model from adapting to available capabilities, project conventions and the actual scope.

**Treat scope policy as a whole-corpus invariant.** It gives immediate visual consistency, but adding costly companions would force unrelated records to migrate at once, while the operation that needs the change may touch only one unit.

## Consequences

- Any subset of the skills remains installable and useful; combined behavior depends on the model recognizing the available capabilities and the evidence they expose.
- Cross-skill behavior is evaluated through independent-install and composed task scenarios rather than one assumed end-to-end command.
- A task can use a different implementation of the same generic capability without editing either skill, provided it supplies the same facts and completion evidence.
- Scope and unit can legitimately differ during progressive adoption. Tests and reports must distinguish untouched units from inconsistent units.
- Irreversible operations gain a mechanical preparation and readiness boundary, while semantic choices remain available to the model.
- Prompts state outcomes, constraints and evidence; they fix a command sequence only where the implementation or safety boundary requires it.
- [Sibling references name a mechanism, not its implementation](../process/2026-11-17-sibling-references-name-a-mechanism-not-its-implementation.md) owns the syntax of cross-skill references. This decision owns why composition remains workflow judgment rather than an imported sibling API.
- [Agent Notes default to capability-aware bilingual companions](../feature/2026-11-18-agent-notes-capability-aware-bilingual-defaults.md) applies this boundary to a note unit composed with an external translation mechanism.
