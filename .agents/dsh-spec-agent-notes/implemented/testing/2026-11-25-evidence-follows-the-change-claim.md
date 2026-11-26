# Agent Note: Evidence follows the change claim

Status: implemented

English | [中文](2026-11-25-evidence-follows-the-change-claim.zh.md)

## Problem

One repository-wide test ritual cannot prove every kind of claim. A deterministic test cannot judge a natural-language instruction, a historical model run cannot prove changed bytes, and a before-and-after claim without an isolated starting point can mistake a different environment for an improvement. Retaining every artifact can also spread private data farther than the claim requires.

## Decision

Evidence is selected from the claim the change makes:

| Claim | Required evidence |
|---|---|
| A mechanical rule or structure | A deterministic test that falsifies the rule. |
| Natural-language model behavior | A behavior evaluation at the skill and input boundary, bound to the scenario, inputs and installed skill tree it exercised. |
| Trigger selection | Evidence bound to the model-facing name and description plus the trigger corpus. A body edit does not invalidate it. |
| A comparative benefit claim | A candidate arm and a target-absent baseline under the same scenario prompt, fixtures, capabilities, sandbox and deadline; the target installation and target-use instruction are the intended treatment difference. |
| Retained prompts, outputs, logs or artifacts | A canary scan over every retained path and file; semantic review still decides whether transformed or encoded content is private. |

The model runner writes `evidence.json` for each successful behavior, comparison or trigger run. Behavior currentness follows the scenario definition, scenario and rendered prompts, input manifest and model-bearing execution configuration. The complete target and sibling skill trees are required provenance for the bytes used, not currentness selectors. A complete-tree change therefore does not invalidate every scenario implicitly; reviewers select the scenario subjects whose behavior changed, as the existing model-evidence decision requires. Comparative currentness also follows the declared comparison conditions. Trigger mode stages only the target skill, the corpus agent file and the selected query fixtures, requires a read-only unchanged workspace and the expected stable selection marker, and binds the trigger surface plus the canonical corpus identity, including fixture paths, content and executable modes. Currentness is computed from those selectors rather than stored as a mutable current flag.

A target-absent arm is valid only as the baseline of a comparison claim. The candidate records target-present skill provenance; the baseline records no target-skill provenance. Both arms bind any sibling-skill provenance they install. The runner omits the target installation and target-use instruction for the baseline. A target-absent comparison arm requires `--counterpart`, and the production promotion path validates the candidate/baseline pair before the new arm is published. A candidate remains `candidate-only` until its baseline exists. The paired baseline records the candidate's `evidence.json` hash, and promotion requires that hash to equal the retained candidate file. If a target-present record also carries a counterpart hash, validation requires that optional reverse edge to equal the retained baseline file without requiring a cyclic pair. A target-absent behavior run is rejected before the model starts. Candidate and baseline must agree on the scenario prompt, inputs, model configuration, execution profile, deadline, comparison conditions, sibling provenance and privacy scope; their rendered prompts differ only through the target treatment.

A successful run has exactly one `turn.completed` event as the final trace event. Missing, duplicate, failed or non-final terminal events fail before evidence promotion. `--deadline-ms` bounds sandbox startup, model execution, workspace/response collection and every host-side checkpoint before promotion. Expiry terminates an active sandbox; synchronous host work fails at the next checkpoint. An expiry before promotion starts discards the staged leaf; a deadline crossing after the recoverable replacement begins does not unwind that replacement. The default is 30 minutes.

Before reading any trace or retained metadata, the runner opens the file without following links, with nonblocking and bounded reads, and requires a regular file. Before promotion, it scans raw stdout and stderr, every staged file regardless of extension, and the retained output path for configured privacy canaries. The scan reads binary files in bounded chunks, catches matches across chunk boundaries, rejects links and special files, and reports only the canary set plus a relative surface when that surface does not contain the match. Output and counterpart path preflight failures report the required relative shape without echoing the supplied absolute path. `evidence.json` hashes a portable canary scope: stable set/value pairs are recorded, while the current-home path contributes only its set identity and no path value. Live execution still scans the actual current-home path. Retained validation requires the exact subject-selected set names and stable values and scans the supplied live current-home path, but it does not compare that path with the authoring path or the verifier's current home. The checked-in evidence tree receives the live scan in routine tests. Canaries are a leak tripwire, not a replacement for semantic privacy review.

Runs created before `evidence.json` existed remain subject to the existing scenario, input and recorded-skill checks. Missing typed metadata neither downgrades nor upgrades them. The new rule does not rewrite every earlier audit.

The existing [model-evidence binding record](2026-11-23-model-evidence-binds-changed-behavior.md) owns affected-behavior invalidation and exact revision binding. The existing [pre-push checks record](../../implemented/process/2026-10-28-forging-dsh-spec-pre-push-checks.md) owns command selection from the outgoing diff. This decision owns claim type, the scenario/input currentness selectors, comparison arms, terminal completion, common retained-run validation and privacy canaries; it does not replace either owner.

Tracking: #158.

Follow-up to: #134.

## Verification

`tests/evidence-policy.test.ts` covers claim and comparison typing, trigger-surface and corpus typing, target-absent restrictions, affected-scenario currentness, separate provenance, exact cross-arm prompt reconstruction, retained-file currentness and provenance reconstruction, retained-tree snapshots, portable recorded privacy scopes, different-current-home validation, live current-home scanning, path-free root and directory inspection errors, forged privacy scopes, no-follow regular-file reads, trace size and special-file rejection, terminal events, whole-run checkpoints, path and binary canaries, chunk-boundary matches and the complete checked-in evidence tree. `tests/runner-safety.test.ts` exercises the real runner entry with a zero-exit trace that lacks completion, a run that exceeds its deadline, target-absent promotion guards, forged counterpart currentness and provenance, counterpart compatibility, trigger mode boundaries, expected and rejected selection markers, fixture traversal and overwrite rejection, executable fixture-mode preservation and a model-output canary; failed runs leave no promoted evidence.

Model evaluation remains a manual development action. `pnpm test` exercises deterministic policy controls and checked-in evidence only; it does not call a model. The integration deadline case may expire before Codex starts, so it proves the runner-wide deadline and pre-promotion failure, not that an executing model was present; the lower-level interruptible-child control proves deadline termination of a started child.

## Alternatives considered

**Run every available gate for every change.** It is easy to state, but spends time on evidence that cannot decide the claim and can make a green suite look like behavioral proof.

**Use model evaluation for every skill change.** It observes natural-language behavior, but cannot replace exact structural, format or command-contract assertions.

**Treat a matching aggregate as an isolated baseline.** It avoids setup, but an uncontrolled environment or previously warmed state cannot support a causal benefit claim.

**Store `current: true` in each run.** A stored verdict becomes another mutable source of truth. Currentness remains a computed relation over the recorded selectors.

**Rewrite every historical evidence leaf in this change.** The migration cost adds no proof, and unchanged scenarios retain their existing audited status. New runs receive typed metadata without relabeling old runs solely because the field is absent.

**Treat complete skill-tree equality as behavior currentness.** A tree digest identifies the bytes staged for a run, but it cannot identify which scenario behavior changed. Complete-tree equality would rerun or reject unrelated scenarios and reverse the existing model-evidence decision.

## Consequences

- Claim type and currentness selectors are machine-readable for new runs.
- A trigger description change invalidates trigger evidence without invalidating behavior evidence. A skill edit requires review to select affected scenario subjects rather than a complete-tree rerun.
- Trigger selection runs use the same isolated runner, terminal-event check, privacy scan and recoverable promotion path as behavior runs.
- Comparative runs can use the same isolated runner for both arms. Target absence requires a validated counterpart before promotion.
- A zero-exit but incomplete model trace or retained canary cannot become published evidence; a run that expires before promotion starts cannot either.
- The canary gate detects literal leaks across all retained file types; compressed, transformed or rendered data still needs semantic privacy review.
- Existing evidence keeps its prior current/historical status until its scenario or inputs change or a targeted run supplies the new metadata.
- Replacement promotion is recoverable across a process crash but is not a single atomic directory exchange; the next runner invocation repairs the backup window.
