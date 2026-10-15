---
name: dsh-spec-agent-team
description: Cross-domain agent team orchestration and dispatch specialist. Use this skill when the Agent Driver (human) explicitly requests expanding into multi-agent team collaboration to accomplish complex, broad-span tasks (e.g., complex solution delivery, system refactoring, cross-module end-to-end execution). The primary Agent acts as Leader, strictly demarcating role boundaries across Explorer, Worker, and Reviewer. Employs roster-based P2P communication, smart resource pooling, context-first compaction, and circuit-breaker arbitration to achieve high cohesion and cost efficiency.
---
# Agent Team Orchestration Standard Operating Procedure (Agent Team Orchestration SOP)

This skill governs role allocation, peer-to-peer communication, scheduling pipelines, and context anti-corruption boundaries when enabling multi-agent team collaboration within the Harness framework.

**Applicable Scope**: This is a **universal meta-methodology skill** applicable to software engineering, solution architecture, specialized research, document auditing, and other complex deliverables (examples below primarily illustrate software engineering).

---

## I. Core Definitions

- **Agent Driver**: The human engineer operating the collaborative agent system, holding supreme arbitration and final acceptance authority.
- **Work (Mission)**: A concrete, verifiable, closed-loop delivery task with a well-defined lifecycle (e.g., concrete implementation of an RFC proposal, complete code delivery of a feature PR).
- **Non-Work Tasks**: Auxiliary, exploratory, or preparatory activities that do not directly introduce code or delivery side-effects. For example:
  - Exploring existing internal codebases and assets;
  - Web retrieval and technical research across external official documentation, public information, and third-party specifications;
  - Side-effect-free prototyping and logical deductions;
  - Document persistence of execution plans and architectural decisions;
  - Pre-configuring global toolchains or external environments for upcoming work.

---

## II. Roles & Naming Conventions

### 1. Naming Rules
Except for the primary Agent, all team members adopt standardized naming to facilitate affinity-based addressing:
- **Leader**: Directly assumed by the primary Agent; **requires no additional name**.
- **Explorer**: Named as `explorer-<index>` (e.g., `explorer-1`).
- **Worker**: Named as `worker-<index>` (e.g., `worker-1`).
- **Reviewer**:
  - **When domains are configured**: Named as `reviewer-<domain>-<index>` (e.g., `reviewer-code-1`, `reviewer-security-1`).
  - **When domains are unconfigured**: Directly named as **`reviewer-<index>`** (e.g., `reviewer-1`, `reviewer-2`).
    * **[Mandatory Assignment Rule]**: If specific domains are unconfigured, **the Leader MUST personally evaluate the work type, select, and explicitly state the Top-3 core review directions in the review task payload**. The Reviewer strictly audits against these three directions defined by the Leader; **the Reviewer is strictly forbidden from determining its own review focus**.

### 2. Responsibilities Matrix
All recruited members are **reusable persistent agents**, scheduled via cyclic affinity:

| Role | Cardinality | Recruiter & Manager | Core Functions & Boundaries |
| :--- | :---: | :---: | :--- |
| **Leader** | 1 (Primary Agent) | System Default | • **Strictly forbidden from executing concrete "Work"**.<br>• Manages all non-work affairs: global orchestration, non-blocking cross-task scheduling, dispute arbitration, and final deliverable merging.<br>• Maintains direct, unblocked communication with the Driver. |
| **Explorer** | 0 .. n | Leader Decision | • **Strictly forbidden from executing concrete "Work"**.<br>• Parallelizes read-only exploration of internal codebases and external web/doc retrieval for the Leader; reports structured summaries. |
| **Worker** | 0 .. n | Leader Decision | • **Owns the closed-loop execution of a single complete "Work"**.<br>• Encapsulates trial-and-error, tool executions, and debug logs internally; delivers only clean, structured deliverables (e.g., Git commits / PR diffs). |
| **Reviewer** | 0 .. n | Leader Decision | • **Independently audits and validates the Worker's deliverable** within a specified focus area.<br>• Performs objective audits based solely on the deliverable; does not perform fixes on behalf of the Worker; maintains an isolated review context. |

---

## III. Communication Protocol: Roster Broadcasting & P2P Direct Messaging

To prevent the Leader from becoming an expensive message-forwarding bottleneck and blocking interaction, adhere to the following protocol:

1. **Roster Dispatching**:  
   When the Leader dispatches a Work unit, **it MUST attach the Assigned Roster to the task metadata** (specifying the assigned Worker and assigned Reviewer identifiers for this Work).
2. **P2P Direct Messaging (Ping-Pong)**:  
   Upon completing a deliverable, the Worker transmits the artifact directly to the corresponding Reviewer based on the roster; the Reviewer responds with review findings directly to the Worker.
3. **Asynchronous Non-Blocking Leader**:  
   The Leader does not listen to or forward intermediate back-and-forth messages, **intervening only upon completion notices, severe blockers, or circuit-breaker triggers**. The Leader remains immediately responsive to the Driver at all times.
4. **Cohesive Local Exploration**:  
   Workers and Reviewers must conduct required explorations within their own sessions; **they are strictly forbidden from spawning Explorers** (Leader work dispatches already provide sufficient context and reference links).

---

## IV. Dynamic Workflow Orchestration, Pooling, & Circuit Breaker (IoC Workflow & Pooling)

Team size, parallelism, review sequences, and circuit-breaker thresholds adhere to an **Inversion of Control (IoC) configuration model**:

### 1. Rule Resolution Precedence
1. **Priority 1**: Explicit workflow and review pipeline configurations declared in the workspace root `AGENTS.md` (or pointed configuration files).
2. **Priority 2 (Fallback)**: If unconfigured, **silently follow the skill's built-in default algorithm**. The Agent is strictly forbidden from proactively questioning or interrogating the Driver during initialization.

### 2. Default Scheduling & Smart Pooling
- **Evaluate In-Flight Progress (Asynchronous Wait vs. Spawn)**:  
  When new work arrives, if an active pair of members is near completion, the Leader should **maintain asynchronous listening and wait for their release** to reuse them, avoiding indiscriminate expansion;  
  *【Driver Override】If the Driver commands "Start work immediately", the Leader abandons waiting and spawns new members immediately.*
- **Affinity Matching for Idle Members**:  
  When dispatching new work to idle members, **prioritize members that previously handled similar modules or context**, maximizing LLM caching and established domain understanding.

### 3. Circuit Breaker & Arbitration Protocol
To prevent Workers and Reviewers from falling into infinite modification loops:
1. **Breaker Threshold (Default)**: Rework iterations between Worker and Reviewer **trigger a mandatory circuit breaker if agreement is not reached within 2–3 rounds**;
2. **Automatic Suspension**: The pipeline is immediately suspended; further independent back-and-forth is halted;
3. **Escalate for Arbitration**: The Reviewer compiles a summary of the core dispute for the Leader. The Leader resolves it or **invites the Driver to deliberate and make the final determination**.

---

## V. Context Health: Compaction First, Handover Last

1. **Affinity Lock**: Iterative revisions for the same Work must consistently route to the same Worker and Reviewers, preventing zero-context cold starts.
2. **Sub-Health Monitoring Indicators**:
   - Session token consumption reaches **80%** of the model's context limit;
   - Two consecutive identical basic errors recur;
   - The agent begins forgetting established rules or hallucinating due to excessive context length.
3. **Tiered Remediation**:
   - **Tier 1 (On-Site Compaction)**: Pause operations and instruct the Agent to perform self-compaction over historical turns—pruning intermediate debug logs while retaining core decisions, delivered commits, and active contract blockers. The Agent continues holding the Work post-compaction.
   - **Tier 2 (Retirement & Handover)**: *Triggered only if reasoning quality remains severely degraded after compaction*. The old Agent produces `<work-id>-handover.md` (recording delivered commits, active blockers, and failed attempts); the Leader terminates the old Agent and spawns a fresh Agent to resume via the handover note and branch diff.

---

## VI. Setup Guide & AGENTS.md Directives

During the Setup workflow of this skill, **the agent MUST NOT proactively interrogate the Driver regarding advanced customizations**.  
Upon completing injection, **report a single-turn notice to the Driver**: *"Base directives successfully bound; default scheduling and adaptive review are ready out-of-the-box. Feel free to inquire anytime if you need custom review domains or pipeline workflows for this project."*

### Target Injection Text (Workspace Root `AGENTS.md`):

```markdown
### Agent Team Directive
- Agents are strictly forbidden from expanding into multi-agent team collaboration without explicit instructions from the human Driver;
- When the Driver explicitly directs team collaboration, activate and execute the `dsh-spec-agent-team` skill.

#### `dsh-spec-agent-team` Custom Configurations (Optional)
> If unconfigured, the skill silently adheres to its built-in defaults. Declare the following items to override default behavior:
<!--
- review_domains: [code-standards, architecture-design, performance-security]
- pipeline_topology: pipeline (serial) | paired (parallel independent)
- circuit_breaker_threshold: 3 rounds
-->
```

---

## VII. Acceptance Checklist

Before concluding team orchestration, the Leader must self-verify:

- [ ] **Explicit Authorization Confirmed**: Was team deployment strictly initiated by the Driver?
- [ ] **Compliant Naming & Assignment**: If domains are unconfigured, are Reviewers named `reviewer-<index>`, and were the Top-3 directions explicitly stated by the Leader in the task payload?
- [ ] **Roster Dispatched**: Did work dispatches include the assigned member roster to guarantee direct P2P messaging without Leader proxying?
- [ ] **Leader Non-Blocking**: Did the Leader remain asynchronously responsive to the Driver throughout execution?
- [ ] **Resource Reuse Prioritized**: Were near-completion or similar high-affinity members prioritized over indiscriminate spawning?
- [ ] **Compaction First Upheld**: When context limits were hit, was session compaction strictly attempted before any agent replacement?
- [ ] **Circuit Breaker Enforced**: Did review iterations converge within thresholds? Were deadlocks suspended and escalated for arbitration?
- [ ] **Custom Configurations Honored (If Any)**: If project `AGENTS.md` declared custom pipelines, domains, or breaker rounds, were they strictly followed?
