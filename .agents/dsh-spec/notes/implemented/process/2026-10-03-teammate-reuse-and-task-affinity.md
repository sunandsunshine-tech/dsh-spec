# Agent Note: Teammate reuse and task affinity

Status: implemented

English | [中文](2026-10-03-teammate-reuse-and-task-affinity.zh.md)

## Problem

The team workflow skill names the roles and their carriers, sizes each pool `1..N`, orders overlapping paths with `blocked_by`, and says that `write_scopes` diagnoses overlap without blocking a claim. It leaves two things unstated: how one member instance is named, and when a role pool should gain a member.

Both gaps have consequences. A member named after the plan in progress carries a name no later delivery can reuse, so the next delivery rebuilds the team instead of addressing a holder that already exists. A card chain that `blocked_by` already serializes, split across two members of one role, buys no concurrency, and the owner of the later card starts without the context the earlier card built.

## Decision

Two rules join `dsh-agent-team-workflow`:

- In §2, Roles and carriers: "A teammate's name is its role and an index (`worker-1`, `reviewer-2`); a member keeps that name when a later delivery reuses it."
- In §6, Parallel work: "A role gains an additional member only for concurrency or context isolation; dependent cards in one role stay with a single owner."

The name is the member's identity across deliveries: the role fixes the kind of work, the index separates instances, and keeping the name is what lets a later delivery address the same holder. The affinity rule constrains adding a member to an existing role pool and nothing else. `additional` rather than `second` keeps it on a pool of `1..N`, so a third Worker is as constrained as a second. §2's `Create all four roles at the start` stands: the rule governs a member added to a pool, not the four roles that open a delivery. Cross-role flow stands too: a Reviewer card depends on write cards and a Texter card on the last review, and those dependencies are ordered by `blocked_by`, not by this rule.

## Scope against the withdrawn carrier ladder

[Delegation follows the harness and the prompt](2026-09-23-delegation-follows-the-harness-and-the-prompt.md) withdrew delegation as a rule and archived the cost ladder. What it withdrew is **carrier selection**: whether a task is delegated at all, and which carrier holds it — a judgement the harness and the prompt already make, and one whose answer moves with deployment settings. Neither rule here decides whether to delegate. Once the prompt has activated a team, the open question is how the dependency graph maps onto member slots that already exist, and that is a scheduling method inside an authorized team rather than a carrier policy. An added member is justified by concurrency or context isolation, never by a ranking of carriers, so the rule does not resurrect the ladder. The two notes overlap at the delegation-scheduling boundary; both stay active and cross-linked, and neither supersedes the other.

## Alternatives considered

**Let the runtime schema own the name.** Rejected: the schema constrains uniqueness and the kebab-case grammar, not the role-plus-index shape, so a name derived from the plan passes it and the next delivery still rebuilds the member.

**Require a split reason on every task card.** Rejected: it charges a cognitive tax on every card to template one Lead judgement, and a filled field is not the judgement.

**Set a file-count threshold for adding a member.** Rejected: a static threshold is the cost ladder under another name, and a count does not show whether an added member has independent work.

**Leave both unstated.** Rejected: the failures above are evidence that the gap is not neutral.

## Consequences

- The naming form belongs to the skill rather than to the tool: the runtime guarantees a unique name, and the skill states which name.
- A dependent chain in one role keeps one owner, so the context built on an earlier card reaches a later one.
- §2 and §6 carry the rules; there is no new gate, no new tool, and no change to a role's mandate.
- The partial overlap with [Delegation follows the harness and the prompt](2026-09-23-delegation-follows-the-harness-and-the-prompt.md) stays, recorded by the cross-link rather than by archiving either note.
