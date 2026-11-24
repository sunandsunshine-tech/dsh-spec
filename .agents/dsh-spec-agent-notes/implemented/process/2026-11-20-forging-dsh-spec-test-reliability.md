# Agent Note: Forging dsh-spec-test-reliability from the upstream CI test reliability skill

Status: implemented

English | [中文](2026-11-20-forging-dsh-spec-test-reliability.zh.md)

## Problem

The skill set has no workflow for tests that pass alone but fail under worker concurrency, shared host resources, process-global mutation, platform differences, or asynchronous teardown. An agent facing a flaky test can raise a timeout, retry, serialize a suite, or weaken an assertion without establishing why the test was unstable.

Upstream `dsh-ci-test-reliability` contains the missing procedure and a diagnosis reference, but it names one repository's test policy, defensive-pattern files, test runner, CI provider, workflows, runner topology, and command-selection skill. A verbatim port would carry another project's toolchain and evidence.

## Decision

The package ships `dsh-spec-test-reliability` as a general software-engineering skill. It owns test isolation, execution-topology modeling, resource allocation, process-global containment, platform semantics, deterministic test-duration design, timeout budgets, state synchronization, quiescent disposal, regression proof, flake-masking rejection, and read-only flake diagnosis.

The fast-contract/shared-real-resource default lives in `Design the smallest sufficient test`. The diagnosis-only read-only rule lives in `Diagnose existing flakes`. The execution-topology section names neither default, so each rule has one use site.

The skill separates test design from command selection. It names `dsh-spec-pre-push-checks` only after stating the generic requirement to use the project's check-selection practice:

`(when available, use the dsh-spec-pre-push-checks skill)`

The delivered directory carries:

- `SKILL.md` — the reliable-test procedure.
- `references/ci-flake-diagnosis.md` — the evidence and diagnosis workflow.
- `THIRD_PARTY_NOTICES` — provenance and the complete upstream and repository licence notices.

The skill ships no script and has no runtime dependency. Its decisions depend on evidence from the adopting project, not on a tool that could decide readiness, causal ownership, or a sufficient reproduction topology.

## Source and revision

Upstream source baseline read on 2026-11-20:

- Repository: `https://github.com/deepseek-ai/deepseek-harness`
- Baseline: `dsh-v0.2.2-rc.5` (`9c2670d3bce5275e0d1610272958121af87787bb`)
- `.agents/skills/dsh-ci-test-reliability/SKILL.md`
- `.agents/skills/dsh-ci-test-reliability/references/ci-flake-diagnosis.md`

## Settings

- Delivery language: English.
- Trigger language: Chinese terms appended to the description.
- Record language: English with a Chinese companion and a pairing record.
- Runtime: no bundled executable; the skill's examples use portable operating-system and test-runner concepts.
- Evaluation: development scenarios remain outside `skills/` and `.agents/skills/` and are staged only into temporary skill copies.

## Target rulings

| # | Ruling | Why | Reversible by |
|---|---|---|---|
| R1 | The target is any software project with automated tests, not one repository or language. | The package exists to avoid another project's ecosystem and toolchain. | Restore a named project or language. |
| R2 | Test policy, architecture and lifecycle rules are read from the adopting project's standing instructions and the documents they name. | These are the documents whose constraints actually govern the test. | Name fixed source paths again. |
| R3 | Test-runner configuration, CI workflows, worker counts, job topology and runners are read from the project when they affect the case. | Vitest and GitHub Actions in the source are instances, not universal mechanisms. | Restore one test runner and CI provider. |
| R4 | Command selection remains separate from test design. | A sound test can still be paired with an insufficient outgoing check set, while command selection cannot repair an unstable fixture. | Merge command selection into this skill. |
| R5 | The execution topology includes cases, files, workers, independent processes, jobs and shared runners. | Isolation at one layer does not protect resources shared at another. | Narrow the topology without evidence. |
| R6 | Acquired resources use the owner's atomic allocator, readiness signal and quiescent completion signal. | Check-then-use allocation races with independent users. | Replace atomic allocation with availability probes. |
| R7 | Process-global values capture absence as a distinct state and restore the original exactly. | Assigning an empty or default value does not restore an absent variable or hook. | Treat every restore as equivalent. |
| R8 | Platform-owned semantics are observations, not assumptions about exact round trips. | Precision, name case, handle release and permissions differ between platforms. | Assume one platform's semantics everywhere. |
| R9 | A timeout is a budget for named awaited work, not a synchronization mechanism. | A timeout can turn a race into a slower race without proving readiness or completion. | Treat timeout increase as a fix. |
| R10 | Teardown waits for the owned completion signal. | Returning from abort, close or kill does not prove that work has stopped. | Treat the command return as quiescence. |
| R11 | A regression uses a negative control and topology-specific evidence. | Stress alone cannot establish overlap or prove that the intended defect would fail. | Accept repeated execution as sufficient evidence. |
| R12 | Retries and global serialization are not default fixes. | They hide ownership and topology defects and impose suite-wide cost. | Permit masking by default. |
| R13 | A diagnosis-only request is read-only and classifies evidence without changing code, workflow, or rerun state. | Investigation authority does not imply repair authority. | Authorize unrelated mutations from diagnosis. |
| R14 | Evaluation manifests and fixtures remain development-only assets. | Adopters need runtime instructions, not the repository's development prompts and sample failures. | Ship evals inside the skill. |
| R15 | Deterministic test duration is design feedback: default to fast contract cases plus one shared expensive scenario, and repeat external work only in lanes where the result can differ. | More timeout preserves duplicate setup and over-broad coverage while making the suite slower and less informative. | Treat larger timeouts or a full external-work matrix as the default. |

## Constraint dispositions

`SK` is the upstream `SKILL.md`; `FD` is `references/ci-flake-diagnosis.md`. The target home is the corresponding section in `skills/dsh-spec-test-reliability/`.

| # | Source | Constraint | Disposition | Target home | Basis |
|---|---|---|---|---|---|
| S0 | `SK:1–8` | Name, description, title and scope: reliable tests under real CI topology; isolation belongs here, command selection does not. | Adapt | Frontmatter and intro | Remove the source product and generalize the test model. |
| S1 | `SK:10–16` | Read test-tier, lifecycle and CI topology rules; use pre-push separately. | Re-bind | Read the owning rules | Bind to the adopting project's declarations and check-selection practice. |
| S2 | `SK:18–29` | Model file, worker, process and shared-runner layers; identify resource owner, allocation, readiness, cleanup and completion; do not serialize the suite. | Keep | Model the execution topology | Product names are generic and framework-neutral. |
| S3 | `SK:31–41` | Allocate ports, temporary roots, namespaces and exclusive paths atomically; separate stable identifiers from ephemeral resources. | Adapt | Allocate resources atomically | Replace source API examples with portable allocator behavior. |
| S4 | `SK:43–54` | Treat process-global state as exclusive; capture absence, restore immediately, use a bounded scope and fallback interception. | Adapt | Contain process-global state | Replace JavaScript-only identifiers with cross-language equivalents while retaining examples. |
| S5 | `SK:56–65` | Respect platform-owned precision, environment-name case, handle release, permissions and signals. | Keep | Respect platform-owned semantics | Generic platform rules survive. |
| S6 | `SK:67–73` | Budget timeouts against the lane; raise setup and teardown together; keep outer waits larger than the subject timeout. | Keep | Budget timeouts against the lane | Generic test-runner rule. |
| S6a | Target requirement | Excessive deterministic test time is a test-design problem rather than a timeout budget; distinct slow work from fast contracts and run one shared representative expensive scenario. | Adapt | Design the smallest sufficient test | Prevents a timeout increase from masking repeated setup or an over-broad matrix. |
| S7 | `SK:75–83` | Synchronize on readiness, state transitions, owned promises and barriers; timeouts bound waits; restore real time. | Adapt | Synchronize on state | Remove Node/Vitest vocabulary while preserving the rules. |
| S8 | `SK:85–89` | Register cleanup immediately, detach everything owned, and wait for quiescence. | Keep | Dispose to quiescence | Generic lifecycle contract. |
| S9 | `SK:91–100` | Prove the intended regression with a failing control; prove overlap or concurrent-process isolation where relevant. | Keep | Prove the intended regression | Generic evidence rule. |
| S10 | `SK:102–116` | Reject timeout, retry, serialization, swallowed errors, weaker assertions and sleep-based masking; retain bounded external-provider retries. | Keep | Reject flake-masking fixes | Preserve the explicit external-boundary exception. |
| S11 | `SK:118–120` | Existing flakes use the diagnosis reference; diagnosis-only remains read-only. | Keep | Diagnose existing flakes | Generic authority boundary. |
| S12 | `SK:122–131` | Validate with the smallest focused regression and topology-specific evidence; report only observed results. | Keep | Validate and report | Generic reporting rule. |
| F0 | `FD:1–11` | Freeze the revision, workflow or job, runner, time, failure signature and comparable runs; use CI evidence. | Re-bind | Freeze the evidence | Replace one CI provider with the project's CI logs and metadata. |
| F1 | `FD:13–26` | Classify collisions, lifecycle, global contamination, synchronization, platform, product concurrency, external-provider and runner failures separately. | Keep | Classify the failure | Categories are product-neutral. |
| F2 | `FD:28–42` | Reproduce at the smallest relevant topology, match configuration, record platform limits, and use barriers for races. | Adapt | Reproduce the smallest relevant topology | Replace Vitest with the project's runner and processes. |
| F3 | `FD:44–48` | With authorization, fix the allocating, readiness, global-state or teardown owner; keep fixture data separate from allocation. | Keep | Fix at the owner | Generic ownership rule. |
| F4 | `FD:50–60` | Close only after classification, reproduction or explicit limit, negative control, restoration or teardown evidence, and observed check state. | Adapt | Close the investigation | Replace Actions check status with the project's CI check status. |

## Verification anchors

| # | Requirement | Anchor | Evidence |
|---|---|---|---|
| A0 | The skill conforms to the Agent Skills format, references stay one level deep, and the description remains under the package catalogue budget. | Mechanical | The skill-spec gate passed 14 checks; `SKILL.md` is 146 lines, its description is 434 characters, and the estimated body is 2,781 tokens. |
| A1 | The source's topology, resource, global-state, platform, timeout, synchronization, disposal, regression and masking rules are present. | Judged | `SKILL.md` sections against S0–S12 |
| A2 | Diagnosis preserves evidence, classification, topology limits, ownership and read-only authority. | Judged | `references/ci-flake-diagnosis.md` against F0–F4 |
| A3 | The skill names no framework, CI provider, source product path or command as a requirement. | Judged + Mechanical | Review found no source-product referent; the corpus sibling-reference gate passed. |
| A4 | The pre-push relationship is optional and names only the mechanism. | Mechanical | The corpus sibling-reference gate passed. |
| A5 | Runnable fixtures cover deterministic port failure, exact global restoration, read-only diagnosis and a slow repeated-suite redesign. | Mechanical | Repository tests run the fixtures' positive and negative controls and stage all declared inputs; the four direct fixture entries take under one second in aggregate. |
| A6 | Runtime model behavior against the scenarios. | Judged + Mechanical | The runs under `tests/skill-evals/evidence/2026-11-20-pr116/` and `2026-11-23-pr116/` are historical provenance. The current isolated diagnosis and slow-suite runs under `tests/skill-evals/evidence/2026-11-23-pr121/` pass 10/10 assertions against the current skill revision. |
| A6a | The description routes reliability and test-duration work without capturing adjacent product-performance, coverage, documentation, or visual-review tasks. | Judged + Mechanical | Four positive and four near-miss probes pass 8/8 through the stable `SELECT:` marker; trigger input binds the frontmatter name and description. |
| A7 | The installed copy, notices, active note tree and translation pairs are consistent. | Mechanical | The final functional suite uses a stubbed corpus contract; the real corpus is owned by the `pnpm run check:corpus` step. Notes, pairing, notices, format, static and bundle checks pass, without duplicating process counts here. |

## Pages read

Read on 2026-11-20:

- `https://agentskills.io/llms.txt`
- `https://agentskills.io/specification.md`
- `https://agentskills.io/skill-creation/best-practices.md`
- `https://agentskills.io/skill-creation/optimizing-descriptions.md`
- `https://agentskills.io/skill-creation/evaluating-skills.md`

## Alternatives considered

**Port the upstream skill verbatim.** It lost because its test runner, CI provider, repository files and command-selection mechanism are one project's implementation.

**Merge test reliability into pre-push checks.** It lost because reliability is used while designing, changing and diagnosing tests, while command selection happens only when preparing an outgoing push.

**Ship no diagnosis reference.** It lost because the main skill would carry every evidence and reproduction detail on activation, and the source already has a clear read-on-demand boundary.

**Add a script to inspect tests.** It lost because causal ownership, sufficient topology, causal overlap and evidence quality are judgement calls, and the source ships no exact checker.

**Treat any retry as invalid.** It lost because a documented transient external provider can require a bounded retry at that boundary. The exception is narrower than retry as a local flake fix.

**Multiply every timeout group by three.** It lost because the elapsed time is already evidence of repeated setup or an over-broad test layer; larger budgets retain the wasteful design and make failures slower to diagnose.

**Make diagnosis imply a fix.** It lost because the requested scope controls write authority. Diagnosis reports evidence and handoff unless the user also authorizes repair.

**Ship the eval corpus inside the skill.** It lost because every adopter would receive development prompts and fixture failures rather than runtime capability.

## Consequences

- The package gains a general skill for test design, review and flaky diagnosis without a framework or CI-provider dependency.
- The main entry carries the operating rules; the diagnosis reference loads only for an existing probabilistic failure.
- Four runnable development scenarios cover the central behaviours. PR116 model results remain as answer-contaminated historical evidence; current isolated runs live under the PR121 evidence tree.
- The source licence and relation travel with installed copies.
- Rollback is a revert of the implementing commit; the extraction submodule remains untouched.
