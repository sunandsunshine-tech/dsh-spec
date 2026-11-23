# Agent Note: Skill rules stay with their loaded owner

Status: implemented

English | [中文](2026-11-23-skill-rules-stay-at-their-loaded-owner.zh.md)

## Problem

A skill entry and its references can state the same rule in different words. The copies drift, and a model may follow the wrong copy when the task crosses the boundary between routing and detailed execution. Moving every rule out of an entry does not solve the problem: it can force a reference read before the model can even decide whether the task needs that detail.

The skill set also installs independently. Consolidating per-skill defaults or merging adjacent skills reduces file counts while coupling installation, triggers and runtime prerequisites that do not belong together.

## Decision

A rule lives with the resource that must load before its first decision:

- the entry keeps scope, authorization, stop conditions, irreversible ordering, completion evidence and enough detail to choose the relevant path;
- a reference owns detailed formats and procedures when every use of that path already requires the reference;
- script `--help` owns mechanical options when invoking the script already requires choosing among them;
- a project instruction owns project-specific values and conventions.

One resource owns each fact. Other resources may state the local consequence needed for routing, but not repeat the complete owned rule.

`pr-description` routes AI Usage at the entry and leaves its model, declaration block, grading and read-back checklist in `references/ai-usage.md`. `translate-docs` uses its three paths for admission and content production, with one completion section for writes, retirement, checks and reporting. `agent-notes` keeps lifecycle judgment, the companion ladder, archive readiness and freeze safety in its entry, while the two contracts own the detailed active and archived formats. `client-ui-ux` leaves detailed consumer tracing to one section. `browser-gif-evidence` states the output-preservation result while its encoder and publication reference own their mechanisms. The remaining structural moves follow the same ownership test.

The 15 skills remain separate. A skill may name another only as an availability-qualified optional example. Shared tools, separate products, different triggers or different runtime prerequisites do not create a reason to merge skills.

Model evidence follows the changed behavior described in [Model evidence binds the behavior it exercises](2026-11-23-model-evidence-binds-changed-behavior.md). A structure-only change uses the affected behavior scenarios rather than every historical scenario.

## Alternatives considered

**Merge related skills.** This reduces the number of names but combines unrelated triggers, completion states and runtime requirements. It also prevents adopters from installing only the capability they use.

**Move every detailed rule into references.** The entry becomes short, but simple routing and safety decisions then require the full detailed contract before the model can decide whether that contract applies.

**Keep every rule in the entry.** The entry remains self-describing, but references, scripts and duplicate summaries drift and the largest entry approaches the context budget.

**Use one shared defaults paragraph.** The paragraph can be centralized for maintainers, but every independently installed skill then depends on a resource it may not carry.

**Rerun every model scenario after every wording edit.** This proves more than the edit changes and turns unrelated historical evidence into a permanent synchronization burden.

## Consequences

- Entries state routing, safety and completion; references and script help own details that are needed only after that routing decision.
- A skill remains complete when installed alone and when its optional siblings are absent.
- Structural consolidation can proceed without deleting distinct capabilities or consolidating independent installations.
- A changed behavior selects targeted model evidence; unaffected scenarios remain evidence for the revision they exercised.
- The repository keeps 15 distinct skills and the repeated `## Defaults` contract in each default-bearing entry.
