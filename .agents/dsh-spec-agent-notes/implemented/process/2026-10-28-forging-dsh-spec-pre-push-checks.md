# Agent Note: Forging dsh-spec-pre-push-checks from the upstream dsh-pre-push-checks skill

Status: implemented

English | [中文](2026-10-28-forging-dsh-spec-pre-push-checks.zh.md)

## Problem


The package ships the forge, the decision-record, agent-experience, prose-standard and find-simplifications skills; none of them carries the pre-push check-selection discipline the DeepSeek Harness team works by, so an agent about to push either runs nothing or runs the whole repository suite reflexively. The upstream skill `dsh-pre-push-checks` states that discipline for the deepseek-harness repository in particular — its `pnpm run change-scope` report, its Git hooks, its stacked-PR tooling and its profile/snapshot layout — while the package's deliverable is a set of skills for software engineering in general. `dsh-spec-pre-push-checks` adapts it for that domain: the same selection and execution mechanism as the upstream skill, with the deepseek-harness-specific referents adapted, re-bound to an equivalent means, or dissolved where no equivalent exists.

## Decision

The package ships `dsh-spec-pre-push-checks` as a create-mode adaptation of the upstream skill at `submodules/dsh/.agents/skills/dsh-pre-push-checks/SKILL.md` (`submodules/dsh` pinned at `dsh-v0.2.1-rc.3`, `1f81c047fc48fa190a683e469daa699857e9afe8`). It keeps the upstream mechanism: confirm the checkout and branch; verify the base before inspecting scope; produce one complete outgoing-scope report; select the narrowest evidence whose regression would fail the change; do not duplicate what hooks or CI already decide; rehearse fully only in the named cases; protect history-rewriting pushes; validate immediately after an automated rewrite-and-publish; and prove environment-specific failures instead of reinterpreting them. The wording is repository-neutral: the adopter's own commands, hooks, workflows and layout conventions are discovered from its declarations, and where upstream names a deepseek-harness file, profile, snapshot tree or sibling skill, this skill generalizes the rule or leaves it to those conventions.

The landed directory holds `SKILL.md`, `scripts/change-scope.mjs` and `THIRD_PARTY_NOTICES`, mirrored to `.agents/skills/dsh-spec-pre-push-checks/`; the script's source and build wiring stay in `package/dsh-spec-pre-push-checks/`, its tests in `tests/change-scope.test.ts`, and the suite's inventory row in `tests/README.md`. The superseded upstream-named installed copy `.agents/skills/dsh-pre-push-checks/` and its manager-manifest entry are removed; the root `AGENTS.md` skills list and the adapted-skill enumeration in the root `THIRD_PARTY_NOTICES.md` name the skill. Historical release notes keep their text.

### Intent and boundaries


| Setting | Value |
|---|---|
| Name | `dsh-spec-pre-push-checks`; landed at `skills/dsh-spec-pre-push-checks/` |
| Goal | Before a push, a force-push, a ready-for-review flip or a claim that checks pass — and immediately after an automated tool rewrites and publishes branches — select and run the smallest set of tests and checks that covers the outgoing or just-published diff, instead of reflexively running the full repository suite |
| Boundary | Not a CI replacement (CI owns exhaustive coverage and the platform matrix), not a hook replacement (the repository's hooks run their own checks), not an instruction to run the full local rehearsal by default (that stays a named exception), and not a way to weaken a failing selection — lowering a threshold, excluding an affected file or suppressing a no-tests run is outside the skill (upstream L74) |
| Deliverable | The landed skill directory `skills/dsh-spec-pre-push-checks/` (`SKILL.md`, `scripts/change-scope.mjs`, `THIRD_PARTY_NOTICES`) and its installed copy; the script's source and build wiring in `package/dsh-spec-pre-push-checks/` (`change-scope.ts`, `build.ts`, `vite.config.ts`, `package.json`); its tests in `tests/change-scope.test.ts` with the suite's inventory row in `tests/README.md`; this record with its Chinese pair |
| Audience and domain | An agent working in a software-engineering repository that keeps a Git history and delivers changes through branches and a review platform |
| Additional trigger language | Chinese: the adopter's review language is Chinese, so the description appends the Chinese trigger vocabulary after the English delivery text |
| Runtime and tools | Git is required for every procedure; the bundled report also requires Node.js 22.19+ or 24+ and uses no network; no install and no build step are required for an adopter |
| Review drafts | The repository declares its bilingual companions as `.zh.md` and `.i18n.yaml` (`CONTRIBUTING.md` "Bilingual documents"); publish removed the Chinese skill draft, its pairing record and the draft-only language switcher, and this record carries its own Chinese pair |

### Landing settings

| Setting | Value | Basis |
|---|---|---|
| Skill name | `dsh-spec-pre-push-checks` | the request |
| Target domain | software engineering in a general project, not DeepSeek Harness | the request |
| Languages | English delivery; Chinese trigger keywords; the record is English with a Chinese pair | the package's bilingual practice |
| Upstream source | `submodules/dsh` at `dsh-v0.2.1-rc.3` (`1f81c047fc48fa190a683e469daa699857e9afe8`), `.agents/skills/dsh-pre-push-checks/SKILL.md` | the pinned baseline |
| Landing directory | `skills/dsh-spec-pre-push-checks/` — `SKILL.md`, `scripts/change-scope.mjs`, `THIRD_PARTY_NOTICES` | the landing convention |
| Installed copy | `.agents/skills/dsh-spec-pre-push-checks/`, refreshed with `pnpm run skill:refresh` | repository practice |
| Script source and tests | `package/dsh-spec-pre-push-checks/`; `tests/change-scope.test.ts`; the suite inventory row in `tests/README.md` | the package's script layout |
| Superseded content | `.agents/skills/dsh-pre-push-checks/` and its `scripts/dsh-spec-manager/references/manifest.json` entry are removed | the maintainer's landing order |
| Record | this note in `implemented/process/`, with its Chinese pair | the notes contract |
| Review drafts | `SKILL.zh.md` and `SKILL.i18n.yaml` were current before publish; publish removed them and the switcher line | the forge review practice |
| Branch | the forge branch was squash-merged into `refactor/dsh-skills` | the request |
| Rollback | revert the landing commit and restore the removed files from Git history | the VCS |

### Source constraints


The upstream file is the source; each unit below is a requirement, prohibition, condition or fixed choice together with its location. Units U17-U18 state a way of working followed by concrete instructions and are therefore one unit each, not a set of separate concrete rules. One implementation fact comes from the repository rather than from the upstream text: the report that U4 requires is the repository's existing port of the upstream change-scope script (`scripts/dsh-spec-manager/scripts/change-scope.ts`), whose header names the upstream path and relation.

| Unit | Location | Constraint |
|---|---|---|
| U1 | L1-4 | The description triggers the skill before pushing, force-pushing, marking ready for review, or claiming checks pass, and immediately after `gh stack sync` publishes rewritten branches; it promises the smallest tests and checks covering the outgoing or just-published diff, without reflexively running the full repository suite |
| U2 | L8 | Run relevant local evidence once before a push; the sole ordering exception is `gh stack sync` publishing before local validation; Git hooks are intentionally narrow (pre-commit fixes staged lint, checks staged whitespace, guards vendored-source metadata; pre-push runs only the incremental typecheck); CI owns exhaustive coverage and the platform matrix |
| U3 | L10-18 | Inspect the outgoing change: confirm the checkout and branch with `git status --short --branch` and `git rev-parse --show-toplevel` |
| U4 | L19-25 | Verify the live PR base or stack parent, fetch that ref, and inspect the complete scope against it; the change-scope command never guesses or fetches a base; supply the ref verified from current remote or stack state; `--head` inspects another commit; its versioned JSON records committed paths relative to the resolved merge base while staged, unstaged and untracked paths describe the worktree; after a changed base is merged, rerun the report, reassess affected behavior and rerun only the invalidated checks |
| U5 | L29 | There is no universal local baseline beyond the hooks; every behavior change needs the narrowest available test or purpose-built check that would fail for its regression; add broader checks only for surfaces the diff actually reaches |
| U6 | L31 | When the outgoing change adds or changes a resource-owning or asynchronous test, fixture, helper or CI execution path, use the CI test-reliability skill first for restoration, negative-control, quiescent-teardown or concurrent-process evidence; this skill still selects the commands and does not repeat evidence that already passed |
| U7 | L33 | Package or script behavior: run the owning test file or focused test name; add adjacent package tests when a shared contract changes; leave repository-wide coverage to CI unless the change is genuinely cross-cutting or requested |
| U8 | L34 | Remote mock typing: an unbuilt `any` is an explicit local fallback not strict evidence; run the typecheck before handing off Remote/mock changes; rebuild missing, stale or partial generated declarations before diagnosing; keep the exception in the test proxy |
| U9 | L35 | Documentation, Agent Notes, catalogs or doc-linked comments: run `doc-sync`; run full lint when the documentation workflow requires it |
| U10 | L36 | Model-, editor-, CLI- or terminal-visible output: run the focused keyless snapshot or real runnable-example scenario that owns the output |
| U11 | L37 | Expected-output placement: recorded-Session expected outputs belong under top-level `snapshots/` with the named profile and pins; other expectations stay beside their owning test under `tests/expected/`; use the owning test lane |
| U12 | L38 | Profile and configuration placement: cross-package profile behavior under `apps/cli/tests/profiles/`, package Loader composition under the package's `tests/fixtures/`, user-facing overlays under `apps/cli/config/examples/` with a guide under `docs/user/` |
| U13 | L39 | Package manifests, public exports, build configuration, worker/bin entries or built runtime paths: run `pnpm run build`, the relevant hygiene checks and the owning built-artifact smoke |
| U14 | L40 | Repository test and script types: `build:artifacts` checks package projects only; before claiming completion of TypeScript changes, run `build:check` after the latest `build:artifacts`, or run `build`; `build:check` reads existing output and never rebuilds it |
| U15 | L41 | Real provider or agent behavior: run the relevant `pnpm run test:e2e` target when credentials are available; never print secrets |
| U16 | L43 | Do not manually repeat a passing check merely because commit or push follows; in particular do not run typecheck immediately before pushing solely to duplicate the pre-push hook |
| U17 | L45-51 | Pass Vitest file and name filters directly after the `pnpm run` script name, without a standalone `--`; the rule applies to the listed pnpm scripts, other launchers keep their own forwarding syntax; check the reported selected test count before treating a filtered run as focused evidence |
| U18 | L53-74 | Test selection and coverage selection are separate; when unit coverage is relevant, name both the owning tests and the source files or packages the coverage must prove with the runner's coverage-include mechanism; configured per-file thresholds apply inside the selected scope; when owning tests are unclear, use the runner's dependency/related discovery and inspect the selection first; parameters that cannot discover behavior (configuration, dynamic loading, subprocesses, workers, built artifacts, external providers) are selected explicitly; never use no-tests suppression, lower thresholds or a narrowed include to hide an uncovered affected file; if a selected scope fails, add its owning tests or narrow the source scope only when the excluded modules cannot be affected |
| U19 | L76-78 | Run the complete local approximation only when the user explicitly requests it, while diagnosing a CI failure, or when the change spans the repository so broadly that no narrower set is credible; use the current workflow and package scripts as the inventory; do not recreate a removed aggregate |
| U20 | L80-84 | Rebase is allowed for standalone and stacked branches, including after review; before a standalone history rewrite, fetch the current remote branch and record its exact OID, then publish with `--force-with-lease=<branch>:<observed-oid>` so a concurrent update aborts; `gh stack push` and `gh stack sync` supply lease protection for managed branches; raw `--force` is never allowed; after any rewritten push, fetch the live heads and re-audit unresolved review threads, approvals, mergeability and checks; pre-rewrite hashes and inline-comment anchors are not current evidence |
| U21 | L86-95 | `gh stack sync` fetches, cascade-rebases and pushes as one operation, so local validation cannot sit between rewrite and publication; before it, require a clean worktree and record the official stack order and exact remote heads; after it, re-query every branch head and the stack order, inspect every rewritten layer's scope against its live PR base, run the selected evidence per affected layer, keep every PR unmerged and report validation pending until all selected checks pass; on failure leave the lease-protected heads in place, repair, validate, and publish the correction; the command's success is not evidence the stack is ready |
| U22 | L97-106 | On a relevant failure before an ordinary push, stop and fix or explain the blocker; do not push and hope CI differs; for the post-sync exception block the merge and follow the repair procedure; prove an environment-specific failure by recording the exact command, failing test and platform mismatch, confirming the relevant non-platform evidence, preferring a cross-platform fix, and bypassing a local hook only when the user explicitly asks or agrees while reporting what failed and why CI is expected to differ |
| U23 | L108-137 | Push procedure: run the selected checks once; commit normally and inspect files changed by the pre-commit fixer; push normally or with the exact lease; verify the remote ref matches local `HEAD`; inspect remote CI after the push and report pending as pending; when no checks are reported and no runs exist for the head, read mergeability before suspecting the push, because a conflicting PR produces no workflow runs — resolve the conflict instead of adding empty commits, toggles or revert-and-restore history, and confirm conflicting paths with `git merge-tree --write-tree HEAD origin/<base>`; for `gh stack sync` use the post-sync validation sequence instead of the ordinary order |

### Dispositions


One row per unit, one disposition label. "Basis" states the target-domain fact, the skill's purpose, the upstream text or the ruling that decides the row; a dissolve names the check that takes over.

| Unit | Disposition | Target | Basis |
|---|---|---|---|
| U1 | adapt | `description`: push, force-push, ready-for-review and checks-passed triggers kept; "a branch" replaces "a deepseek-harness branch"; "immediately after an automated rewrite-and-publish" replaces `gh stack sync`; Chinese trigger vocabulary appended | The trigger surface is the skill's whole activation burden; the adopter's review language is Chinese |
| U2 | adapt | intro paragraph: evidence runs once; the one ordering exception is an automated rewrite-and-publish; hooks are the repository's own and stay out of the selected evidence; CI owns exhaustive coverage and the platform matrix | The hook inventory and the typecheck consequence are deepseek-harness facts; their purpose (do not duplicate hooks or CI) is the constraint that carries |
| U3 | keep | "Inspect the outgoing change", step 1: confirm the checkout and branch; the two Git commands stay as written | The commands and the noun are domain-neutral; no upstream referent in this unit is deepseek-harness-specific |
| U4 | re-bind | "Inspect the outgoing change", step 2 and the bundled report: the base is the one the change is reviewed against (PR base, or the parent branch of a stack), fetched and supplied explicitly; the report is the skill's own `scripts/change-scope.mjs` with the carried contract and rerun rule | A software-engineering adopter may expose no change-scope command; the report is the mechanism, so the skill carries its equivalent means |
| U5 | adapt | "Select relevant evidence" opener: no universal local baseline beyond the repository's hooks; the narrowest failing test/check; broader checks only for reached surfaces | The rule is general; "the hooks" is the deepseek-harness instance of the adopter's own baseline |
| U6 | re-bind | A selection bullet with its condition and role intact: when the change adds or changes a resource-owning or asynchronous test, fixture, helper or CI execution path, decide whether restoration, negative-control, quiescent-teardown or concurrent-process evidence applies; this skill still selects the commands and does not repeat evidence that already passed | The referring skill belongs to another project; the evidence kinds and the selection role are the equivalent means |
| U7 | adapt | Selection bullet "Tested behavior": the owning test file or focused test name; adjacent tests when a shared contract changes; repository-wide coverage to CI unless cross-cutting or requested | The owning-test rule is domain-neutral; the runner name becomes the adopter's |
| U8 | adapt | Selection bullet "Type checking and generated types": a typed change runs the repository's typecheck before it is handed off; an unbuilt or stale generated declaration is not strict evidence — rebuild missing, stale or partial generated declarations before diagnosing remaining errors; keep a local typing exception in test support, never in production types or ambient flags | The Remote/mock proxy is deepseek-harness-specific; the run-before-handoff action and the fallback constraint survive in target-domain form |
| U9 | adapt | Selection bullet "Documentation": run the repository's documentation check; run the full lint when its documentation workflow requires it | `doc-sync` is the deepseek-harness command for the same purpose |
| U10 | adapt | Selection bullet "Observable output": the focused snapshot or real runnable-example scenario that owns the output, without the harness's keyless vocabulary | The check kind is domain-neutral; "keyless" is a property of the deepseek-harness snapshot runner |
| U11 | dissolve | Adopter conventions own expected-output placement; the owning test lane's command is the check that takes over | The target has no fixed snapshot tree or session format; a fixed path rule would be an invented mechanism |
| U12 | dissolve | Adopter conventions own profile and configuration placement; the owning configuration/profile test or documentation check takes over | Same reason as U11 |
| U13 | adapt | Selection bullet "Build and packaging": run the build, the repository's packaging/hygiene checks and the owning built-artifact smoke | The categories survive; the commands become the adopter's |
| U14 | adapt | Selection bullet "Type checking and generated types": before claiming completion of a change whose types or build inputs moved, run the check that consumes the current build output, after the build that produces it; stale output is not evidence | The `build:artifacts`/`build:check` split is the deepseek-harness realization; the order and the before-claiming condition are the constraint |
| U15 | adapt | Selection bullet "External behavior": run the owning end-to-end target when credentials or the environment are available; never print secrets | Domain-neutral once "provider or agent" becomes external behavior |
| U16 | adapt | Closing paragraph of "Select relevant evidence": do not repeat a passing check because commit or push follows; in particular do not re-run the typecheck solely to duplicate a hook | The rule is general; the named hook and typecheck are the upstream repository's instance |
| U17 | adapt | Closing paragraph: pass filters the way the launcher forwards them, keeping the pnpm form as an example; check the selected test count before treating a filtered run as evidence | The forwarding rule is general; pnpm/Vitest are the common realization and stay illustrative |
| U18 | adapt | "### Focus unit coverage on the affected source": selection and coverage are separate; name owning tests and source scope through the runner's coverage-include mechanism; thresholds still apply inside the scope; use dependency/related discovery when owners are unclear; select undiscoverable behavior explicitly; never suppress no-tests, lower thresholds or narrow the include to hide an uncovered affected file; add owning tests or narrow only when the excluded modules cannot be affected | Mechanism preserved; the concrete flags are the runner's |
| U19 | adapt | "Full local rehearsal": the three named cases survive; the inventory is the current workflow and package scripts; do not recreate a removed aggregate | `check:pre-push` is the deepseek-harness aggregate; its absence is stated generically |
| U20 | adapt | "Protect history-rewriting pushes": rebase allowed; fetch and record the OID; `--force-with-lease=<branch>:<observed-oid>`; a stack or automation tool must supply equivalent lease protection; raw `--force` never; after any rewrite, refetch and re-audit threads, approvals, mergeability and checks; pre-rewrite hashes and anchors are not evidence | The lease mechanism is general; the tool names become examples |
| U21 | re-bind | "### Validate after an automated rewrite and publish": a tool may fetch, rebase and publish as one operation, with `gh stack sync` named as the example; the before/after sequence and the repair path are carried | The mechanism (validation cannot sit between rewrite and publication) is real for any adopter whose tooling publishes for them; the deepseek-harness tool is an instance, not the mechanism |
| U22 | adapt | "Handle failures": stop and fix or explain; do not push and hope; block the merge after a failed automated publish and repair; prove an environment-specific failure with the exact command, failing test and platform mismatch, confirm the non-platform evidence, prefer a cross-platform fix, bypass a hook only when the user asks or agrees and report what failed | Domain-neutral; only the hook and CI nouns are generalized |
| U23 | adapt | "Push procedure": run the checks once; commit, inspect fixer changes, push with the lease, verify the remote ref; inspect remote CI and report pending as pending; when no checks are reported, read mergeability before suspecting the push, resolve the conflict rather than adding empty history, and confirm paths with `git merge-tree`; the automated-publish exception uses its own sequence; the GitHub commands stay inside an explicit "when the review platform is GitHub" example while the provider-neutral rule stands alone | The GitHub realization is illustrative; the constraint is provider-neutral |

Coverage: each unit has exactly one row and one home. U11 and U12 are the two dissolves; each names what takes over. No row repeats or conflicts with another, and no unit carries a label the row contradicts.

### The bundled change-scope report


The report is the mechanical half of the skill. Its source is `package/dsh-spec-pre-push-checks/change-scope.ts`, wired like the other skill packages (`build.ts` runs `vp pack`, `vite.config.ts` names the entry and the landing directory's `scripts/` output, `package.json` is the private package marker); `node scripts/build-skills.ts dsh-spec-pre-push-checks` bundles it to `skills/dsh-spec-pre-push-checks/scripts/change-scope.mjs`, the committed artifact the skill runs.

- Usage: `node <skill-dir>/scripts/change-scope.mjs --base <ref> [--head <ref>]`; it runs inside the project's Git checkout and prints one JSON report to stdout.
- Output: `formatVersion` (1), `repositoryRoot`, `input` (`base`, `head`), `resolved` (`baseSha`, `headSha`, `mergeBaseSha`) and `paths` (`committed`, `staged`, `unstaged`, `untracked`), each path list sorted and deduplicated; committed paths are relative to the resolved merge base.
- Behaviour: it never fetches and never guesses a base; an unresolvable ref, an ambiguous ref, a base and head with no merge base and a directory outside a Git worktree each fail with a message on stderr; a report exits 0, a failure exits 1, and a usage error (missing or unknown option) exits 2; `--help` prints the usage and exits 0.
- Implementation basis and adaptation: the report rendering is carried from the repository's existing verbatim port of the upstream script; the CLI surface is adapted because the `using-scripts` page requires a documented `--help` and distinct documented exit codes. The port's header records the upstream commit it was taken from (`ddefc45fbc7f8e46dd73185e68295696d1297887`); the pinned baseline `dsh-v0.2.1-rc.3` (`1f81c047fc48fa190a683e469daa699857e9afe8`) carries the same file content, so the source header and the notices name both facts. The report fields are unchanged; the two copies differ only in their command-line interface, and the adaptation is tested.
- Attribution: attribution is stated outside the loaded text. The frontmatter `license` field names the skill-root `THIRD_PARTY_NOTICES`, which carries the upstream and repository MIT notices, the adapted skill text's upstream path and pinned baseline, and the origin of `change-scope` (the port's taken-at commit, the same content at the pinned baseline). The package source header states provenance too; the bundle's comment retention plays no part.
- Tests: `tests/change-scope.test.ts` locates the landed bundle, preferring a work draft when one exists, as the suite locates the forge's bundles (`tests/skill-spec.test.ts` resolves the gate that way).

### Pages read


The Agent Skills limits were read online on 2026-10-28, not through the offline fallback:

- <https://agentskills.io/llms.txt> — the index; it links the pages below.
- <https://agentskills.io/specification.md> — directory layout, frontmatter fields and limits, progressive disclosure, file references, validation.
- <https://agentskills.io/skill-creation/best-practices.md> — grounding in real expertise, context economy, coherent scope, calibrated control, defaults, patterns.
- <https://agentskills.io/skill-creation/using-scripts.md> — one-off commands versus bundled scripts, relative script paths, self-contained scripts, non-interactive interfaces, `--help`, actionable errors, structured stdout with diagnostics on stderr; the source of the adapted CLI surface.
- <https://agentskills.io/skill-creation/optimizing-descriptions.md> — imperative, intent-focused, slightly pushy descriptions, the 1024-character limit and trigger evaluation; read to calibrate the description's trigger wording.

### Rulings

- **U11 and U12 are dissolved, not re-bound.** A fixed expected-output or profile placement has no equivalent means in an unspecified software-engineering repository: inventing a tree would be a new mechanism. The adopter's conventions and the owning test lane's command take over.
- **U6 is re-bound to evidence kinds, not to a sibling skill.** The package ships no reliability skill, so naming one would point an adopter at a skill it does not have; the evidence kinds are the portable content.
- **U21 is re-bound rather than dissolved.** Automated rewrite-and-publish tooling is a real mechanism for software-engineering adopters, and the ordering exception is part of the upstream execution mechanism the forging must keep; the tool name becomes an example.
- **The report is bundled rather than called from the adopter.** The package's architecture bundles the scripts a skill needs; the legacy engine's copy is not a deliverable and is kept only for installed skills.
- **The report's rendering is carried from the legacy engine's verbatim upstream port; its CLI surface is adapted.** The port is the same MIT-licensed upstream file the repository already carries, so the proven report contract and its provenance are kept; the `--help` and exit-code adaptation follows the script-interface guidance and is stated and tested.
- **Attribution travels outside the loaded text.** The baseline's convention makes the skill-root `THIRD_PARTY_NOTICES` the carrier and the frontmatter `license` field its pointer, because a header or a comment inside the text would be loaded as instructions; this skill follows that convention for both the adapted skill text and the ported report, and relies on no bundler comment behaviour.
- **`<skill-dir>` is the directory containing `SKILL.md`, not this package's install path.** The command needs a way to name the bundled report, but hardcoding `.agents/skills/dsh-spec-pre-push-checks` would make a generic skill assume one client's install layout; the placeholder is defined without a path so every adopter resolves it in its own tree.
- **The record uses the repository's own legacy implementation as an implementation basis, not as a design source.** The upstream skill states the requirement, that port carries its field contract, and no other source informs the record.
- **The review drafts are declared, not optional.** The repository's bilingual convention declares the two suffixes; the Chinese skill draft and its pairing record were current at the stop, publish removed them with the draft-only switcher, and this record's Chinese pair is written at landing.
- **Landing follows the maintainer's authorization.** Publish into `skills/`, mirror into `.agents/skills/`, remove the superseded installed copy and manifest entry, update the root documentation, move and pair this record, and squash-merge the branch; nothing is pushed.
- **Superseded content is removed at landing.** The upstream-named installed copy and its manifest entry go; the historical release notes and the legacy installed copies' prose stay as they are.
- **The record's Chinese pair is written at landing.** The forge deferred note pairing to the final human review; the review completed and the landing follows the package's bilingual practice.

### Landing record

- Published the work draft into `skills/dsh-spec-pre-push-checks/` with `forge.mjs publish`; the declared review drafts and the draft-only switcher did not land.
- Mirrored the landed tree into `.agents/skills/dsh-spec-pre-push-checks/` with `pnpm run skill:refresh`.
- Removed `.agents/skills/dsh-pre-push-checks/` and its `dsh-pre-push-checks` entry in `scripts/dsh-spec-manager/references/manifest.json`.
- Added the skill to the root `AGENTS.md` skills list and to the adapted-skill enumeration in the root `THIRD_PARTY_NOTICES.md`; the README describes the entry skill and is unchanged.
- Moved this note from `proposed/process/` to `implemented/process/` and wrote its Chinese pair and pairing record.
- Kept the historical release notes and the legacy installed copies' prose untouched; the `dsh-pre-push-checks` mentions there resolve as history.
- Squash-merged the forge branch into `refactor/dsh-skills`; nothing was pushed.

## Verification

This section carries the commands actually run for the landed state, their output, and the anchor mapping for every forged-skill requirement. All commands ran on 2026-10-28 in the forging worktree before the squash merge.

### Check results

- **Skill gate.** `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-pre-push-checks --name-max 64 --description-max 1024 --compatibility-max 500 --max-lines 500 --max-tokens 5000 --cjk-tokens-per-char 0.6 --other-tokens-per-char 0.3` → `14 check(s), 0 failed`; 108 lines, ~2983 tokens; description 387 characters, compatibility 146 characters, license 59 characters.
- **Report cases.** `node --test tests/change-scope.test.ts` → `tests 10, pass 10, fail 0`.
- **Repository suite.** `pnpm test` → `tests 216, pass 216, fail 0`; includes the installed-copy shape check over the six landed skills.
- **Format.** `pnpm run format:check` → `All matched files use the correct format.`, `Finished ... on 26 files`.
- **Notes tree.** `node skills/dsh-spec-agent-notes/scripts/notes.mjs check --companion .zh.md --companion .i18n.yaml` → `ok check — 34 note(s) and 68 companion(s) checked`.
- **Record pairing.** `node scripts/dsh-spec-manager/scripts/dsh-spec.ts translation-pair check .agents/dsh-spec-agent-notes/implemented/process/2026-10-28-forging-dsh-spec-pre-push-checks.md` → `1 named pair(s) consistent`; `check translation-pair: ok`.
- **Installed copies.** `pnpm run skill:refresh` → `6 skill(s), 0 failed`; every landed skill has an identical installed copy.
- **Superseded content.** `git status --porcelain -uall` reports no stray file; `.agents/skills/dsh-pre-push-checks/` and the manifest entry are gone; nothing was pushed.

### Design audit, review and prose audit

- **Design audit.** The design was audited independently before implementation and accepted on 2026-10-28; its blocking findings were resolved in the design.
- **Independent implementation review.** The implementation, including the attribution convention and the prose-audit fixes, was reviewed independently and accepted on 2026-10-28; its findings were resolved before landing. The review covered the skill gate, the report cases, the full suite, the format and notes checks, the bundle probes and the constraint check.
- **Prose audit.** The durable texts were audited against `dsh-spec-prose-standard` on 2026-10-28; its findings were applied before landing.
- **Base and attribution convention.** The baseline carries `dsh-spec-prose-standard` and states the attribution convention in `THIRD_PARTY_NOTICES.md`: a skill whose text is carried or adapted declares a `license` field naming a skill-root `THIRD_PARTY_NOTICES`. The landed frontmatter declares that field, the skill carries a `THIRD_PARTY_NOTICES` covering the adapted text and the ported report, and the `<skill-dir>` clause names no package install path.
- **Review scope.** The review acceptance covers the implementation; the landed tree adds no draft-only content — publish removed the switcher with the review drafts, and this record's Chinese pair is submitted with the landing.

### Anchors per requirement


| Requirement | Anchor | Evidence |
|---|---|---|
| U1 description triggers | judged | Independent review accepted the description wording; the trigger rate is the unverified item below |
| U2 intro: evidence once, one ordering exception, hooks/CI ownership | judged | Independent review, mechanism walk U1-U23 |
| U3 inspect step 1 | judged | Independent review |
| U4 verified base and the report contract | mechanical | `node --test tests/change-scope.test.ts` (10 pass); probes of `--help`/0, a report/0, failures/1, usage/2 |
| U5 narrowest evidence | judged | Independent review |
| U6 asynchronous/resource-owning evidence bullet | judged | Independent review |
| U7 tested behavior bullet | judged | Independent review |
| U8 typecheck and generated types | judged | Independent review |
| U9 documentation bullet | judged | Independent review |
| U10 observable output bullet | judged | Independent review |
| U11 and U12 dissolved placement rules | judged | Independent review verified that no fixed output tree or profile path is carried |
| U13 build and packaging bullet | judged | Independent review |
| U14 current build output before claiming completion | judged | Independent review |
| U15 external behavior bullet | judged | Independent review |
| U16 no repeated check, no hook duplication | judged | Independent review |
| U17 filter forwarding and selected count | judged | Independent review |
| U18 coverage focus | judged | Independent review |
| U19 full local rehearsal | judged | Independent review |
| U20 history-rewriting protection | judged | Independent review |
| U21 automated rewrite and publish validation | judged | Independent review |
| U22 failure handling | judged | Independent review |
| U23 push procedure | judged | Independent review |
| Agent Skills specification and budget | mechanical | `14 check(s), 0 failed`; 108 lines, ~2983 tokens |
| Attribution travels with the skill | mechanical | The landed `license` field names `THIRD_PARTY_NOTICES`; the file carries the upstream and repository notices plus the adapted text's and the port's origins |
| Repository suite and format | mechanical | `pnpm test` 216/216; `pnpm run format:check` clean |
| Review drafts removed at landing | mechanical | `publish` reports the declared drafts removed; the draft-only switcher is absent from the landed `SKILL.md` |
| Record paired | mechanical | `translation-pair check` reports 1 named pair consistent |
| Trigger quality | unverified | No trigger-evaluation harness in this repository; the human review judges the description |

## Unverified items

- **Trigger quality.** No trigger-evaluation harness exists in this repository, so the description is not measured over realistic should-trigger and should-not-trigger queries; the gate checks its length and shape only, and the human review judges the wording. Reason: no harness, no model access in the suite.
- **Adopter surface coverage beyond GitHub.** The push procedure keeps GitHub commands as its examples; how far they apply to another review platform is judged, not checked. Reason: the target is any software-engineering repository, and no second platform is available in this repository.
- **Windows portability of the report.** The suite runs on Linux and macOS-class platforms only; the report's path and line-ending handling is not exercised on Windows. Reason: no Windows runner was available.

## Alternatives considered


**Carry the upstream skill nearly verbatim, with only the repository name changed.** It lost because the deepseek-harness commands, hook inventory, profile/snapshot placement, sibling-skill reference and stacked-PR tooling are referents a software-engineering adopter does not have; leaving them in would make the skill instruct commands that fail, which is the opposite of the package's purpose.

**Dissolve every mechanism that does not exist in this repository.** It lost because the check-selection mechanism is what the skill is for: dropping the change-scope report, the lease-protected rewrite or the automated-publish validation would leave generic advice where the upstream skill has an executable procedure. The disposition table keeps the mechanism and adapts only its value or name.

**Rely on the adopter's own change-scope command and write no script.** It lost because the new skill set is self-contained per skill and the legacy engine that currently carries the report is kept only while the old installed skills call it; an adopter that installs this skill alone would otherwise have no report command. The equivalent means is bundled with the skill so the procedure is executable with only Git and Node.

**Keep the prose-only Git commands for the scope inspection instead of bundling a report.** It lost because U4's report is a fixed, versioned structure the rest of the selection reads from, and two executors writing their own `git diff` pipeline would not reach the same set of paths (merge-base resolution, staged/unstaged/untracked separation, path encoding). A command the skill ships is the mechanical anchor; the judgment stays prose.

**Ship the ported report verbatim, without `--help` and with a single failure exit.** It lost because the `using-scripts` page makes a documented `--help` and distinct documented exit codes part of an agent-usable script; a verbatim copy would also make the skill's stated interface false. The adaptation is bounded to the CLI wrapper, recorded in the source header and the notices, and tested; the report rendering stays untouched.

**Land without removing the superseded installed copy.** It lost because the upstream-named copy would stay installed beside its replacement, the manifest would still advertise it, and two descriptions would compete; the maintainer's landing order removes it and its manifest entry.

**Keep the record English-only.** It lost because every landed forging record in this repository carries its Chinese pair and the notes contract allows companions; the landing follows that practice.

## Consequences

- **Transitional duplication.** The report exists twice while the legacy engine lives: once under `scripts/dsh-spec-manager/` and once in the landed skill. The engine copy is left untouched while the original installed skills call it, and the skill copy is the one the new architecture owns and the one that carries the notices; when the engine retires, the skill copy is the only one.
- **The report differs from the upstream port in its command-line interface.** The CLI adaptation (`--help`, exit codes) diverges from the legacy copy while the report rendering does not. The divergence is small, recorded in the source header and the notices, and covered by tests; a future reader should not assume the two copies are interchangeable.
- **The generic selection bullets can read as a checklist.** Upstream's concrete surfaces make the skill useful; generalizing them can produce advice an agent already knows. The dissolve rows leave adopter conventions to the adopter instead of inventing paths, and the review keeps an item only when the agent could get it wrong without the skill.
- **The report is not proven on Windows.** The implementation handles CRLF and NUL-delimited path bytes and rejects non-UTF-8 Git output, but the tests run on Linux only; a Windows path or encoding defect would surface for an adopter first.
- **An adopter that also installs upstream `dsh-pre-push-checks` sees two similar descriptions.** The generic description leads with the same moments and the automated-publish trigger; which skill activates is the harness's choice. This repository removes the upstream-named installed copy, so its own cost is gone.
- **What the skill gives up.** It states no stack-validation sequence as detailed as the upstream one, no repository-specific path rules, and no guarantee about a platform's CI behaviour beyond the GitHub example it names. Those are the deliberate dissolves and adaptations; an adopter that needs them keeps its own documentation.
- **Landing removes content.** The upstream-named installed copy and its manifest entry are gone; a project that relied on them has the new skill's bundled report instead. The historical release notes are the only remaining prose that presents the old skill as shipped.
- **The record's pair adds maintenance.** The notes gate checks the pair structurally and the pairing gate its hashes, so an edit to either side must be mirrored and re-recorded in the same change.
