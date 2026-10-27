# Agent Note: Forge the skill forge around precise anchors

Status: implemented

English | [中文](2026-10-26-forging-dsh-spec-skill-forge.zh.md)

## Problem

The forge is the package's authoring mechanism, and its own body carried prose it could not decide: definitions with no consuming check, a classification no step operationalised, hard red lines that overlapped, an undefined review trigger, a checks table that restated the Agent Skills guides, and a review projection its own CLI never built. It listed commands and flags in the body, a second interface authority, and used `script/` where the guides use `scripts/`.

A shared design review distilled the measure: turn every expectation into a precise, decidable anchor, and treat anchor count and the mechanical share as outcomes. The maintainer later replaced that principle with a determinacy-matched one: choose the anchoring form that fits the task; positive boundaries attract, negative boundaries repel, verification decides; anchoring forms need not all be mechanical; ambiguous high-consequence areas need a safety fallback, trigger and blocking/handover; open areas state their allowed divergence and uncrossable boundaries. An imprecise anchor is noise; an imprecise mechanical check is worse than none.

Seven read-only audits followed. They established the guide link, the declaration definition, the gate, the translation pairs and the metadata-free pair record; they also showed that every guard added to a custom publisher produced another filesystem edge: projection state, target guards, backup, staging, symlinks, canonical paths, races. The seventh audit was still finding data-loss and race paths in `publish`. The maintainer concluded the publisher was the wrong scope: publishing is a plain overwrite, not a transaction. The gate and the pair check are read-only; Git is the rollback.

## Decision

- **Body (93 lines).** `## Guiding principle` carries the determinacy-matched principle translated into the delivery language. `## Tools` exposes the two read-only checks and the draft/pair commands through `--help`. `## Limits` reads the Agent Skills index, must read the best-practices page it links, reads the other pages on demand, requires writing to their requirements, and keeps the offline fallback link-free. The process sections stay: `### Stop`, `### Intent` (the design is open within the Stop boundaries), `### Source`, `### Disposition` (exclusive conditions), `### Script conversion`, `### Review` (translation pairs). `## Verification` gives every requirement one of three anchors and carries the precision test. `## Record` holds the disposition table. `## Defaults` holds the language defaults.
- **One work directory.** The forging lives at `.agents/dsh-spec-skill-forge/<name>/`; there is no `draft/` or `review/` subtree. `record/` stays beside it.
- **Translation pairs.** A review copy is `<source-basename>.<lang>.md` beside its source plus `<source-basename>.i18n.yaml` recording only the source hash; `SKILL.md` pairs with `SKILL.<lang>.md` and `SKILL.i18n.yaml`. Only `.md` files are paired; scripts and assets are not translated. The translation frontmatter carries no metadata. `review` records the source hash; `review --check` lists missing, out-of-date, multiple and orphaned pairs.
- **Simple publish.** `publish` removes the translation pairs from the work directory, copies the work directory to the landing directory, and removes the work directory. An existing target is replaced. The script does not run the gate, keep a backup, stage, canonicalise paths, or manage symlinks and races. The adoption's acceptance and the VCS are the authorization and the rollback.
- **Read-only checks.** `verify-skill-spec.mjs` checks Agent Skills conformance; `review --check` checks pair freshness. Neither is a publication gate. Known read-only limits (some absolute-link forms, rare CJK extension ranges, script-coverage strictness, standalone-gate symlink scope) are recorded as limitations, not reasons to grow the publisher.
- **Build.** `build.ts` runs one self-contained `vp pack` per entry; `yaml` parses frontmatter in both scripts. `THIRD_PARTY_NOTICES` lists every bundled dependency with full license texts.
- **Removed.** The review projection and stamp, `stale`, `--accept`, `--copy`, `--remove`, `--allow-stale`, the review directory, `land`; and the later publisher transaction: `--force`, backup, staging, canonical/realpath identity, symlink policy, target revalidation, gate-in-publish. Publishing is a copy.

### Settings

| Setting | Value |
|---|---|
| Forge directory / landing | `.agents/dsh-spec-skill-forge/` / `skills/dsh-spec-skill-forge/` |
| Work directory | `<forge>/<name>/`, removed at publish |
| Review copies | translation pairs beside their sources; removed at publish |
| Publish | remove pairs, copy the work directory, then remove the work directory |
| Languages | delivery English; review Chinese; trigger Chinese |
| Record | this note |
| Rollback | Git and the record; publish keeps no backup |

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

### Audit

Seven read-only audits of the installed skill in temporary projects found 17, 17, 12, ten, a fifth, a sixth and a seventh set of gaps. The early audits fixed the guide URL, declaration, landing guard, gate, record fields and pair model. The fourth through sixth hardened review, publish, paths, pairs and gate; the seventh still found publisher data-loss and race paths. The fix is not another guard: the publisher is a plain overwrite, the gate and pair check remain read-only, and the known read-only limits are recorded. A quick review of the final publish then passed; the maintainer accepted it. No eighth audit is planned.

### Verification

The work directory was checked and published on 2026-10-26:

- `node scripts/verify-skill-spec.mjs <work-directory>` → 14 checks, 0 failed; 93 lines, ~2,595 tokens; the same gate passes on `skills/dsh-spec-skill-forge` and the refreshed installed copy.
- `pnpm test` → 112 tests, 0 failed (27 lifecycle cases, 63 gate cases, the rest repository checks).
- Before publish, `forge.mjs review --check` reported the two translation pairs up to date; publish then removed the pairs with the work directory.
- `forge.mjs publish --dry-run --into skills/dsh-spec-skill-forge` → 4 actions, 0 failed; the plan showed prepare, pairs, copy and remove; the real publish performed those four actions.
- `pnpm run format:check`, `notes check --all`, `translation-pair check` and `md-links check` pass.
- Review: the work directory carried `SKILL.zh.md` and the reference translation, each with a current `.i18n.yaml` record and no frontmatter metadata; the maintainer accepted the final publish.

### Unverified

- The forge skill's own trigger evaluation; no observing client is available.
- Translation fidelity: the pair record proves the source version, not that the translation is faithful.
- The gate's known read-only limits: some absolute-link forms, rare CJK extension ranges, script-coverage strictness and the standalone gate's symlink scope.
- Audit mode and evals are out of scope; the audits used the process as a rubric.

## Alternatives considered

**Keep the custom publisher and harden it.** It lost after seven audits: each guard created another filesystem/concurrency edge, and the surface was unbounded. A plain overwrite with Git as rollback is the honest scope.

**Remove `publish` and leave publishing to the shell.** It lost because the copy is the skill's last step and a tiny command keeps the work-directory/pair convention visible; the command carries no transaction guarantee.

**Keep the gate inside publish.** It lost because it made publish look like a safety gate; the gate is a separate read-only check the agent runs, and the adopter's acceptance authorizes the overwrite.

**Keep the review projection.** It lost because a translated copy the tool cannot verify produced stamps and stale states; pairs record the same fact with less state.

**Keep the disposition table's overlapping conditions.** It lost because Adapt/Re-bind overlapped and had no no-equivalent fallback; the conditions are now exclusive.

## Consequences

The forge ships as a 93-line body, one one-level reference, two self-contained scripts, a translation-pair record and the read-only gate. `publish` is a four-step plain copy: prepare, remove pairs, copy and overwrite the landing directory, then remove the work directory. The seven-audit hardening loop ended with this simple scope, and the quick review plus the maintainer's acceptance closed it.

What it bought: a small process skill, a mechanically checkable body, a reproducible gate and a pair-freshness record without a second state store. What it cost: `publish` has no rollback beyond Git and does not validate the target; the gate carries known read-only limits (some absolute-link forms, rare CJK ranges, script-coverage strictness, standalone-gate symlink scope); record completeness, translation fidelity, trigger evaluation and audit-mode judgment remain human. The [three-step note](2026-10-23-reforge-the-skill-forge-as-three-steps.md) is partially superseded by this decision.
