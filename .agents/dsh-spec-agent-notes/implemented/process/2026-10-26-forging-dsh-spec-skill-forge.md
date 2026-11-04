# Agent Note: Forge the skill forge around precise anchors

Status: implemented

English | [中文](2026-10-26-forging-dsh-spec-skill-forge.zh.md)

## Problem

The forge is the package's authoring mechanism, and its own body carried prose it could not decide: definitions with no consuming check, a classification no step operationalised, hard red lines that overlapped, an undefined review trigger, a checks table that restated the Agent Skills guides, and a review projection its own CLI never built. It listed commands and flags in the body, a second interface authority, and used `script/` where the guides use `scripts/`.

## Decision

- **Body.** `## Guiding principles` carries context-not-control and the anchoring method translated into the delivery language. `## Tools` exposes the two read-only checks and the draft/pair commands through `--help`. `## Limits` reads the Agent Skills index, must read the best-practices page it links, reads the other pages on demand, requires writing to their requirements, and keeps the offline fallback link-free. The process sections stay: `### Stop`, `### Intent` (the design is open within the Stop boundaries), `### Source`, `### Disposition` (exclusive conditions), `### Script conversion`, `### Review` (translation pairs). `## Verification` gives every requirement one of three anchors and carries the precision test. `## Record` holds the disposition table. Language defaults sit at their use sites: delivery language in `### Intent`, additional trigger language in `### Review`, record language and translation in `## Record`; no separate defaults table remains.
- **Anchoring.** Every expectation becomes a precise, decidable anchor, and the anchoring form is matched to the task's determinacy: positive boundaries attract, negative boundaries repel, verification decides continue, adjust or stop; anchoring forms need not all be mechanical; an ambiguous high-consequence area needs a safety fallback, trigger and blocking/handover; an open area states its allowed divergence and uncrossable boundaries; an imprecise anchor is noise, and an imprecise mechanical check is worse than none. A forged skill shapes the agent's context, not its path, and control is reserved for authorization, irreversible actions, safety and required validation. The general form of that stance lives in `dsh-spec-agent-experience`; the Agent Skills best practices outrank this skill's guiding principles, and the more specific package owner decides prompt and context structure.
- **One work directory.** The forging lives at `.agents/dsh-spec-skill-forge/<name>/`; there is no `draft/` or `review/` subtree. `record/` stays beside it.
- **Translation pairs.** A review copy is `<source-basename>.<lang>.md` beside its source plus `<source-basename>.i18n.yaml` recording only the source hash; `SKILL.md` pairs with `SKILL.<lang>.md` and `SKILL.i18n.yaml`. Only `.md` files are paired; scripts and assets are not translated. The translation frontmatter carries no metadata. `review` records the source hash; `review --check` lists missing, out-of-date, multiple and orphaned pairs.
- **Simple publish.** `publish` removes the translation pairs from the work directory, copies the work directory to the landing directory, and removes the work directory. An existing target is replaced. The script does not run the gate, keep a backup, stage, canonicalise paths, or manage symlinks and races. The adoption's acceptance authorizes the overwrite and the VCS is the rollback; publishing is a plain copy, not a transaction.
- **Read-only checks.** `verify-skill-spec.mjs` checks Agent Skills conformance; `review --check` checks pair freshness. Neither is a publication gate. Known read-only limits (some absolute-link forms, rare CJK extension ranges, script-coverage strictness, standalone-gate symlink scope) are recorded as limitations, not reasons to grow the publisher.
- **Build.** `build.ts` runs one self-contained `vp pack` per entry; `yaml` parses frontmatter in both scripts. `THIRD_PARTY_NOTICES` lists every bundled dependency with full license texts.
- **Removed.** The review projection and stamp, `stale`, `--accept`, `--copy`, `--remove`, `--allow-stale`, the review directory, `land`; and the later publisher transaction: `--force`, backup, staging, canonical/realpath identity, symlink policy, target revalidation, gate-in-publish. Publishing is a copy.
- **Record language and translation.** The record is English; its translation follows the adopter's declaration and, absent one, the adopter's language. When those are English, no separate translation is produced. The adopter owns the translation mechanism and its consistency record; the forge names neither.
- The forge lands at `skills/dsh-spec-skill-forge/`; delivery language is English, and the review and additional trigger language are Chinese.

### Dispositions

| Previous content | Disposition | Home |
|---|---|---|
| Definitions list, Docs/SOP/Script classification | dissolve | terms at first use; guides' progressive disclosure |
| Five hard red lines | re-bind | `Stop`: two conditions; the rest rulings |
| Review projection and frontmatter stamp | dissolve | translation pairs plus pair records |
| `stale`, `--accept`, `--copy`, `--remove`, `--allow-stale` | dissolve | `review` and `review --check` |
| `review/` directory, `land` | dissolve / re-bind | pairs beside sources; `publish` |
| Custom publisher transaction | dissolve | plain overwrite; acceptance and VCS authorize and roll back |
| `--force`, backup, staging, canonical identity, symlink policy | dissolve | no longer the skill's scope |
| Body-content rule | dissolve | the specification's minimal example has no body |
| Line-regex frontmatter | re-bind | `yaml` parses it |
| `<name>` pair placeholder | re-bind | `<source-basename>.<lang>.md` with the `SKILL.md` example |
| One build, two bundles | re-bind | `build.ts` builds each entry self-contained |

### Exclusions

These rules and mechanisms are not carried: the review feedback file; uncollected leads; undefined responsibility/try-order rules; guide-owned remediation, trigger-test instructions, parameters/defaults and script-decision criteria; the create/iterate mode taxonomy; record enforcement, review/audit description triggers, translation hashes/reviewers and bundled trigger/output evals — these stay natural-language anchors or delegated judgments by maintainer decision; a review/audit mode — the skill's scope is forging; the audits used its process as a rubric; and the publisher's transaction guarantees — a plain copy does not promise them.

## Alternatives considered

**Keep the custom publisher and harden it.** It lost after seven audits: each guard created another filesystem/concurrency edge, and the surface was unbounded. A plain overwrite with Git as rollback is the honest scope.

**Remove `publish` and leave publishing to the shell.** It lost because the copy is the skill's last step and a tiny command keeps the work-directory/pair convention visible; the command carries no transaction guarantee.

**Keep the gate inside publish.** It lost because it made publish look like a safety gate; the gate is a separate read-only check the agent runs, and the adopter's acceptance authorizes the overwrite.

**Keep the review projection.** It lost because a translated copy the tool cannot verify produced stamps and stale states; pairs record the same fact with less state.

**Keep the disposition table's overlapping conditions.** It lost because Adapt/Re-bind overlapped and had no no-equivalent fallback; the conditions are now exclusive.

## Consequences

The forge ships as a 93-line body, one one-level reference, two self-contained scripts, a translation-pair record and the read-only gate. `publish` is a four-step plain copy: prepare, remove pairs, copy and overwrite the landing directory, then remove the work directory. The seven-audit hardening loop ended with this simple scope, and the quick review plus the maintainer's acceptance closed it.

What it bought: a small process skill, a mechanically checkable body, a reproducible gate and a pair-freshness record without a second state store. What it cost: `publish` has no rollback beyond Git and does not validate the target; the gate carries known read-only limits (some absolute-link forms, rare CJK ranges, script-coverage strictness, standalone-gate symlink scope); record completeness, translation fidelity, trigger evaluation and audit-mode judgment remain human. The [three-step note](2026-10-23-reforge-the-skill-forge-as-three-steps.md) is partially superseded by this decision.
