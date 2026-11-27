---
name: dsh-spec-speed-up-perf
description: "Use when investigating or improving a production software path's latency, throughput, CPU, cold-start, memory or responsiveness, or when designing a comparable benchmark, performance gate or profile. Covers behavior-preserving optimization, negative controls and bounded evidence. Not for test flakiness, coverage, general code review, visual design or capacity planning. 用于调查或改进生产软件路径的延迟、吞吐、CPU、冷启动、内存或响应性，或设计可比的 benchmark、性能门禁与剖析；涵盖保持行为的优化、负控制和有界证据。不用于测试不稳定、覆盖率、通用代码审查、视觉设计或容量规划。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
---

# Speed up a production path

Turn a broad “make it faster” request into reproducible measurements on the path users exercise and a bounded, evidence-backed result. This is investigation guidance, not a performance quota or benchmark framework.

A diagnosis-only request stays read-only. Modify code, tests or configuration only when the user also authorizes an optimization.

## Defaults

Apply this skill's use-site default only when neither the request nor existing project instructions choose one. Treat existing instructions as authoritative read-only input; do not ask for, create, modify, or copy instructions merely to select a default.

## Frame the operation

Read the project's standing instructions, architecture and testing policies, relevant package guidance, defensive patterns and owning decision records before acting.

State the user action, externally observable completion condition, workload range, resource constraints, runtime, exact current source state and stopping rule. Include the typical workload and the tail dimensions that matter. Agree which behavior may not change and whether any minor visible difference is authorized.

Survey applicable lifecycle moments: cold start, first use, warm or re-entry, typical and tail data, repeated activation or navigation, live update, cancellation and teardown.

Read the project's exact current source, production call sites, tests and settled review state; request prose can describe abandoned work. Delivered code outranks an intended-change description, a closed-unimplemented proposal, a historical estimate or an earlier model's narration. Keep delivered, declined, superseded, estimated and newly measured evidence distinct. Treat earlier records and measurements as leads, not authority to reintroduce an implementation.

Use the production entry, built artifact, validation and completion condition that users actually exercise. A benchmark-only copy of an algorithm, a parse-and-discard baseline or a component microbenchmark does not establish the performance of its parent path. Keep backend, browser and end-to-end measurements separate: internal speed does not prove transport, paint, scrolling or input response. When isolating local overhead, exclude model, network and external-service latency and state that exclusion; do not call the remainder complete product latency.

Vary independent cost drivers separately, such as payload size, item count, representation, update frequency, concurrency, fan-out, retained state and rendered elements. Include typical and tail workloads, and add a matrix cell only when it can change the operation, cause, gate or fix. Tiny repeated inputs are realistic only when that pattern matches the operation.

Do not add a production export solely for measurement, and do not copy a production algorithm into a benchmark implementation.

If no reproducible operation or measurement path exists, give the smallest measurement plan and name the missing capability or input. Use only tools available under the request, the environment or project policy. When the host masks a browser, profiler, service or other required capability, hand off the missing measurement; do not download, install or start a substitute to bypass the constraint. Do not turn source intuition, ambient tooling or a favorable run into a measured result.

When authorized local corpus or production telemetry is inspected, extract only the aggregate characteristics needed to define workload dimensions. Never copy prompts, outputs, paths, identities, credentials, recordings or recognizable snippets into fixtures, logs, screenshots, pull requests or artifacts. Generate fixed inputs from reviewed constants. A benchmark must not depend on the user's home, an ambient repository, a network service, a private corpus or an undeclared global cache.

## Keep measurement decisions distinct

| Decision | What it establishes | What it does not establish |
|---|---|---|
| Benchmark | Comparable raw samples for a named workload and entry path | The cause, a pass threshold or the complete user result |
| Gate | A project-owned pass/fail rule applied to a named measurement | Universal performance, causation or permission to move the rule |
| Profile | Where time, work, allocations or retained state concentrate | A product result, behavior preservation or a stable gate |
| Evidence | The retained samples, conditions, checks, limits and decision | More authority than the measurement and review that produced it |

Reuse the project's benchmark, profiler, trace, production telemetry and reporting mechanism before adding tooling. Extend an existing project-owned measurement or required check instead of creating a competing benchmark or calibration system. A benchmark, required gate, profile and report are separate decisions; none substitutes for another.

Keep package-local diagnostics beside the owning module, and place cross-boundary required cases beside the measured user path in the project-owned benchmark location.

Without a project budget, report absolute before and after values and their ratio. A requested gate derives from repeated measurements of the named workload and its observed noise, in the form the project already uses. Treat a gate as source configuration or a project-owned threshold, never as an environment override, a widened limit chosen after failure or a universal constant. A generous gate that admits the known regression is not protection.

Use the project's declared calibration and variance policy; do not scale bytes, counts or dimensionless ratios by processor speed. Manual browser diagnostics stay threshold-free. A browser timing gate requires an explicit lane decision and repeated measurements on its actual gate runner and each supported browser; backend or runtime calibration does not establish browser timing. Serialize measured work against other owned CPU-heavy jobs and compare reference and candidate under comparable conditions. Budgets remain source constants; a favorable run never overrides a noise-aware result.

## Record measurement semantics

Before implementation, record:

| Field | Required decision |
|---|---|
| Operation | Exact user action and externally observable completion condition |
| Workload | Fixed dimensions, distributions, construction seed or constants, and why they exercise typical and tail use |
| Entry path | Production calls, composition, built artifact and mocked external boundaries |
| Clock and state | Included setup, cold or warm state, timing start and end, and excluded costs |
| Memory | Reachable endpoint objects, baseline, collection policy, and retained versus transient limits |
| Verdict | All raw samples, chosen aggregate, project gate if any, calibrated absolute, ratio and memory limits, and the negative control |
| Behavior | Owning functional checks and every authorized visible difference |

Hold the workload, inputs, cold or warm state, caches, startup, validation, completion condition and built artifact equal on both sides. Keep every raw sample. When the project declares no sampling policy, run one warm-up and at least five measured samples for each side, interleaving baseline and candidate when practical. Report the median with its range; use the required percentile and add samples for tail latency. Exclude setup or teardown consistently. If conditions cannot be controlled, label the result observational and narrow the claim rather than selecting the best run.

Cold-start measurements use fresh processes or child processes and private temporary roots. A warm sample may retain the cache the operation really retains; fixture setup must not warm a cold case accidentally. Process-memory evidence distinguishes memory still reachable from the endpoint from transient allocation or peak pressure. Keep intended objects and output reachable on both sides, use an explicit garbage-collection or sampling policy, and do not compare a retained, validated result with a parse-and-discard case.

## Choose the measurement surface

| Path | Default evidence |
|---|---|
| Backend, service or CLI | The real handler or executable, phase timing, relevant CPU, allocations, I/O, query or call counts, and percentile latency or throughput |
| Browser | A real input in the built application through the visible update, with browser timing or traces separating network, scripting, style, layout and paint |
| End-to-end | The complete user action and a phase breakdown, with every external service and transport cost included, controlled or excluded explicitly |

jsdom, fake timers and isolated function timing do not establish browser input responsiveness. For browser work, wait for the final visible stall, distinguish scheduled timer activity from actual input, and bound synthetic producers so catch-up bursts do not create a different workload. State whether first paint, scrolling, paging, live updates and activated-but-hidden views are covered.

For process, clock, browser-test or asynchronous cleanup mechanics, apply the project's test-reliability rules (when available, use the `dsh-spec-ci-test-reliability` skill).

## Locate the cost

Profile or trace before changing the implementation. Survey the production operation and rank candidates by user impact, occurrence, confidence, resource cost and risk. For each candidate, name the production consumer, repeated work, expected complexity, smallest falsifiable intervention and behavior that must remain stable.

Use phase timings, CPU profiles, allocation or retained-heap samples, I/O, work or call counts, lock contention and scaling across workload dimensions. Follow the production call site through the affected layer. A suspicious loop, unused cache or large payload is a hypothesis, not a bottleneck. Keep neighboring evidence that distinguishes latency, throughput, transient allocation and retained memory. When several causes are plausible, compare their controlled removal or a small candidate for each on the same workload before choosing.

## Change and prove one cause

Capture the unoptimized baseline before editing production code and record its command, revision, runtime, platform, fixture dimensions, raw samples and verdict. Reduce a failing scenario until it still exercises the real bottleneck, then rank falsifiable hypotheses before changing code. Change one causal factor at a time and rerun the focused scenario and its end-to-end parent. Use a negative control that makes the targeted cost reappear in the original implementation or a controlled reintroduction; without one, distinguish correlation from an effect. Prefer the smallest intervention that can falsify the suspected cause, then keep the largest confirmed safe contribution rather than stopping at the first partial gain.

These patterns are candidates to measure, not automatic optimizations:

- Keep compact representations compact through downstream readers; avoid per-event or per-delta objects when the consumer needs settled content or one aggregate.
- Remove duplicate parsing, copying, freezing, validation or formatting only after identifying the ownership and trust transition that made it necessary. Typed same-process reuse does not authorize weakening durable or wire parsing.
- Stream artifact or result transformations and bound intermediate state instead of retaining every generation. Preserve publication, verification and writable-readiness obligations where the operation requires them.
- Separate read-only preparation from write or publication work only when no awaited correctness boundary moves.
- Defer inactive or collapsed work, while measuring first activation, retained state and disposal. Deferral is not deletion, and viewport highlighting is not full virtualization.
- Stabilize identities and narrow subscriptions so one changed node does not invalidate the whole collection. Preserve update ordering, the immediate initial event and an equivalent teardown for every collection or scoped listener.
- Use a suitable data structure instead of repeated shifting, scanning or rebuilding, and measure the whole consumer path.
- Use revision-keyed reuse or singleflight only with explicit invalidation, bounded retention, independent waiter cancellation and disposal ownership. Do not cache expanded representations merely to make repeated benchmarks look fast.

Reject the change when the gain disappears on the parent path, falls inside measurement noise, materially regresses a typical workload, adds complexity disproportionate to the result, or leaves cancellation, retention or durability unexplained and untested. Record the rejected hypothesis briefly and keep a short ranked follow-up list instead of widening the current change.

## Preserve behavior and resources

Performance evidence complements functional evidence. Run or add the owning checks for output, ordering, paging, stream indexes, errors, retries, concurrency, cancellation, durability, retention, disposal, released-state immutability, atomic publication and writable readiness as applicable. Keep model-visible, logged, persisted and wire output equivalent unless a difference is deliberately authorized, and do not silently truncate or omit nested or large results.

A deliberate visible difference states what changes, why the same result still counts and which project-owned snapshot, output check, recording or rendered evidence proves it. Performance does not authorize truncating results, skipping validation, serving stale data, moving awaited work past a correctness boundary, changing lifecycle semantics or leaving unbounded retained state. Keep functional expectations independent of benchmark internals; a benchmark needs enough evidence to reach the real endpoint, not a second semantic test suite.

## Route supporting work

Delegate independent measurement domains when breadth helps and an isolated capability is available; delegated work still requires measurements and production call sites, not guesses. A required result must remain complete without delegation; keep the work in the main context when no isolated route exists.

Record lasting performance rationale, rejected hypotheses, calibration choices, exclusions and remaining risks in the project's decision-record mechanism (when available, use the `dsh-spec-agent-notes` skill). Check the owning notes for supersession without turning the task into a corpus-wide prose cleanup. Keep the reusable procedure in this skill and scenario-specific truth with the owning measurement or benchmark.

When a task explicitly uses stacked change requests, choose the layers before editing and use the project's official stack mechanism and separate worktrees when available. A benchmark-protection layer can establish the baseline gate; the optimization layer carries the causal fix, functional coverage and any tightened budget; independently measured bottlenecks may form separate stacks. Fix a finding in its owning layer before propagating it upward (when available, consider using the `dsh-spec-merging-stacked-prs` skill).

Select the outgoing checks through the project's local-evidence policy (when available, use the `dsh-spec-pre-push-checks` skill), report only executed evidence and inspect CI where available. Treat local timing as local evidence, not proof that the CI or gate runner is stable. Evaluate review findings, including bot reports, against the code and executable evidence; reply with the reason or fix and resolve addressed threads.

## Report the result

Report:

```text
Operation and completion:
Command, revision, runtime, platform and workload:
Benchmark samples and aggregate:
Project gate and result:
Profile attribution:
End-to-end result:
Bottleneck and change:
Behavior and resource evidence:
Authorized differences:
Negative control:
Checks:
Exclusions and remaining risk:
Decision and follow-ups:
```

Separate historical claims, fresh local measurements, production telemetry, gate results and CI evidence. State excluded costs, unmeasured scenes, sampling limits and any missing capability. Stop at the agreed operation and causal fix.

For a slow, flaky or resource-contended test suite, apply the test-focused investigation (when available, use the `dsh-spec-ci-test-reliability` skill). For rendered browser acceptance, follow the project's evidence policy (when available, consider using the `dsh-spec-client-ui-ux` skill).
