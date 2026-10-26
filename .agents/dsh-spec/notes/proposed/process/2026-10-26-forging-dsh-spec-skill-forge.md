# Agent Note: Forge the skill forge around precise anchors

Status: proposed

English | [中文](2026-10-26-forging-dsh-spec-skill-forge.zh.md)

## Problem

The forge is the package's authoring mechanism, and its own body carried prose it could not decide: 25 definitions with no consuming check, a Docs/SOP/Script classification that no step ever operationalised, five hard red lines of which three are reversible and one is repeated four times, an undefined "review is needed" trigger, a checks table that restated the Agent Skills guides, and a review projection its own CLI never built. It also listed the scripts' commands and flags in the body, a second interface authority that drifts from `--help`, and its script directory was `script/` where the guides use `scripts/`. A shared design conversation (`https://chat.deepseek.com/share/sdjwwf4df33qd04z6c`) converged on the measure the forge applies: turn every expectation into a precise, decidable anchor — what is wanted (positive boundary), what is excluded (negative boundary), and how it is decided (verification condition) — and treat anchor count and the share carried by scripts as outcomes, not as measures. An imprecise anchor is noise; an imprecise mechanical check is worse than none.

## Proposal

Rebuild the forge around that principle while keeping its process decisions.

- **Body (96 lines).** `## Guiding principle` carries the maintainer's final principle sentence translated into the delivery language. `## Tools` exposes the two scripts and their `--help` as the discovery path; the body lists no command lines or exit-code table, and `--help` is the only interface reference. `## Limits` keeps the process the guides leave open: `### Stop` first, then `### Intent` (with the modes), `### Source` (a source constraint is any requirement, prohibition, condition or fixed choice, not only a modal phrase), `### Disposition`, `### Script conversion`, `### Review` (invariants only). `## Verification` gives every requirement one of three anchors and carries the precision test. `## Record` holds the disposition table in the single record. `## Defaults` holds the language defaults.
- **Removed**: `## Loop` (a command list duplicating `--help`, plus an undefined `forge` alias), `## Deliverables` (the disposition table belongs to the record), `### Skill content` (guide restatement; its one unique rule moved to `### Script conversion`), `## Conventions` (an instruction to the agent doing the forging, not skill content), `## Gotchas` (facts the scripts' `--help` and errors already teach), the standalone `## Modes` (folded into `### Intent`), and the expanded guiding principle (the precision test moved to `## Verification`; the rest is not carried).
- **Directory structure.** `script/` becomes `scripts/`, the specification's and using-scripts' convention. The rename touches the skill, `package/README.md`, `package.json`, the Vite `outDir`, `forge.ts`'s copy and skip logic (which still accepts a legacy `script/`), the tests, the docs, and the installed copies at landing.
- **Definitions and carrier.** The 25-term list is deleted; terms are stated where first used. The Docs/SOP/Script classification dissolves into the guides' progressive disclosure plus the `Script conversion` rule. `Format` is deleted: the guides own product standards.
- **Red lines.** Two remain: an unauthorised overwrite or deletion of an existing skill, and an operation the environment forbids or that cannot be reversed. A missing runtime, a declaration-location change and a source/domain conflict become error exits and recorded rulings.
- **Mechanical anchors.** `verify-skill-spec.mjs` matches `script/` and `scripts/` with a word boundary, resolves links with `path.relative`, strips a BOM and CRLF, ignores links inside fenced code blocks, and applies one strict "under the limit" budget over the body. `forge.mjs` implements the review projection: each authored `.md` in `review/<name>/` carries `metadata.forge-review` in its frontmatter — `source=<path> source_sha=<hash> stale=<true|false>` — so the review file stays a parseable Markdown document; `review` scaffolds missing files (marked `stale=true` until accepted) and marks changed sources stale, `review --accept` clears stale and refreshes the hash, `review --copy` writes a straight same-language copy, and `land` refuses a missing, stale or mismatched projection (override `--allow-stale`). `draft` errors when `--from` meets an existing draft; `scripts/` and `assets/` are copied byte-for-byte with no stamp.
- **Reference.** The offline fallback loses its two local-policy sentences (target-runtime red line; this repository's gate as the specification's validator), its "all when-to-use belongs in the description" overreach, and its force flattening.

### Settings

| Setting | Value |
|---|---|
| Mode | iterate; the landed forge skill is the work draft's source |
| Forge directory / landing | `.agents/dsh-spec-skill-forge/` / `skills/dsh-spec-skill-forge/` |
| Drafts | work and review drafts removed on landing |
| Languages | delivery English; review Chinese; trigger Chinese |
| Record | this note |
| Rollback | restore `skills/dsh-spec-skill-forge/`, `package/dsh-spec-skill-forge/`, the tests and this triplet to the state before landing |

### Dispositions

| Previous content | Disposition | Home |
|---|---|---|
| 25-term `Definitions` list | dissolve | terms stated at first use; no list |
| `Docs` / `SOP` / `Script` classification | dissolve | guides' progressive disclosure; the `Script conversion` rule carries the script decision |
| Five hard red lines | re-bind | `Stop`: two conditions; the rest are rulings or error exits |
| Interaction rule (do not ask outside red lines) | keep | `Stop` |
| Languages matrix | keep | `Defaults` plus the `Review` trigger |
| Forge directory default | adapt | the script's default and `--help`; `Record` names it |
| Record three-level fallback and mandated headings | re-bind | `Record`: default location and default contents; the existing mechanism owns its body |
| Drafts rule | re-bind | `Review` plus the projection contract |
| "A review draft exists only when ... review is needed" | re-bind | trigger: review language differs, or the adopter asks |
| `Format` rule | dissolve | the Agent Skills guides own format; the forge cites them |
| SSOT / Unambiguity enumeration | dissolve | the guides own writing economy; the body carries no second-authority rule |
| Three-step SOP with per-step Complete/Check/Failure | dissolve | `Limits` + `Verification`; no per-step ceremony |
| Name rule | dissolve | the gate checks the guides' rule |
| Triggering and Scripts check rows | dissolve | the guides own those standards; the body cites them |
| "read ... and all content it links" | adapt | "best practices and the content it links"; no page enumeration |
| Offline fallback | keep | corrected reference, still not a second authority |
| Create / iterate modes | keep | folded into `Intent` |
| `## Loop` command list | dissolve | `## Tools` names the scripts; `--help` is the interface |
| Flags, exit codes and JSON output in the body | dissolve | `--help` and the call result carry them |
| `## Deliverables` | dissolve | the description carries the goal; `Record` carries the disposition table |
| `### Skill content` | dissolve | content placement belongs to the guides; the script rule moved to `### Script conversion` |
| `## Conventions` | dissolve | an instruction to the agent doing the forging, not skill content |
| `## Gotchas` | dissolve | the scripts' `--help` and errors carry those facts |
| Expanded guiding principle | re-bind | the precision test in `Verification`; the rest is not carried |
| `script/` directory name | adapt | `scripts/`, the guides' convention; `forge.mjs` still accepts a legacy `script/` |
| `review` mirroring only `script/` | dissolve | stamped projection in `forge.mjs` |

### Exclusions

These rules and mechanisms are not carried because they have no consumer or no resolved referent: the review feedback file (`feedback.md`) — a conversation proposal that no command read, and whose body sentence, script exclusion and test are gone; "record uncollected leads and their expected value" — the record list had no home for it; "state responsibility and try order" — the referents were never defined; "introduce examples with 'for example'" — a guide-owned style; the duplicated "review draft is never a second authority" and the duplicated unreadable-guide failure line; "round document" — an undefined term; the one-home rule and the description definition — guide-owned writing economy; the `compatibility` clause and the mechanical row's command-naming, parameter and boundary-test details — guide-owned specification and script guidance; the script interface details in `Script conversion` — guide-owned, leaving the conversion rule and the parameters-and-defaults requirement; and the vague "strict form" — restated as the gate's failure conditions. The record list now names the disposition table once rather than twice.

### Verification

The work draft was gated on 2026-10-26:

- `node scripts/verify-skill-spec.mjs <work-draft> --strict-budget` → 11 checks, 0 failed; 96 lines, ~2,290 tokens.
- `pnpm test` → 102 tests, 0 failed (39 lifecycle cases, 41 gate cases, the rest repository checks).
- Content judgement against the guides, one conclusion each: specification — directory, frontmatter, links and size rules are exercised by the gate and the guide is cited, OK; best-practices — scope, context economy, calibration and patterns are left to the guides, the forge adds only process, OK; optimizing-descriptions — the trigger-evaluation parameters are cited, not restated, OK; using-scripts — the script interface is exposed through `--help`, OK; evaluating-skills — the judged and unverified anchors route there, OK.
- Script probes: `forge.mjs --help` and `verify-skill-spec.mjs --help` exit 0; both are non-interactive, print diagnostics to stderr, document exit codes 0/1/2, and accept `--json`; `forge` accepts `--dry-run`.
- `pnpm run format:check`, `notes check --all`, `translation-pair check` and `md-links check` pass.
- The rename check finds no stale `script/` reference in the work draft, `package/README.md`, `package.json`, the Vite config, the tests or the docs; `forge.mjs` accepts a legacy `script/` only for adopters.
- Review: the review projection under `scripts/` carries the translated `SKILL.md` and the reference; the maintainer's acceptance is pending.

### Unverified

- The forge skill's own trigger evaluation. No observing client is available in this environment, so the query-set run is recorded unverified; the reason is the missing client, not a decision to skip it.

## Alternatives considered

**Keep the three-step SOP and only fix its checks.** It lost because the structure was the imprecision: the steps carried ceremony no executor could decide, and the review projection had no home in any step.

**Keep the 25 definitions and trim only the unused ones.** It lost because most terms had no consumer and the precise place for a term is its first use; a list is a second home for every term.

**Keep the five hard red lines.** It lost on precision: three are reversible, and one was repeated in four places, so the stop set did not decide the stop.

**Keep the command list in the body.** It lost because the scripts' `--help` is the single interface authority; a second list drifts from it, and the call result already teaches flags and exit codes.

**Keep `script/` instead of `scripts/`.** It lost because the specification and using-scripts use `scripts/`, and only this skill ships scripts, so the migration touched one package, its tests and its docs.

**Make `land` invoke the gate.** It lost because it couples two scripts and hides the evidence path; the body states the gate as the mechanical anchor and the record carries its output.

**Keep review as a hand-written second body.** It lost because nothing detects when it is out of date; the stamp makes freshness a mechanical anchor.

## Acceptance criteria

- The landed forge passes its own gate with `--strict-budget`, and `pnpm test` and `pnpm run format:check` pass.
- The review projection is accepted; the record's review section carries the conclusion.
- Every superseded rule has one disposition above; no rule has two homes.
- The installed copies are refreshed with `pnpm run skill:refresh`; the porting appendix and `package/README.md` name `scripts/`.
- The body carries no command list or exit-code table; `--help` is the interface.

## Risks

- [The three-step note](../../implemented/process/2026-10-23-reforge-the-skill-forge-as-three-steps.md) is partially superseded: its three-step decision and "scripts are unchanged" fact no longer hold. It stays active and cross-linked; a later consolidation may remove it.
- The budget is strict and counts body tokens; an adopter relying on an inclusive whole-file estimate sees a different number.
- The same-language `--copy` path and `--allow-stale` are implemented and tested but have not run in an adopter project.
- The scripts' `--help` is the single interface description; an incomplete `--help` leaves the adopter without guidance, so the usage text is part of the contract.
- Trigger evaluation stays unverified until a client is available.
