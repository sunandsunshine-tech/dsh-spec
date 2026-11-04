# Agent Note: Forging dsh-spec-agent-experience from the upstream agent-experience skill

Status: implemented

English | [中文](2026-10-23-forging-dsh-spec-agent-experience.zh.md)

## Problem

The rebuilt package shipped one skill, the forge, and the first forging batch adds the upstream `agent-experience` skill: a short list of principles for writing model-facing information. The skill has no product-specific object or artifact, so this forging settled two questions only — whether the upstream text can be carried as a skill and where its boundary sits. The driver decided to port it as it stands, without adding criteria, references or a script.

## Decision

The package ships `dsh-spec-agent-experience` as a create-mode port of the upstream skill. The landed `SKILL.md` carries the six context principles and the `## Tool definitions` five rules in upstream wording; only the name, description and the Chinese trigger keywords differ. There are no references, no script, no added criteria and no claim about verifiability.

### Forging settings

| Setting | Value |
|---|---|
| Mode | create; the upstream skill was the only source |
| Upstream | `submodules/dsh` at `dsh-v0.2.1-rc.2`, `packages/preset/agent-preset/skills/agent-experience/SKILL.md` |
| Work draft / landing | `.agents/dsh-spec-skill-forge/draft/dsh-spec-agent-experience/` (removed by landing) / `skills/dsh-spec-agent-experience/` |
| Languages | delivery English; review Chinese; additional trigger Chinese |
| Record | this note |
| Rollback | delete `skills/dsh-spec-agent-experience/`, its installed copy under `.agents/skills/dsh-spec-agent-experience/`, and this triplet together |

### Dispositions

| Upstream content | Disposition | Location | Basis |
|---|---|---|---|
| Description trigger surface | adapt | `description` | Names model-facing tool definitions and skill/context design; Chinese keywords added per the language rule |
| Six context principles | keep | body | Upstream wording carried; domain-neutral |
| `## Tool definitions` five rules | keep | body | Upstream wording carried; domain-neutral |
| Upstream project names and examples | keep | body | The upstream file carries no project name; the thread-reply example is generic and kept |
| Conformance criteria | dissolve | — | The driver instructed that nothing beyond the upstream content is carried, so this skill adds no criteria |

## Alternatives considered

**Do not port it.** It lost because the driver chose to keep the skill as an auxiliary convergence aid: the principles are cheap to read and may still shape model-facing information even without an acceptance test.

**Merge it into the forge skill.** It lost because the driver kept the two separate: the forge produces skills, while this skill states principles for model-facing information, and folding it in would change the forge's boundary.

**Add conformance criteria or worked examples.** It lost because the driver instructed that nothing beyond the upstream content is carried; examples would create an open-ended calibration surface that a finite set cannot close.

## Consequences

- The package ships a principles-only skill whose body stays byte-identical to upstream after the frontmatter; the port costs one description adaptation and one note.
- What it gives up is checkability: the gate establishes specification conformance only, so whether an executor follows the principles cannot be established by a check this repository runs.
- Its trigger surface overlaps the forge's design guidance: the description names tool definitions and skill/context design, but it cannot force a reader to prefer one skill over the other.
- If it does not help, the rollback removes the skill without affecting the other skills.

## Testing

- Landed gate: `node skills/dsh-spec-skill-forge/script/verify-skill-spec.mjs skills/dsh-spec-agent-experience --strict-budget --name-max 64 --description-max 1024 --compatibility-max 500 --max-lines 500 --max-tokens 5000 --cjk-tokens-per-char 0.6 --other-tokens-per-char 0.3` → 10 checks, 0 failed; 19 lines, ~675 tokens.
- Black-box reviews: round 1 (`/tmp/dsh-forge/review/dsh-spec-agent-experience-round1.md`) passed with four record-only minors, applied; round 2 (`…-round2.md`) passed with no findings. The Chinese review draft was committed before landing and was removed by the landing step.
- Installed copy: `pnpm run skill:refresh` mirrored one file; `pnpm test` → 82 tests, 82 pass, 0 fail.
- Record gates: `notes check` → `check notes: ok`; `translation-pair check` → `check translation-pair: ok`.
