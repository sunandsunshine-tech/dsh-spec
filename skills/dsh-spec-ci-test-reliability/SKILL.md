---
name: dsh-spec-ci-test-reliability
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
description: "Use when designing, reviewing, or diagnosing slow, over-broad, or unstable automated tests and fixtures that can fail under CI concurrency, shared host resources, clocks, process-global state, subprocesses, network listeners, or asynchronous teardown. Not for general test plans, product QA checklists, or coverage-only work. 用于设计、评审或诊断过慢、范围过大，或在 CI 并发、共享主机资源、时钟、进程全局状态、子进程、网络监听或异步清理条件下可能不稳定的自动化测试与 fixture；不用于普通测试计划、产品 QA 清单或单纯覆盖率工作。"
---

# Reliable tests

Build tests that remain correct in the project's real execution topology, not only when run alone on a quiet workstation. This skill owns isolation and reliability decisions; it does not select every command a push needs.

## Defaults

Apply this skill's use-site default only when neither the request nor existing project instructions choose one. Treat existing instructions as authoritative read-only input; do not ask for, create, modify, or copy instructions merely to select a default.

## Read the owning rules

Read the project's standing instructions and the documents they name for test tiers, architecture, lifecycle, and CI. Read the active test-runner configuration and CI workflow when worker counts, jobs, runners, environment variables, or teardown affect the case.

Separate test design from command selection: after the design is sound, use the project's check-selection practice (when available, use the `dsh-spec-pre-push-checks` skill).

## Model the execution topology

Assume these layers can overlap unless the active configuration proves otherwise:

1. Cases in one test file.
2. Separate files or worker processes.
3. Independent test or repository-gate processes in one job.
4. CI jobs whose runners share one host.

Process isolation does not isolate host ports, predictable filesystem paths, external services, databases, sockets, caches, or inherited child processes. For every acquired resource, identify its owner, atomic allocation mechanism, observable readiness signal, registered cleanup, and quiescent completion signal.

Do not serialize an entire suite because one fixture lacks isolation. Narrow the exclusive scope or change the allocation first.

## Allocate resources atomically

Use the resource owner's allocator instead of checking availability and claiming it later.

- Ask the operating system for a loopback port and read the assigned address only after the listener reports readiness. Never scan for a free port and bind it later.
- Create private per-test temporary roots with the platform's atomic temporary-directory operation. Do not acquire predictable shared paths.
- Give shared databases, sockets, sessions, caches, and output locations unique per-test namespaces.
- Use exclusive creation where a path must not already exist.
- Keep stable recorded identifiers separate from ephemeral transport addresses. Translate inside the fixture instead of forcing the live resource to use the recorded value.

Literal paths and URLs used only as parser inputs or expected values are not acquired resources.

## Contain process-global state

Treat environment variables, working directory, clocks and timers, locale and time zone, module mocks, registries, console hooks, global objects, and global network interception as exclusive mutable resources.

Prefer an injected dependency or instance-local adapter. When mutation is required:

- capture whether the original value was absent or present;
- restore that exact state;
- register restoration immediately;
- use `try`/`finally` or the language's equivalent around the smallest mutation scope;
- keep an after-each fallback when failure before local cleanup is plausible;
- intercept the narrowest exact request or call the fixture owns.

## Respect platform-owned semantics

A value the operating system owns does not always round-trip unchanged.

- Restoring a value is safe only when the assertion tolerates restoration failing or preserves the operating system's precision. Read the expected value afresh when exact round-trip equality matters.
- Environment names can be case-insensitive on one platform.
- File handles can be released asynchronously, so an apparent immediate rename or removal can be retried within a measured bound.
- Permission and signal behavior differ across operating systems. A platform-specific case takes an explicit skip with a reason, rather than weakening the assertion everywhere.

Prefer an observation that holds on every supported platform.

## Design the smallest sufficient test

By default, split a mixed test into fast contract cases and one shared real-resource scenario, and run expensive evidence only in a lane where the result can differ.

For a deterministic test, elapsed time is first a property of test design, not a budget to raise. Before changing a timeout, remove repeated work or move evidence to the narrowest sufficient layer:

- keep fast contract and preflight cases independent of expensive browsers, media, containers, or real services;
- create one expensive fixture per owning scenario instead of rebuilding it for every case;
- use the smallest input that can expose the intended regression;
- run an expensive integration or evidence scenario once on a representative CI lane unless portability requires another run;
- split a test that repeats the same slow assertion across many tiny variations, or collapse the variations into one table-driven contract with one external execution.

Do not multiply every test group's timeout because one group is slow.

## Budget timeouts against the lane

A per-case timeout overrides the runner or job budget instead of yielding to it. A suite bound by process creation takes the lane budget; a tighter value states why it is tighter.

When a budget must change, size setup and teardown with the named work because they pay the same contention; otherwise moving only the case budget relocates the failure. Where a timeout is the subject, keep the outer wait far larger than the timeout under test.

## Synchronize on state

A fixed sleep is not evidence that setup completed or cleanup settled.

- Wait for an explicit readiness event, handshake, state transition, owned promise, or externally observable condition.
- Use deferred results or barriers to place a race at a deterministic point and prove the relevant operations overlap.
- Use a timeout only to bound a wait, never as the condition that makes the assertion correct.
- Do not assert scheduler-dependent ordering unless that ordering is required behavior.
- When time is the subject, inject or fake the clock and always restore real time.

## Dispose to quiescence

Register cleanup immediately after acquisition so assertion failures also release the resource. Cleanup stops new callbacks or requests, detaches listeners, restores global hooks, terminates owned work, and waits for child exit, server close, worker termination, or the equivalent completion signal.

Calling an abort, close, or kill operation without waiting for owned completion is incomplete teardown. When late completion is possible, prove that disposal prevents it from mutating another test.

## Prove the intended regression

- Observe an ordinary regression fail before the fix when practical.
- For a new static or corpus guard, introduce the rejected case and observe the intended failure.
- For a race, use barriers to prove overlap; repeated execution alone is not a race test.
- For ports, sockets, shared paths, subprocesses, or other host resources, run independent test processes concurrently when cross-process isolation is the fix.
- If a child process has its own deadline, assert that no signal or timeout ended it before checking its exit status.
- Verify external state, events, files, logs, exits, or disposal instead of trusting the component's self-report.

Stress runs supplement a deterministic regression; they do not replace one.

## Reject flake-masking fixes

Do not present these as root-cause fixes for a reproducible local test:

- increasing a timeout without identifying the awaited state;
- adding retries;
- making all files serial;
- swallowing an error or unhandled rejection;
- weakening an assertion;
- normalizing away unstable behavior;
- adding a sleep before cleanup or an assertion.

Retries remain valid for documented transient external-provider tests under the project's external-service policy. Keep that exception at the external boundary.

Restoring a budget is not masking when it returns what the lane already granted and names the awaited work. A bounded retry is valid only for measured contention and must not hide a deterministic defect.

## Diagnose existing flakes

For an existing probabilistic test or CI failure, read [the CI flake diagnosis workflow](references/ci-flake-diagnosis.md). A diagnosis-only request stays read-only until the user also authorizes repair. Report the cause and evidence unless the user also asks for a fix.

## Validate and report

Run the smallest focused regression for the affected behavior. Add topology-specific evidence only when the change owns that risk:

- global mutation needs restoration evidence;
- lifecycle or subprocess work needs quiescent-teardown evidence;
- ports, sockets, or shared paths need concurrent independent-process evidence;
- a new guard needs a negative control.

Report exact commands and observed results. Do not describe retries, skipped cases, or pending CI as passing.
