# Agent Note: Evidence follows the change claim

Status: proposed

English | [中文](2026-11-25-evidence-follows-the-change-claim.zh.md)

## Problem

One repository-wide test ritual cannot prove every kind of claim. A deterministic test cannot judge a natural-language instruction, a historical model run cannot prove changed bytes, and a before-and-after claim without an isolated starting point can mistake a different environment for an improvement. Retaining every artifact can also spread private data farther than the claim requires.

## Proposal

Evidence is selected from the claim the change makes:

| Claim | Required evidence |
|---|---|
| A mechanical rule or structure | A deterministic test that falsifies the rule. |
| Natural-language model behavior | A behavior evaluation or equivalent evidence at the skill and input boundary. |
| Current behavior after a body change | Fresh evidence for the affected behavior; older evidence remains historical only. |
| Trigger selection after a name or description change | A rerun of the positive and near-miss trigger set. |
| A benefit or ROI claim | A comparable isolated baseline and candidate measurement. |
| Retained prompts, outputs, logs or artifacts | A privacy check over every retained item; otherwise narrow the claim and retention scope. |

The change description names the claim and the evidence that decides it. Expensive model evaluations need not run routinely in CI, but a change without one states which deterministic evidence decides the behavior or why a model evaluation is not warranted.

The existing [model-evidence binding record](../../implemented/testing/2026-11-23-model-evidence-binds-changed-behavior.md) owns the rule that behavior evidence binds the bytes it exercised. This proposal owns the broader choice among deterministic tests, model evidence, baselines and privacy checks.

Tracking: #134.

## Alternatives considered

**Run every available gate for every change.** It is easy to state, but spends time on evidence that cannot decide the claim and can make a green suite look like behavioral proof.

**Use model evaluation for every skill change.** It observes natural-language behavior, but cannot replace exact structural, format or command-contract assertions.

**Treat a matching aggregate as an isolated baseline.** It avoids setup, but an uncontrolled environment or previously warmed state cannot support a causal benefit claim.

## Acceptance criteria

- Each changed claim maps to one or more evidence entries that can falsify it.
- Changed behavior or inputs invalidate prior evidence for that claim; unrelated historical evidence is labeled as such.
- ROI claims record baseline, candidate, conditions and how the measurement isolates the claimed effect.
- Privacy review covers every retained artifact, or the change states the narrower claim and evidence set.
- Deterministic checks still guard current format, links and corpus integrity.

## Risks

- Model evaluations remain probabilistic and can overfit prompts; conclusions must stay within the tested behaviors.
- A strict artifact privacy rule can reduce reusable evidence and increase review effort.
- Separating claims into evidence types can leave a cross-cutting behavior under-tested if the change description does not enumerate its consumers.
