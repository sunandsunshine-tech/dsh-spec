# Agent Note: Forging dsh-spec-browser-gif-evidence from record-browser-gif

Status: implemented

English | [中文](2026-11-20-forging-dsh-spec-browser-gif-evidence.zh.md)

## Problem

A user-visible browser UI change needs evidence that a reviewer can inspect, but a screenshot or test result does not show the sequence that led to the result. DeepSeek Harness carries that evidence workflow in `record-browser-gif`: one isolated real run, deterministic encoding, artifact inspection and optional pull-request attachment. Its commands, application paths, credentials-provider policy and mandatory every-GUI-PR rule belong to DSH, so carrying the text verbatim would make a general adopter's evidence claims depend on another project's layout.

## Decision

The package ships `dsh-spec-browser-gif-evidence` from `skills/dsh-spec-browser-gif-evidence/`. The skill owns capture, encoding, verification and optional publication; UI acceptance remains with the UI review workflow. A user-visible browser UI change generates GIF evidence by default from one isolated run of the adopter's real build. A project may select equivalent evidence or waive that default for a named change. A fixture exists only when the user explicitly requests it or the project evidence policy selects it; mock transports, synthetic interactions and test-only hooks require an explicit substitute policy.

The evaluation application completes `/save` itself after the declared delay. Capture observes the saving state and waits for that same request; no separate completion endpoint or test-only hook drives the fixture. PR115's fixture run retains one isolated Chrome process, the encoded GIF, capture report, source and QA frames, and the resolved browser/media capability profile. Its retained report does not record explicit fresh-profile provenance.

PR115's real leaf is historical, non-coherent evidence. Its final reports a different origin and GIF byte count from the retained artifact, and its media was regenerated after the model run. The leaf therefore records `evidence_status: historical`, `coherence: non-coherent` and `current_proof: false`; its historical assertion review does not establish behavior at the current head.

The skill carries one focused publication reference and the generated Node bundle `scripts/encode-browser-gif.mjs`; its source lives under `package/dsh-spec-browser-gif-evidence/`. The encoder writes and verifies a temporary GIF, then publishes it only after timing, dimensions, animation and size checks pass. Repository tests exercise the generated entry, stay outside the installed copy, and split fast preflight checks from one shared real-media scenario. The installed copy mirrors the landed directory byte for byte; evaluation inputs remain under `tests/skill-evals/` and never enter either distribution tree.

## Source and settings

Source repository: `deepseek-ai/deepseek-harness`.

Source baseline: `dsh-v0.2.2-rc.5` (`9c2670d3bce5275e0d1610272958121af87787bb`), read on 2026-11-20.

Source files:

- `.agents/skills/record-browser-gif/SKILL.md`
- `.agents/skills/record-browser-gif/scripts/encode_gif.py`
- `.agents/skills/record-browser-gif/scripts/test_encode_gif.py`

| Setting | Value |
|---|---|
| Name | `dsh-spec-browser-gif-evidence` |
| Goal | Produce verified browser-interaction GIF evidence from one isolated run of an adopter's real build |
| Boundary | Does not judge whether the UI design is acceptable, choose the UI states to review, install browser or media tools, or commit evidence media to a branch |
| Deliverable | Skill entry, publication reference, Node encoder bundle, notices and installed copy; repository tests, the Agent Note pair and development evaluation corpus stay outside the deliverable |
| Audience and language | Software teams changing browser-rendered UIs; English delivery with Chinese trigger vocabulary |
| Runtime | Node.js 24.11+ on the 24 line or 26+, Git, `ffmpeg`, `ffprobe`, a runnable build and browser control or a project-declared Playwright fallback |
| Review pages read | Agent Skills index, specification, best practices, evaluating skills and using scripts, read on 2026-11-20 |

## Source constraints

| Unit | Location | Constraint |
|---|---|---|
| B1 | `SKILL.md` description and intro | Record a short, truthful UI demonstration as a GIF; use browser control first and deterministic encoding |
| B2 | Every GUI pull request | A product-user-visible GUI change includes a demonstration GIF; the recording must not substitute fixture or test-only behavior unless explicitly requested |
| B3 | Recording conditions | Use the demonstrated tree's real server, real credentials path and real model flow; report the commit, origin, mode overrides and whether a real model round ran |
| B4 | Separation | Recording and encoding are local; publication is separate and occurs only when the task includes attaching to a pull request |
| B5 | Staging | Build the exact demonstrated commit with fresh scratch state and an isolated browser context; one storyboard comes from one run |
| B6 | Capture | Use three to six meaningful states, semantic locators, verified readiness, stable viewport and one demonstrated page; tool-call evidence exposes identity, status, downstream effect and transient state |
| B7 | Safety | Capture no secrets, personal data, unrelated tabs or notifications |
| B8 | Encoding | Require Python, `ffmpeg` and `ffprobe`; validate timing, dimensions, frame count and maximum bytes |
| B9 | Screenshots | When video is unavailable or a storyboard is requested, capture ordered verified screenshots with identical dimensions |
| B10 | Verification | Inspect the encoded GIF, not only source frames; confirm legibility, final hold and absence of sensitive content |
| B11 | Publication | Use an attachment workflow rather than a committed media file; check the live demonstrated head before and after attachment |
| B12 | Split artifacts | Split oversized evidence into consecutive, non-overlapping parts from the same run |
| B13 | Existing assets branches | Earlier DSH pull-request media lives on repository-specific asset branches |

## Dispositions

| Unit | Disposition | Target | Basis |
|---|---|---|---|
| B1 | Keep | Default, capture, encoding and verification responsibilities | The requirement is provider-neutral |
| B2 | Re-bind | User-visible browser UI changes default to GIF evidence; project override and explicit fixture or substitute policy remain | The universal hard policy belongs to DSH; the target needs a default that can be overridden without silently pretending a substitute is real |
| B3 | Re-bind | Exact commit and tree, adopter-observed real services, explicit real-versus-substitute report | DSH credentials and model-round details are product facts |
| B4 | Keep | Recording is local and publication is separate and task-dependent | The remote-state boundary is domain-neutral |
| B5 | Adapt | Project-declared build/start commands and fresh application and browser state | DSH commands and environment names are values of the generic rule |
| B6 | Keep | Short state story, semantic readiness, stable dimensions, and the observable tool identity, status, downstream effect and transient state needed for a tool-call demonstration | The capture judgment is domain-neutral |
| B7 | Keep | No secrets, personal data or unrelated content | The safety boundary is domain-neutral |
| B8 | Adapt | Node encoder with a temporary output, post-encode validation and atomic replacement | The target's Node toolchain replaces the upstream Python carrier while preserving its timing, frame, size and metadata guarantees |
| B9 | Keep | Ordered screenshots and durations when continuous video is unavailable | The alternate evidence form is domain-neutral |
| B10 | Keep | Inspect encoded output for legibility, order, hold and safety | Encoder metadata does not establish visual quality |
| B11 | Re-bind | Project publication mechanism with GitHub `gh --attach` as an example; live-head checks remain | The review platform and attachment command are adopter facts |
| B12 | Keep | Consecutive non-overlapping parts from one run | The integrity rule is independent of platform |
| B13 | Dissolve | The adopter's own repository history owns its existing media; this skill never mutates legacy assets | The DSH branch names and their maintenance policy do not transfer |

## Rulings

- **The default is capability-dependent.** Missing browser, build, media or publication capability produces an explicit handoff; it never permits a claim that the UI was demonstrated.
- **The demonstrated source is committed.** Capture starts from a clean worktree and records its commit and tree; ignored evidence paths may be created after capture starts.
- **The DSH real-model policy is generalized to real product behavior.** A recording identifies whether the run used the real integrated path, a fixture or another substitute. A substitute requires an explicit user or project-policy choice.
- **UI acceptance is not this skill's decision.** The separate UI review workflow decides coverage and acceptability; this skill produces and verifies the requested artifact.
- **The encoder is shipped rather than reimplemented at runtime.** A deterministic command gives stable validation and avoids repeating the same frame-manipulation logic in an agent's context.
- **Encoder development tests stay in the repository.** Fast command and preflight cases run in the normal suite; one shared real-media scenario checks video timing, screenshot frame order, per-frame duration, loop metadata and safe replacement on Node 26. Installed skills carry no maintenance tests.
- **A skipped media test is not evidence.** The dedicated media entry fails with a clear diagnostic when `ffmpeg` or `ffprobe` is absent instead of treating the absence as a pass.
- **Split output is still one evidence run.** Completion accepts one verified GIF or its ordered, verified parts from the same run, with the media context beside the published embed.

## Verification

| Requirement | Anchor | Evidence |
|---|---|---|
| Agent Skills structure, links and description budget | Mechanical | `verify-skill-spec.mjs` |
| Encoder timing, trim, speed, screenshots, atomic overwrite and size rejection | Mechanical | `tests/browser-gif-encoder.media.ts`: one shared real WebM/PPM scenario runs on Node 26 under real `ffmpeg` and `ffprobe` |
| Command contract and preflight failures without media execution | Mechanical | `tests/cli-contract.test.ts` and `tests/browser-gif-encoder.test.ts` |
| Capture success, disconnect, deadline, atomic publication and cleanup | Mechanical | `tests/browser-gif-capture.test.ts`: a fake CDP browser proves complete publication, prompt rejection after disconnect, a full-run deadline, no partial evidence and no process or profile residue |
| Capability-absent handoff and explicit fixture disclosure | Judged + Mechanical | Clean-context runs under `tests/skill-evals/evidence/2026-11-20-pr115/`; the capability-absent and fixture runs pass 8/8 assertions |
| Installed copy and corpus gates | Mechanical | `skill:refresh`, `check:corpus`, repository-shape tests |
| Existing-media branches | Dissolved | No DSH asset-branch policy is shipped |
| Historical capture of a real UI with a real browser | Judged | The historical real leaf records a review of a three-state headless-Chrome capture, but its final and retained artifact are non-coherent and the leaf is excluded from current proof |
| Model behavior and discovery quality | Judged + Mechanical | The absent and fixture runs pass 8/8 assertions; the historical real run's 4/4 review is non-coherent; eight short trigger probes pass their expected positive or near-miss result |

## Alternatives considered

**Copy the DSH skill and scripts verbatim.** It lost because the DSH build commands, app paths, model policy and mandatory every-GUI-PR rule would become false instructions for a general project.

**Keep the workflow prose-only.** It lost because encoding, final-frame timing, size rejection and post-encode verification are repeatable mechanical obligations that should not be reinvented on each run.

**Keep the upstream Python encoder.** It lost because the package already supports and tests a Node 24/26 toolchain, and the delivered skill should not add a second language runtime for one encoder. The Node implementation preserves the media checks and makes temporary-output publication explicit.

**Make GIF evidence unconditional for every UI change.** It lost because native, terminal, server-rendered or non-browser UIs need project-owned alternatives, and because missing capabilities require a handoff rather than a fabricated requirement.

**Commit GIFs to the change branch.** It lost because every clone then downloads review media; attachment keeps the artifact with the discussion instead of the source history.

**Treat a fixture recording as equivalent to the real flow.** It lost because a reviewer needs to know which behavior the evidence actually proves. A fixture is valid only when requested and labeled.

## Consequences

- A browser UI change has a default evidence path from one real build.
- Missing capabilities produce an explicit unfinished handoff instead of a weaker silent result.
- The skill ships a deterministic encoder without adding a runtime package; its tests remain repository-side and do not burden adopters.
- The publication reference is platform-explicit enough to act on without turning GitHub into the only review platform.
- The main cost is environment depth: real evidence still needs a runnable application, browser control, media tools and, when requested, publication access.
- **Rollback:** remove the skill directory and installed mirror, the Agent Note pair, the evaluation corpus and the root notice entry.
