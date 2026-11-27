# Agent Note: Reforge performance as dsh-spec-speed-up-perf

Status: implemented

English | [中文](2026-11-25-reforge-performance-as-dsh-speed-up-perf.zh.md)

## Problem

The former `dsh-spec-performance-investigation` skill kept the main measurement sequence but compressed responsibilities whose distinction changes the result: benchmark, gate, profiling and evidence boundaries; project-selected tools; measurement semantics; identity and privacy constraints; ambient dependencies; cold-start and process-memory handling; permitted behavior differences; and explicit evidence limits. Its name also dropped the upstream semantic stem, weakening provenance.

## Decision

The package ships `dsh-spec-speed-up-perf`, a generalized port of `.agents/skills/dsh-speed-up-perf/SKILL.md` from DeepSeek Harness `dsh-v0.2.3-alpha.2` (`4b399c39a6d1479cd84ca591b4d7c88e24d38a96`), read on 2026-11-26. It supersedes and consolidates the former performance-investigation record and applies [Single-source ports retain their upstream semantic stem](../../proposed/architecture/2026-11-25-single-source-ports-retain-upstream-semantic-stem.md). The former source and installed directories are removed without an alias.

Tracking: #166 (parent #135). Pull request: #179.

### Settings

| Setting | Value |
|---|---|
| Name | `dsh-spec-speed-up-perf` |
| Goal | Establish a measured production-path performance result, locate its cost, and deliver a behavior-preserving optimization or supported diagnosis |
| Boundary | Not a benchmark platform, universal threshold, test-reliability workflow, general code review, visual-design process, capacity model or guarantee that a local gain changes the user path |
| Deliverable | `skills/dsh-spec-speed-up-perf/SKILL.md` and `THIRD_PARTY_NOTICES`, its installed mirror, development eval corpus and evidence, this record and its Chinese pair |
| Audience and domain | An agent working on a software project with a backend, browser, CLI or end-to-end runtime path |
| Runtime and tools | No shipped runtime dependency; the adopter's production entry and measurement facility determine the available tools |
| Delivery language | English with Chinese trigger language appended to the description |

### Source constraints

| Unit | Upstream location | Constraint |
|---|---|---|
| S01 | L3 | Activate for investigation or optimization, comparable benchmarks or gates, profiling, responsiveness, and measured behavior-preserving fixes |
| S02 | L8 | Turn a broad request into reproducible user-path measurement and bounded fixes; survey broadly, follow measured cost, reject attractive changes that do not improve the workload users run, and treat guidance as neither a quota nor a script |
| S03 | L12 | Read standing instructions, architecture, testing policy, defensive patterns, package guidance and owning notes before judging the operation |
| S04 | L12 | Apply the project's process, clock, browser-test and asynchronous-cleanup reliability rules where measurement depends on them |
| S05 | L14 | Agree on the endpoint, workload range, host and resource constraints, permitted visible differences and stopping rule |
| S06 | L14 | Keep backend, browser and end-to-end evidence distinct; internal speed does not prove transport, paint, scrolling or input response, and isolated local overhead must name excluded model, network or service costs |
| S07 | L16 | Inspect the exact base, source, tests and resolved review threads; distinguish merged, closed-unmerged, superseded, estimated and newly measured evidence; use history as a lead, not authority |
| S08 | L20 | Delegate independent measurement domains only when breadth helps, and still require measurements and production call sites from delegated work |
| S09 | L22-25 | Survey lifecycle moments with different costs: cold start, first use, warm or re-entry, typical and tail data, repeated activation or navigation, live update, cancellation and teardown |
| S10 | L27 | Vary independent cost drivers separately, accept tiny repeated inputs only when realistic, include typical and tail workloads, and avoid matrix cells that cannot change a decision |
| S11 | L22-25, L33, L49 | DSH Session, history, Client, transport, Web, supported profile, repository benchmark path and Node or browser harness referents are product-specific |
| S12 | L29 | Rank candidates by user latency, CPU or allocation, retained memory, occurrence and confidence; name the production consumer, repeated work, expected complexity, smallest falsifiable intervention and behavior that must remain stable; a suspicious loop, cache or file is only a hypothesis |
| S13 | L33 | Reuse and extend the project's benchmark and gate facilities rather than creating competing calibration or reporting infrastructure; keep package-local diagnostics with their owner and cross-boundary cases with the measured path |
| S14 | L35 | With authorization, use corpora or telemetry only in aggregate; never retain raw prompts, outputs, paths, identities, credentials, recordings or recognizable snippets; generate fixed inputs from reviewed constants with no dependence on a home, ambient repository, network service or private data |
| S15 | L37-47 | Before implementation, record the exact operation and completion condition; workload dimensions, distributions, construction seed or constants and why they cover typical and tail use; production calls, composition, built artifact and mocked external boundaries; included or excluded setup, cold or warm state, timing endpoints and excluded costs; reachable endpoint objects, baseline, collection policy and retained-versus-transient limits; all raw samples, chosen aggregate, project gate, calibrated absolute and ratio, memory limits and negative control; and owning functional checks plus every authorized visible difference |
| S16 | L49 | Measure the built artifact through the target runtime and browser path; loader or development-only overhead is not the shipped path |
| S17 | L49 | Do not add a production export solely for measurement or copy the production algorithm into a benchmark implementation |
| S18 | L51 | Cold or process-memory runs use fresh children and private roots; warm runs retain intended cache only and fixture setup must not warm a cold case; preserve input, validation, completion and retained-output parity; do not compare retained, validated output with a parse-and-discard case |
| S19 | L53 | Use existing time calibration and reviewed variance headroom; do not scale bytes, counts or dimensionless ratios by processor speed |
| S19a | L53 | Manual browser diagnostics stay threshold-free; a browser timing gate needs an explicit lane decision and repeated runs on its actual gate browser and runner; the Node machine multiplier alone is not browser calibration |
| S19b | L53 | Budgets are source constants; never widen a budget or select a lucky run; serialize measured work against owned CPU-heavy jobs and compare sides under comparable conditions |
| S19c | L53 | Report all samples and the aggregate that decides the result |
| S20 | L55 | Measure end-to-end latency separately from phases; distinguish reachable retained memory from transient or peak pressure; faster execution with unbounded retention is not a win |
| S21 | L57 | Browser evidence needs real input through the visible update, the final stall, bounded producers, and an explicit statement of covered paint, scrolling, paging, live and hidden-view scenes; distinguish scheduled timers from actual input, and do not treat Node folds, fake DOMs or custom heartbeat events as browser responsiveness |
| S22 | L61 | Record the unoptimized baseline command, revision, runtime, platform, fixture, samples and verdict; reduce a failing scenario to the real bottleneck and rank falsifiable hypotheses before patching; use profiles, allocation samples, work counts or phase timings to distinguish them |
| S23 | L63 | Treat the following optimization patterns as hypotheses to measure, not automatic prescriptions |
| S23a | L65 | Keep compact representations compact through downstream readers; avoid per-delta objects when the consumer needs settled content or one aggregate |
| S23b | L66 | Remove duplicate parsing, copying, freezing or validation only after identifying the actual ownership and trust transition; typed same-process reuse does not permit weakening durable or wire parsing |
| S23c | L67 | Stream artifact transformations and bound intermediate state instead of retaining every generation; preserve publication, verification and writable-readiness obligations where required |
| S23d | L68 | Separate read-only preparation from write or publication work without moving awaited work past a correctness-required endpoint |
| S23e | L69 | Defer inactive or collapsed work, but measure first activation and retained state; deferral is not deletion, and viewport highlighting is not full virtualization |
| S23f | L70 | Stabilize identities and narrow subscriptions so one changed node does not invalidate the whole collection; preserve update ordering and immediate initial-event behavior |
| S23g | L71 | Prefer suitable data structures to repeated shifting, scanning or rebuilding, and measure the whole consumer path rather than an isolated container operation |
| S23h | L72 | Use revision-keyed reuse or singleflight only with explicit invalidation, bounded retention, independent waiter cancellation and disposal ownership; never cache expanded representations merely to make repeated benchmarks appear faster |
| S24 | L74 | Change one causal factor, rerun focused and parent paths, require a negative control, and reject gates that admit regressions or sit below verified noise |
| S25 | L78 | Performance complements functional evidence; preserve output, ordering, paging, stream indexes, errors, cancellation, concurrency, disposal, immutability, atomic publication, validation, writable readiness and retained results; keep model-visible, logged and wire output equivalent, and do not silently truncate results, skip tool results or change lifecycle semantics |
| S26 | L80 | Name authorized visible differences and their owning evidence; keep functional expectations independent from benchmark internals; a benchmark is not a second semantic test suite |
| S27 | L82 | Reject end-to-end gains that disappear, typical regressions, disproportionate complexity, or unexplained cancellation, retention or durability; record rejected hypotheses briefly |
| S28 | L86 | Use the project's decision-record mechanism, check supersession, keep the reusable procedure here and keep scenario-specific truth with its benchmark or package owner |
| S29 | L88 | Choose stack layers before editing, use the project's official stack mechanism and separate worktrees when available, and keep each layer mergeable: a benchmark layer can protect the measured baseline; the optimization layer carries its fix, functional coverage and any tightened budget; independent bottlenecks may use separate stacks; fix a finding in its owning layer before propagating it |
| S30 | L90 | Select outgoing checks, report only executed evidence, inspect CI instead of equating local timing with runner stability, and evaluate human and bot findings against code and executable evidence |
| S31 | L92 | Report workload, before and after absolute values with ratio, endpoint and memory semantics, behavior, negative control, exact checks and exclusions; separately label author-reported historical numbers, fresh local measurements and CI evidence; stop at the agreed scope and retain a short ranked follow-up list |

### Dispositions

| Unit | Disposition | Target | Basis |
|---|---|---|---|
| S01 | adapt | Description; Frame; Locate | Generic runtime paths and performance dimensions replace DSH product triggers |
| S02 | keep | Opening; Frame; Locate; Change | Reproducible measurement and bounded evidence remain the purpose |
| S03 | re-bind | Frame the operation | The DSH authority list becomes the adopter's standing instructions and local agreements |
| S04 | re-bind | Frame; Choose the measurement surface | DSH process, clock, browser-test and cleanup links become the project's equivalent reliability rules |
| S05 | keep | Frame the operation | The agreed operation, constraints, differences and stopping rule remain authoritative |
| S06 | re-bind | Frame; Choose the measurement surface | DSH Session, transport and Web examples become a project-owned surface and boundary statement |
| S07 | re-bind | Frame; Report the result | The DSH merge/review sources become the project's current source, review and evidence-history mechanism |
| S08 | keep | Locate the cost; Route supporting work | Delegation remains optional and measured work remains required |
| S09 | re-bind | Frame; Locate | DSH Session and Web lifecycle examples become a generic lifecycle survey |
| S10 | re-bind | Frame; Record measurement semantics | DSH-specific quantities become independently varied project workload dimensions |
| S11 | re-bind | Decision boundaries; no script | Exact DSH objects, paths, profile and harness names do not ship; S06 and S16 supply the generic replacements and their checks |
| S12 | keep | Locate the cost | Candidate ranking and falsifiable evidence remain direct requirements |
| S13 | re-bind | Keep measurement decisions distinct; Route supporting work | The DSH benchmark lane becomes the project's owned measurement and placement mechanism |
| S14 | keep | Frame the operation | Aggregate-only corpus use and reviewed constants remain direct requirements |
| S15 | keep | Record measurement semantics | The measurement card and verdict fields remain direct requirements |
| S16 | re-bind | Frame; Choose the measurement surface | Built DSH JavaScript and profile become the project's built artifact and target runtime |
| S17 | keep | Frame the operation | Measurement must not create a benchmark-only API or copied algorithm |
| S18 | keep | Record measurement semantics | Fresh-process, cache and retained-output parity remain explicit |
| S19 | re-bind | Keep measurement decisions distinct | Repository time calibration becomes the project's declared calibration policy |
| S19a | re-bind | Keep measurement decisions distinct; Choose the measurement surface | DSH browser lanes become explicit project lanes, runners and browsers |
| S19b | keep | Keep measurement decisions distinct; Record measurement semantics | Budget ownership, serialization and anti-selection rules remain authoritative |
| S19c | keep | Change and prove one cause; Report the result | The deciding samples, aggregate and their evidence remain direct reporting requirements |
| S20 | keep | Frame; Record measurement semantics; Preserve behavior and resources | End-to-end and retained-memory semantics remain direct requirements |
| S21 | re-bind | Choose the measurement surface | DSH-specific Node folds, fake DOMs and heartbeat events become jsdom, fake timers and isolated function timing as excluded substitutes |
| S22 | keep | Change and prove one cause; Report the result | Baseline, scenario reduction and hypothesis ordering remain direct requirements |
| S23 | keep | Change and prove one cause | Optimization patterns remain hypotheses, not prescriptions |
| S23a | keep | Change and prove one cause | Compact settled values and avoidance of per-delta objects remain direct requirements |
| S23b | keep | Change and prove one cause | Ownership-aware deduplication and the durable or wire parsing boundary remain direct requirements |
| S23c | keep | Change and prove one cause; Preserve behavior and resources | Bounded streaming stays an optimization pattern; publication, verification and writable-readiness remain behavior and resource obligations |
| S23d | keep | Change and prove one cause | Preparation separation may not move an awaited correctness boundary |
| S23e | re-bind | Change and prove one cause | Inactive-view and collapsed-detail work becomes generic inactive or collapsed work while first activation, retained state and virtualization limits remain direct requirements |
| S23f | re-bind | Change and prove one cause | Whole-history subscription invalidation becomes whole-collection invalidation while stable identity, ordering and immediate delivery remain direct requirements |
| S23g | keep | Change and prove one cause | Data-structure and whole-consumer-path requirements remain direct |
| S23h | keep | Change and prove one cause | Reuse invalidation, retention, cancellation, disposal and the cache-inflation ban remain direct requirements |
| S24 | keep | Change and prove one cause | Causal controls and noise-aware gates remain direct requirements |
| S25 | re-bind | Preserve behavior and resources | DSH lifecycle referents become the owning project's output, state and publication contracts |
| S26 | re-bind | Preserve behavior and resources | DSH keyless snapshots and GIF evidence become the project's owning functional and rendered evidence |
| S27 | keep | Change; Route supporting work | Rejection criteria and rejected-hypothesis recording remain direct requirements |
| S28 | re-bind | Route supporting work | DSH Agent Note rules become the project's decision-record mechanism while reusable procedure stays here |
| S29 | re-bind | Route supporting work | DSH GitHub stack and worktree mechanics become the project's available official stack mechanism |
| S30 | re-bind | Route supporting work | DSH pre-push and review links become the project's evidence selection, CI and review platform |
| S31 | keep | Change and prove one cause; Report the result | The bounded result summary, evidence labeling and ranked follow-up list remain direct requirements |

The generalized skill carries the candidate patterns as testable hypotheses: compact settled values, ownership-aware deduplication, bounded streaming, preparation/publication separation, inactive-work deferral, stable identity with ordered immediate delivery and teardown, suitable data structures, and bounded revision-keyed reuse with invalidation. Expanded or speculative caches remain forbidden when they only make repeated benchmarks look faster.

### Rulings

- **The semantic stem is retained.** The direct generalized port is named `dsh-spec-speed-up-perf`, not an intent-based replacement and not an alias.
- **Measurement decisions remain distinct.** A benchmark supplies comparable samples, a gate applies a project-owned rule, a profile attributes cost, and evidence records the decision and its limits. None substitutes for another.
- **Tools belong to the project and environment.** A missing browser, profiler or measurement facility produces a handoff; the skill does not download, install or assume a substitute.
- **No threshold is universal.** With no project budget, report absolute values and the ratio. With a declared gate, keep its source value and derive any new gate from repeated workload noise.
- **The sampling default applies only when policy is silent.** One warm-up and at least five measured samples per side are the fallback; tail or noisy work needs more.
- **Cold start and memory have different semantics.** Cold runs use fresh processes; retained reachable state is separate from transient allocation, allocator high-water behavior and peak pressure.
- **Stable identity and ordering survive narrower delivery.** A row-scoped or equivalent subscription can reduce invalidations only while preserving unchanged identities, collection order, update ordering and the immediate initial event.
- **A visible difference requires authorization and its owning evidence.** Performance does not implicitly permit output, log, wire or lifecycle changes.
- **The skill ships without infrastructure.** Performance workflows vary by language, profiler and runtime; a bundled benchmark would encode a toy path or become the platform the skill excludes.
- **The test-reliability boundary is semantic.** User-path latency, throughput, responsiveness and retained memory belong here. Slow, flaky or resource-contended test execution stays with test reliability.
- **Evidence types remain labeled.** Historical claims, fresh local measurements, production telemetry, project gate results and CI evidence are not interchangeable.

### Verification

| Requirement | Anchor | Evidence |
|---|---|---|
| Agent Skills format, links and description budget | Mechanical | `verify-skill-spec.mjs` reports 13 checks passed; `SKILL.md` is 145 lines, about 4,967 estimated tokens and the description is 481 BMP characters |
| Production operation, benchmark/gate/profile separation, defensive and test-reliability rules, independent cost drivers, calibration and runner validation, gate serialization, scenario reduction, cold-start and memory semantics, privacy, pattern safeguards, cache-inflation ban, functional and resource preservation, reusable-procedure ownership, stacked-layer obligations and evidence labeling | Judged | `SKILL.md` against S01-S31 including S23a-S23h and the current behavior evidence |
| Runnable fixture boundaries | Mechanical | `speed-up-perf fixtures expose runnable production paths and measurement boundaries` passes the measurement, browser-build, end-to-end, cold-start, identity and authorized-difference fixtures |
| Current behavior evidence | Judged + Mechanical | Eight candidate scenarios pass all 45 assertions under `tests/skill-evals/evidence/2026-11-26-issue-166/dsh-spec-speed-up-perf/`; each retains its scenario, inputs, skill hash and execution profile. `measurement-decisions` retains a same-harness seven-sample cache-only intermediate that isolates the duplicate-scan cost |
| No-skill comparison | Judged + Mechanical | The target-absent arm performs the same basic optimization and passes 5 of 6 assertions because it also lacks the required negative control; the matched failure bounds the capability claim |
| Trigger precision | Judged + Mechanical | Six positive and seven near-miss probes match the expected selection marker under the new name and description, including benchmark/gate/profile and capacity-model boundaries |
| Repository integration | Mechanical | `check:corpus` covers 16 skills, 57 notes, 59 pairs, sibling references, the archive and vendored notices; the full functional suite passes 590/590; static, bundle and notice checks pass |
| Provenance | Mechanical | The skill notice names the upstream source, pin, semantic-stem relation and generalized dispositions |

### Capability conclusions

The browser-present and browser-absent branches both have current model evidence. The browser-present run used a temporary Chrome for Testing installation outside the repository; the browser-absent run masked access. The skill never installs either capability.

Delegation is an optional execution route. With isolated execution available, independent measurement domains may be delegated when breadth warrants it. Without it, the required result remains complete in the main context; missing isolation is not a handoff condition. The current behavior runs disable subagents, so they exercise the capability-absent route and do not claim delegated fan-out evidence. A future broad multi-domain task is the resumable evidence path for the capability-present route.

### Pages read

Read on 2026-11-26:

- `https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/4b399c39a6d1479cd84ca591b4d7c88e24d38a96/.agents/skills/dsh-speed-up-perf/SKILL.md`
- `https://agentskills.io/llms.txt`
- `https://agentskills.io/specification.md`
- `https://agentskills.io/skill-creation/best-practices.md`
- `https://agentskills.io/skill-creation/optimizing-descriptions.md`
- `https://agentskills.io/skill-creation/evaluating-skills.md`

### Risks and rollback

- The general text can become generic “profile before optimizing” advice if later runs do not preserve the benchmark, gate, profile and evidence distinctions.
- The no-skill baseline already solved the small backend fixture, so the established value is consistent evidence discipline and capability boundaries rather than a better basic optimization.
- The five-sample default is too small for some tail or noisy workloads; the skill requires more samples and never treats the minimum as statistical certainty.
- Browser timing depends on the supplied Chrome build and host rendering path; the current headless software-rendering evidence does not establish every GPU or compositor path.
- Rollback is restoration of the former skill directory and installed mirror, removal of the new eval/evidence identity, and restoration of the former record. Historical evidence remains historical either way.

## Alternatives considered

**Copy the upstream skill almost verbatim.** It preserves every upstream responsibility, but carries DSH paths, budgets, calibration and product workflows into unrelated projects.

**Keep the former generalized text and rename it only.** It fixes discoverability, but leaves the measurement and evidence boundaries that motivated the reforge unchanged.

**Drop DSH infrastructure without a responsibility map.** It avoids ecosystem-specific assumptions, but can silently lose the reason each benchmark, gate, profile or evidence step exists.

**Ship a benchmark script and universal timing schema.** It loses because a useful benchmark must use the adopter's real entry and workload; a language-neutral script would encode a toy path or grow into the platform this skill explicitly avoids.

**Merge performance work into test reliability.** It loses because suite duration and flakiness concern test execution topology, while user-path latency, throughput and responsiveness require production measurements.

**Add a separate reference for backend, browser and end-to-end modes.** It loses because the skill is short enough for one entry point, and the shared measurement, control and evidence contract matters more than three disconnected playbooks.

## Consequences

- The shipped corpus remains at 16 independently installable skills while gaining a recognizable direct-port name.
- The former directory and its installed mirror are absent; there is no compatibility alias or duplicate owner record.
- Current trigger and affected-behavior evidence bind the renamed skill. PR #129 traces remain historical under their former name.
- The skill deliberately supplies no fixed threshold, profiler wrapper, benchmark harness, DSH path, calibration mechanism, CI lane or universal optimization list.
- Reviewers must judge whether the measured scenario represents the named user operation and whether a deliberate behavior difference was actually authorized.
- Browser timings are local comparative evidence and do not define a universal browser threshold.

### Publish state

The reforge is delivered through draft pull request #179. Merge and release remain unauthorized by this record.
