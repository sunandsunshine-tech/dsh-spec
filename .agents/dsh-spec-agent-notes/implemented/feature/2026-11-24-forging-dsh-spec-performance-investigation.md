# Agent Note: Forging a generic performance investigation skill

Status: implemented

English | [中文](2026-11-24-forging-dsh-spec-performance-investigation.zh.md)

## Problem

Performance requests often begin with “make it faster” and end with a local microbenchmark, an unmeasured optimization or a faster component that does not improve the user operation. The upstream `dsh-speed-up-perf` skill carries a strong investigation sequence, but most of its examples, benchmark infrastructure, product paths, machine calibration and fixed budgets belong to DeepSeek Harness rather than to a software project generally.

## Decision

The package ships `dsh-spec-performance-investigation`, adapted from `.agents/skills/dsh-speed-up-perf/SKILL.md` at `dsh-v0.2.3-alpha.2` (`4b399c39a6d1479cd84ca591b4d7c88e24d38a96`), read on 2026-11-24. The skill turns performance work into one production user operation, a comparable baseline, an observed bottleneck, a single causal change, an end-to-end result, behavior and resource evidence, a negative control, and a bounded report.

The skill is a single `SKILL.md` plus its skill-root notice. It has no script, reference, package or runtime dependency. The Software change and quality group installs it independently from `dsh-spec-ci-test-reliability`, which keeps test-suite flakiness and duration; `dsh-spec-pre-push-checks`, which selects the outgoing checks; and `dsh-spec-code-review`, which judges the implementation against project rules.

### Intent and boundaries

| Setting | Value |
|---|---|
| Name | `dsh-spec-performance-investigation` |
| Goal | Establish a measured production-path performance result, locate its cost and deliver a behavior-preserving optimization or a supported diagnosis |
| Boundary | Not a benchmark platform, universal threshold, test-reliability workflow, general code review, visual-design process, capacity model or guarantee that a local component gain changes the user path |
| Deliverable | `skills/dsh-spec-performance-investigation/SKILL.md` and `THIRD_PARTY_NOTICES`, the installed mirror, development eval corpus and evidence, this record and its Chinese pair |
| Audience and domain | An agent working on a software project with a backend, browser, CLI or end-to-end runtime path |
| Runtime and tools | No shipped runtime dependency; the adopter's production entry and measurement facility determine the available tools |
| Delivery language | English with Chinese trigger language appended to the description |

### Source constraints

| Unit | Upstream location | Constraint |
|---|---|---|
| S1 | Description | Activate on performance investigation and optimization, realistic benchmarks or gates, profiling responsiveness, and measured behavior-preserving fixes |
| S2 | Opening | Turn a broad speed request into reproducible user-path measurement; treat the work as guidance rather than a quota |
| S3 | Establish scope and current authority | Establish the user-visible endpoint, workload, constraints, allowed minor differences, stopping rule and exact current source authority |
| S4 | Survey user paths, then rank candidates | Survey the real operation and rank measured candidates by user latency, CPU/allocation, memory, occurrence and confidence |
| S5 | Build realistic synthetic benchmarks first | Use production entries, fixed realistic workloads, comparable clocks and state, raw samples, behavior checks and project-owned measurement facilities |
| S6 | Prove the regression, then remove work | Capture baseline evidence, compare falsifiable causes, choose the largest confirmed safe contribution, change one causal factor, rerun the parent path and require a negative control |
| S7 | Preserve behavior and resource ownership | Keep output, ordering, durability, cancellation, concurrency, retention and disposal while changing performance |
| S8 | Deliver a bounded, reviewable result | Report workload, before/after values, endpoint semantics, behavior evidence, negative control, checks and exclusions; reject or follow up weak results |
| S9 | DSH product and benchmark specifics | Session, transport, Web, repository benchmark paths, Node/browser harnesses, machine calibration, fixed budgets and CI lanes are source-specific |

### Dispositions

| Unit | Disposition | Target | Basis |
|---|---|---|---|
| S1 | adapt | Description | General software runtime paths and performance dimensions replace the DSH-only triggers |
| S2 | keep | Opening | The user-path measurement purpose and non-quota boundary survive |
| S3 | adapt | Frame one operation | Adopter instructions and current production entry replace this repository's documents and authority list |
| S4 | adapt | Locate the cost | Candidate dimensions remain; product Session/Web paths dissolve |
| S5 | re-bind | Establish a comparable baseline | The project's measurement path or production telemetry replaces the DSH benchmark lane; a DSH-style harness is not required |
| S6 | adapt | Change and prove one cause | The measurement sequence survives; named DSH optimization patterns become checks on a candidate rather than prescriptions |
| S7 | keep | Preserve behavior and resources | Output, lifecycle, ownership and resource constraints remain authoritative |
| S8 | adapt | Report the result | The report keeps workload, values, endpoint, behavior, negative control, checks and exclusions |
| S9 | dissolve | Boundaries and no-script decision | No DSH Session, Web, benchmark, calibration or budget mechanism is shipped; the adopter's production evidence takes over |

### Rulings

- **The skill ships without infrastructure.** Performance workflows vary by language, profiler and runtime; a bundled benchmark would narrow the audience. The skill requires a production path and a comparable measurement, not a new framework.
- **The default is measurement before change.** One warm-up and at least five measured samples per side, preferably interleaved, are the default when the project declares no sampling policy. Noisy or tail work requires more samples.
- **No performance threshold is universal.** Without a project budget, the result reports absolute values and ratio; a requested gate must derive from the measured workload and noise.
- **The test-reliability boundary is semantic.** User-path latency, throughput, responsiveness and retained memory belong here. Slow, flaky or resource-contended test execution stays with `dsh-spec-ci-test-reliability`.
- **The skill name reflects the workflow.** It is not named after the upstream DSH product or a fixed benchmark mechanism, and it supports diagnosis without authorizing an optimization.
- **The skill is for consistency, not a guarantee of better optimization.** A no-skill backend baseline already measured, optimized and preserved its output. The additional value is the enforced comparison, negative control, browser and end-to-end boundaries, and capability-absent handoff on work where a capable model can otherwise skip one of them.

### Verification anchors

| Requirement | Anchor | Evidence |
|---|---|---|
| Agent Skills format, links and description budget | Mechanical | `verify-skill-spec.mjs` reports 13 checks passed; `SKILL.md` is 85 lines, ~2,149 estimated tokens and the description is 460 characters |
| Production operation, comparable baseline and report defaults | Judged | `SKILL.md` against S2-S8 |
| Backend, browser and end-to-end behavior | Judged + Mechanical | Three candidate scenarios pass 5/5 each: backend HTTP, browser input-to-frame and end-to-end boundary |
| Capability-absent browser behavior | Judged + Mechanical | The browser-disabled scenario passes 4/4 and hands off the missing measurement path |
| No-skill comparison | Judged + Mechanical | The backend baseline also passes 5/5; it is retained to bound the ROI claim rather than claim unique basic optimization ability |
| Trigger precision | Judged + Mechanical | Five positive and six near-miss probes pass 11/11 under the current trigger corpus |
| Repository integration | Mechanical | `pnpm test` passes 465/465; static checks cover 160 formatted and 152 linted/typechecked files; corpus covers 16 skills, 51 notes and 53 pairs; six bundles and 49 notices are consistent |
| Provenance | Mechanical | The skill notice names the upstream source, pin and generalized relation |

### Pages read

Read on 2026-11-24:

- `https://agentskills.io/llms.txt`
- `https://agentskills.io/skill-creation/best-practices.md`

### Risks and rollback

- The skill can become generic “profile before optimizing” advice if the model eval does not show better measurement, boundary and negative-control decisions than a no-skill baseline. If that happens, do not publish it.
- The backend no-skill baseline already solved the backend fixture. The skill's evidence supports consistent investigation and capability boundaries, not a claim that it finds a better optimization than every capable model on every task.
- The five-sample default is too small for some tail or noisy workloads. The skill requires more samples when needed and never treats the minimum as statistical certainty.
- The included evidence proves representative backend, browser, end-to-end and absent-capability behavior; it does not prove every runtime or profiler.
- Rollback is deletion of the skill directory, installed mirror, notice, eval corpus, documentation rows and this record's unit.

## Alternatives considered

**Carry `dsh-speed-up-perf` nearly verbatim.** It lost because DSH Session, transport, Web, benchmark paths, calibration and fixed budgets would become false requirements for other projects.

**Ship a benchmark script and universal timing schema.** It lost because a useful benchmark must use the adopter's real production entry and workload; a language-neutral script would either encode a toy path or grow into the platform this skill explicitly avoids.

**Merge performance investigation into test reliability.** It lost because suite duration and flakiness concern test execution topology, while user-path latency, throughput and responsiveness require production measurements and behavior-preserving optimization.

**Add a separate reference for backend, browser and end-to-end modes.** It lost because the skill is short enough for one entrypoint and the shared measurement contract is more important than three disconnected playbooks.

## Consequences

- Software change and quality grows from five to six skills, while every skill remains independently installable.
- A project with no benchmark framework still receives a concrete sampling, profiling, negative-control and reporting path.
- The skill deliberately supplies no fixed threshold, profiler wrapper, benchmark harness or universal optimization list.
- Reviewers must judge whether the measured scenario actually represents the named user operation; the skill makes that scope and the exclusions visible.
- A project with only simple performance cases may see no gain over a capable model's default behavior; its stronger value is on cross-layer, capability-constrained or evidence-sensitive work.

### Publish state

The skill is published to `skills/dsh-spec-performance-investigation/` and its installed mirror. The
adopter documentation, notice, eval corpus, candidate evidence and translation pair are part of the
same change. Pull-request publication follows this record's acceptance.
