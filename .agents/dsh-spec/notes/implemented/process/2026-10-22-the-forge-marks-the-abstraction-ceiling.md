# Agent Note: The forge marks the abstraction ceiling

Status: implemented

English | [中文](2026-10-22-the-forge-marks-the-abstraction-ceiling.zh.md)

## Problem

Two abstract meta-skills were forged — an object-analysis skill and an adaptive-workflow skill — tested in clean rooms offline and web-enabled, and rejected by the maintainer. Their execution was competent; their convergence was not. The clean rooms showed an open object scope producing an improvised element grain, criteria that mirrored the object's own assertions when no external standard was consulted, and test instances that were inspected rather than executed. The rejection leaves a question for the next proposal: where the abstraction ceiling sits, and what would justify crossing it.

## Decision

The forge `dsh-spec-skill-forge` is at the ceiling. Its abstraction is admissible because three anchors are closed by the domain it serves:

- Object closed: an Agent Skill has an externally fixed form — a `SKILL.md` entry, frontmatter, references and scripts, a description that triggers.
- Artifact closed: a skill directory plus one record, with fixed fields, languages and landing.
- Criteria anchored: the Agent Skills specification, `verify-skill-spec.mjs`, the token budget, the positive/negative/verification anchors and the four dispositions. Most checks are mechanical, and the rest are directly judgeable.

A skill more abstract than the forge drops at least one anchor: an open object schema, a free-form artifact, or criteria that refer only to the object's own assertions. Once an anchor is gone, the space of acceptable outputs exceeds what a prompt can constrain, and convergence fails regardless of wording or model scale.

No skill more abstract than the forge is attempted. Generalization goes downward: forge-like skills are instantiated per domain, each with that domain's closed object, artifact and criteria. The two rejected triplets remain rejected records, not experiments.

### The ceiling test

A skill may claim abstraction beyond a concrete task only when all three anchors hold:

| Anchor | Test |
|---|---|
| Object closed | Instances are delimited by an external schema or specification the skill does not invent |
| Artifact closed | The deliverable has fixed fields and a checkable shape |
| Criteria anchored | Checks are mechanical or directly evidenced, not only the skill's or object's own assertions |

One failed anchor makes the method a concrete-task aid. Two failed anchors make it prose.

### The general model

The decision rests on one law: convergence requires closed external anchors. A method that leaves an anchor open adds an interpretation space, and no wording narrows it. Three ceilings follow from that law:

| Ceiling | Why it holds |
|---|---|
| Unattended operation in general situations | Unattended work needs its boundaries and acceptance closed in advance. General situations produce cases the anchors cannot pre-cover, so a person must set or repair them. |
| Maximal speed-up | Accidental complexity can be compressed, essential complexity cannot. As generation cheapens, anchoring and verification become the bottleneck, so total time keeps a floor. |
| Assertion without understanding | A verdict of correct requires understanding the object. Without it only plausibility is available, and no trustworthy oracle closes the loop. |

The floor is essential complexity plus human understanding and responsibility. The ceiling can rise; the floor does not move.

### Two ways the ceiling can rise

Two paths are documented in `docs/breaking-the-ceiling.md` and its figure. They are explanations, not proposals for new skills today.

- Public convergence contracts: many people write their domains' object, artifact, acceptance, failure handling, provenance and composition interface as structured, executable, open knowledge, so anchors become public infrastructure.
- AI convergence in open space: a propose-execute-verify-correct loop with internal anchors, uncertainty calibration and independent verification, rather than a longer prompt.

The paths reinforce each other: public knowledge gives an AI anchors, and an AI helps maintain the contracts. Both widen the admissible abstraction asymptotically. Neither removes the floor.

### Reintroduction condition

A proposal above the forge is reconsidered only when it names the formal anchor that closes the missing corner: a machine-checkable object schema, an artifact schema with a verifier, or a labeled corpus with a pass/fail protocol. More capable models or better prompts do not qualify.

## Alternatives considered

**Generalize the forge one level further.** It lost because the next level opens the object or the artifact; the two rejected skills are that attempt.

**Keep the two as experimental skills.** They lost because their output cannot be checked without the formal anchors they lack; keeping them invites their use as if they converged.

**Rely on larger models or stronger prompts.** It lost because the limit is the space of acceptable outputs, not model capability; clearer wording does not add an anchor.

**Write a formal checker for the rejected skills.** It lost because no object or artifact schema existed to check against, and inventing one for the occasion would itself be the unanchored abstraction. A real schema becomes the reintroduction route.

**Record the verdicts only in the rejected notes.** It lost because those notes record two verdicts, not the ceiling rule that explains them; a third proposal would read the verdicts as accidents.

**Leave the ceiling as prose with no Agent Note.** It lost because a future session would re-litigate the question; the negative guarantee needs a standing record.

**Treat the two lift paths as new skills now.** They lost because they lack the formal anchors today. Writing them down explains the ceiling; it does not propose a skill.

## Consequences

- A negative guarantee holds: a future session does not propose skills above the forge unless the ceiling test passes with a named formal anchor.
- Generalization moves per domain. Each domain gets a forge-like skill with its own closed object, artifact and criteria instead of one skill spanning domains.
- Concrete prompts remain the default for work without a schema. The ceiling test and the general model state the reason, not a preference.
- The two rejected triplets stay in `rejected/` as evidence for the negative guarantee, and their status lines carry the verdict.
- The reasoning extends beyond skills. `docs/breaking-the-ceiling.md`, `docs/abstraction-ceiling.svg` and `docs/breaking-the-ceiling.svg` record the three ceilings, the floor and the two lift paths for a human reader.
- The repository carries a standing rule that is read when a new skill is proposed; that is the price of preventing the same class of proposal.

## Testing

- `node scripts/dsh-spec-manager/scripts/dsh-spec.ts notes check --all --root .` → 27 Agent Notes checked, structure consistent; format consistent.
- `node scripts/dsh-spec-manager/scripts/dsh-spec.ts translation-pair check` on this pair and on the two rejected pairs → all consistent.
- `node scripts/dsh-spec-manager/scripts/dsh-spec.ts md-links check` on this note and its Chinese side → ok.
- `pnpm test` → 82 tests, 82 pass, 0 fail.

## Related

- [Forging dsh-spec-analysis (rejected)](../../rejected/process/2026-10-22-forging-dsh-spec-analysis.md) — the first rejected attempt.
- [Forging dsh-spec-workflow (rejected)](../../rejected/process/2026-10-22-forging-dsh-spec-workflow.md) — the second rejected attempt.
- [Forging dsh-spec-skill-forge](2026-10-21-forging-dsh-spec-skill-forge.md) — the skill whose abstraction level this note fixes as the ceiling.
