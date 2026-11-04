# Agent Note: The agent team workflow is removed

Status: implemented

English | [中文](2026-10-22-the-agent-team-workflow-is-removed.zh.md)

## Problem

The repository shipped a second skill, `dsh-spec-agent-team`, carrying the consumer-facing half of team work: the Lead, Worker, Reviewer and Texter roles, the task card, the activation announcement, the naming and affinity rules, and the obligations a step derives from the norms. The skill set is being rebuilt around one deliverable, the skill forge. Team work itself lives in the harness's team tools and the maintainer's prompt, so a repository skill restates a mechanism it cannot check, adds a second deliverable to maintain, and keeps the installed set larger than the rebuilt repository ships.

## Decision

The repository removes `dsh-spec-agent-team` and its installed copy. The two notes that shipped it are archived: [The agent team workflow ships as a skill](../../archived/process/2026-10-02-the-agent-team-workflow-ships-as-a-skill.md) and [Teammate reuse and task affinity](../../archived/process/2026-10-03-teammate-reuse-and-task-affinity.md). [Delegation follows the harness and the prompt](2026-09-23-delegation-follows-the-harness-and-the-prompt.md) stays active; its decision is unchanged, and the paragraph that placed the workflow in a skill is superseded by this note.

No replacement skill is added. The harness's roster, task board, mailbox and team tools, together with the maintainer's prompt, are the whole team mechanism.

### What was given up

- The Lead, Worker, Reviewer and Texter role model, and the singleton and pool sizes.
- The task-card contract and the activation announcement that named the running mode.
- The naming rule (`role-index`, kept across deliveries) and the affinity rule (a pool gains a member only for concurrency or context isolation).
- The derivation of each step's obligations from the repository norms.

### Reintroduction condition

A future team skill needs a closed artifact this repository can check, and a showing that the harness and the prompt cannot carry the method. Convenience does not qualify.

## Alternatives considered

**Keep the skill unmaintained.** It lost because an unmaintained skill still installs and still presents itself as available; removing it states the truth.

**Fold it into the forge.** It lost because the forge produces skills, a workflow is not a skill artifact to forge, and the forge cannot check it.

**Keep the naming and affinity rules as documentation.** They lost because they described the removed skill's pools; with no pools there is nothing to name, and the archived notes keep the reasoning.

**Archive without a removal note.** It lost because the archived notes explain why the skill shipped, not why it was removed; a future session would read the freeze as current authority.

**Leave the delegation note untouched.** It lost because the note linked to the removed skill and claimed a skill held the workflow; it is updated to the present state.

## Consequences

- The set ships no agent-team skill; the root README lists the skills the repository ships, and the installed copies mirror them.
- The harness and the prompt are the whole team mechanism, and no repository file duplicates it.
- The archived triplets stay frozen history; this note owns the current state.
- The delegation note keeps its decision and loses the claim that a skill carries the workflow.
- The removed paths are absent from the working tree; the notes gates and the archive seal pass.

## Testing

- `git ls-files skills/dsh-spec-agent-team .agents/skills/dsh-spec-agent-team` → no output.
- `pnpm test` → the functional suite passes.
- `node scripts/verify-corpus.ts --base-ref=HEAD` → every skill entry, the notes tree and archive, the maintained translation pairs and the vendored notices pass.

## Related

- [The agent team workflow ships as a skill (archived)](../../archived/process/2026-10-02-the-agent-team-workflow-ships-as-a-skill.md) — why the skill shipped.
- [Teammate reuse and task affinity (archived)](../../archived/process/2026-10-03-teammate-reuse-and-task-affinity.md) — the naming and affinity rules it carried.
- [Delegation follows the harness and the prompt](2026-09-23-delegation-follows-the-harness-and-the-prompt.md) — the decision that keeps delegation on the harness and the prompt.
