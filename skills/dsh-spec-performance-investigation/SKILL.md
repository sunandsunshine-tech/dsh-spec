---
name: dsh-spec-performance-investigation
description: "Use when measuring or improving a production user path's latency, throughput, CPU, memory or responsiveness across backend, browser, CLI or end-to-end work. Covers comparable baselines, profiling, candidate ranking, behavior-preserving optimization, negative controls and evidence. Not for test flakiness, coverage, general code review or visual design. 用于调查或改进生产用户路径的延迟、吞吐、CPU、内存或响应性，覆盖后端、浏览器、CLI 和端到端流程；包含可比基线、剖析、候选排序、保持行为的优化、负控制和证据。不用于测试不稳定、覆盖率、通用代码审查或视觉设计。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
---

# Performance investigation

Turn a vague “make it faster” request into measurements on a production user path and a bounded, behavior-preserving change. This is investigation guidance, not a performance quota or benchmark framework.

A diagnosis-only request stays read-only. Modify code, tests or configuration only when the user also authorizes an optimization.

## Defaults

Apply this skill's use-site default only when neither the request nor existing project instructions choose one. Treat existing instructions as authoritative read-only input; do not ask for, create, modify, or copy instructions merely to select a default.

## Frame one operation

State the user action, externally observable completion condition, workload, runtime, build revision and stopping rule. Include the typical workload and the tail dimensions that matter. Define which behavior may not change.

Use the production entry, built artifact and validation that users actually exercise. A benchmark-only copy of the algorithm, a parse-and-discard baseline or a component microbenchmark does not establish performance of its parent path.

If no reproducible operation or measurement path exists, give the smallest measurement plan and name the missing capability or input. Do not turn source intuition into a measured result. When the host masks a browser, profiler, service or other required measurement capability, use only tooling already available under the request or project policy; do not download, install or start a substitute to bypass that constraint, and hand off the missing measurement instead.

## Choose the measurement surface

| Path | Default evidence |
|---|---|
| Backend or CLI | Phase timing through the real handler or executable, plus relevant CPU, allocation, I/O, query/call counts and percentile latency or throughput |
| Browser | A real input in the built application through the visible UI update; use browser performance traces or timing APIs to separate network, scripting, style/layout and paint |
| End-to-end | The complete user action with a phase breakdown; state which external services or transport costs are included, controlled or excluded |

Measure end-to-end latency separately from component phases. Faster iteration, serialization or rendering inside one component does not prove a faster request, page or workflow. jsdom, fake timers and isolated function timing do not establish browser input responsiveness.

## Establish a comparable baseline

Reuse the project's benchmark, profiling, tracing or production telemetry before adding tooling. When the project declares no sampling policy, run one warm-up and at least five measured samples for each side, interleaving baseline and candidate when practical. Keep every raw sample and report the median with its range; add samples and use the required percentile when tail latency is the target.

Hold workload, inputs, cold/warm state, caches, startup, validation, completion condition and built artifact equal on both sides. Exclude setup or teardown consistently. If conditions cannot be controlled, label the result observational and reduce the claim instead of selecting a favorable run.

Without a project budget, report absolute before and after values and their ratio. Do not invent a pass/fail threshold. When asked for a gate, derive it from repeated measurements and the workload's noise, and keep it at the level that can detect the owned regression.

## Locate the cost

Profile or trace before changing the implementation. Rank candidates by user impact, occurrence, confidence and risk. Useful evidence includes phase timings, CPU profiles, allocation and retained-heap samples, I/O, query or call counts, lock contention, repeated work and scaling across workload dimensions.

Follow the production call site through the affected layer. A suspicious loop, cache miss or large payload is a hypothesis, not a bottleneck. Keep enough neighboring evidence to distinguish latency, throughput, transient allocation and retained memory.

When several causes are plausible in the same operation, compare their controlled removal or a small candidate for each on the same workload before choosing. Function-level self-time can conflate several inlined loops, so use line-level profiles, work counts or a measured comparison rather than the easiest edit. Prefer the smallest intervention that can falsify the suspected cause, but choose the largest confirmed safe contribution rather than the first partial gain. One-factor-at-a-time is a causal discipline, not a requirement to stop after that gain. When the measured beneficiary is a component, also state the parent user path that must improve.

## Change and prove one cause

Change one causal factor at a time. Re-run the focused scenario and the end-to-end user path. Use a negative control that makes the targeted cost reappear in the old implementation or a controlled reintroduction; without one, distinguish correlation from an effect.

For caching, name the key, invalidation, bounded retention, concurrency behavior, waiter cancellation and ownership. For batching or streaming, preserve ordering, errors, durability and completion. For deferred work, keep first-use cost, retained state and disposal inside the measured endpoint. These are checks on a candidate, not a list of automatic optimizations.

Reject the change when the gain disappears end-to-end, falls inside measurement noise, materially regresses a typical workload, or cannot preserve resource ownership. Keep a short ranked follow-up list instead of widening the current change.

## Preserve behavior and resources

Performance evidence complements functional evidence. Run or add the owning checks for output, ordering, errors, retries, concurrency, cancellation, durability, retention and disposal as applicable.

Do not reach a number by truncating results, skipping validation, serving stale data, moving awaited work past a correctness boundary or leaving unbounded retained state. Distinguish transient allocation from memory that remains reachable after the operation.

If the request is only that a test suite is slow, flaky or resource-contended, apply the test-focused investigation (when available, use the dsh-spec-ci-test-reliability skill). For user-visible browser acceptance, follow the project's rendered-evidence policy (when available, consider using the dsh-spec-client-ui-ux skill). For the outgoing diff's functional and integration checks, use the project's selection policy (when available, consider using the dsh-spec-pre-push-checks skill).

## Report the result

Report:

```text
Operation and completion:
Revision, runtime and workload:
Baseline samples and aggregate:
Candidate samples and aggregate:
End-to-end result:
Bottleneck and change:
Behavior and resource evidence:
Negative control:
Checks:
Exclusions and remaining risk:
Decision and follow-ups:
```

Separate historical claims, fresh local measurements, observational telemetry and CI evidence. State excluded costs and unmeasured scenes. Stop at the agreed user path and causal fix.
