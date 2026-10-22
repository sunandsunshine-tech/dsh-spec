# Agent Note: Forging dsh-spec-skill-forge as a composition-first skill

Status: proposed

English | [中文](2026-10-21-forging-dsh-spec-skill-forge.zh.md)

## Problem

The shipped forge is a five-step procedure with four references and a self-shipped gate. The current branch carries an English work draft with a Chinese trigger, three references and a bundled checker that restructures the skill around the Docs/SOP/Script composition rule and the skill structure, with work/review drafts, a skill-spec assertion and budget routing. Before this proposal, the draft sat under `docs/skill-draft/`, there was no forging record, the description had no second trigger language, and the backup was inside the draft directory; that commit state did not follow the skill's own rules for the draft, record, description, or skill directory layout. The shipped skill and [its implemented note](../../implemented/process/2026-10-19-forging-dsh-spec-skill-forge.md) remain in place.

## Proposal

Rebuild the forge around the composition rule, not the five-step procedure. The SOP is three steps: intent recognition, collection/analysis/disposition of Docs/SOP/Script, and recomposition. Recomposition has two sub-steps, 重组 and 完成 Script, each with its own completion/check/failure; the big step asserts that both sub-steps are complete. 重组 first states the skill structure — trigger condition, skill definition and boundary, global definitions, global rules, SOP steps, outcome assertions — then derives the trigger condition, skill definition and boundary, and all SOP steps and their content from the disposed three-element analysis, fully inline. SOP steps may nest: each level follows the same structure, and a parent step's completion judgment covers its sub-steps. Under SSOT and unambiguity the forge extracts global definitions, global rules, and outcome assertions from that fully inlined SOP, and tidies the skill structure. 完成 Script then works against the adopter's environment: a missing runtime or tool is a hard red line, so the forging stops for the driver and resumes after the environment is supplied. The `成果断言` section requires the final skill to satisfy the global rules, every SOP step assertion, the [Agent Skills specification](https://agentskills.io/specification), and [the best practices](https://agentskills.io/skill-creation/best-practices). It links both pages; mechanically decidable checks run through the parameterized script. Its substantive content is the over-budget route: compress wording without losing precision, extract only genuinely optional material by resource-and-ownership, then route every SOP step to `references/<step>.md`, rerunning the skill after any adjustment. The draft is moved to `.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/`; the record is this Agent Note.

The language settings use the defaults. Delivery language is English, review language is the adopter's language (Chinese here), and the additional trigger language is the review language. The work draft and landed artifact are English with a Chinese trigger; a review draft, when made, is Chinese with an English trigger. The review draft is a projection, not a new judgment. The format rules are defaults and the declaration can override them. Parallel words use 顿号 inside a sentence; conditions and branches use lists or tables; structured content uses tables; layer-internal prose form is unrestricted; semicolon chains are removed. The four disposition rungs are defined in step 2.5, the second layer is renamed `技能定义与边界`, and the work draft lands only after the driver accepts the review draft; a change request or rejection never lands. After landing, the draft directory (including `review/`) is deleted.

The default forge directory is `.agents/dsh-spec-skill-forge/` at the project root. It holds `record/<name>.md`, `draft/<name>/` and `review/<name>/`. The declaration can override each default; this repository uses the defaults, so the current draft is at `.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/` and the review draft at `.agents/dsh-spec-skill-forge/review/dsh-spec-skill-forge/`. The adopter uses Vite+ and Node. A skill script source lives under `package/<skill-name>/`. `vp run build:work` bundles it into the work draft's `script/`, `vp run copy:review` copies it into the review draft, and `vp run land:skills` copies the accepted work draft into `skills/<skill-name>/` after review. Repository scripts under `scripts/` run directly. The forge's own gate source is `package/dsh-spec-skill-forge/verify-skill-spec.ts`; its work draft artifact is `.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/script/verify-skill-spec.mjs`. Resources follow three levels: step-dependent to the step, whole-skill-dependent to the corresponding global home, and a reference only for genuinely optional material that can be loaded on demand and is cohesive when extracted. Unresolved decisions are rulings recorded here. The driver is not asked during the forging except for hard red lines and the final review: a hard red line is a condition that cannot continue without changing the environment or an irreversible operation — unauthorized overwriting or deletion of an existing skill, writing a declared place, a file/network/Git action the environment forbids, a missing Script runtime or tool, or a source purpose conflicting with a domain red line. The forging stops with the blocker, attempted rulings, and reversible options. Script completion covers runtime, dependencies, input/output/exit codes, test or unverified, idempotence and `--dry-run`, and placement under `script/`.

### Forging settings

| Setting | Value |
|---|---|
| Mode | iteration; the skill applied to itself |
| Upstream | the shipped skill and its four references, a 318-line Chinese backup that has been removed, the prior implemented note, and the design conversation |
| Draft parent / forged skill's parent | `.agents/dsh-spec-skill-forge/draft/` / `skills/dsh-spec-skill-forge/` |
| Languages | defaults used: delivery English; review Chinese (the adopter's language); additional trigger Chinese; work draft and landed artifact English + Chinese trigger; review draft Chinese + English trigger, generated |
| Description | English trigger sentence plus a Chinese trigger; no body concepts; no "explain/completed" |
| Record | this note |
| Acceptance | pending driver review |

### Dispositions

| Upstream item | Disposition | Location | Basis |
|---|---|---|---|
| Five-step procedure (converge, anchor, draft/dispose, script, verify/route) | Re-bind | Three-step SOP; the composition core is step 3 | The composition rule, not the old process stages, is the skill's definition |
| Four references and the self-shipped gate | Adapt | Inline rule sections; target project's structure checker; no second gate | Self-contained draft and SSOT |
| Draft/driver interaction (show diff, accept per exchange) | Re-bind | Work draft + review draft; hard red lines and the final review reach the driver; other decisions are rulings | The driver's attention is zero outside hard red lines and final review |
| Draft/target/request languages and rendition | Adapt | Delivery, review, additional trigger; review projection | Agent Skills description triggers; work/review pair |
| Step-level verification and final checklist | Re-bind | Skill-spec assertion and over-budget routing in `成果断言`; no repetition of earlier checks | The final result is the only object not assertable mid-process |
| Resource routing (reference when optional) | Re-bind | Three-level placement; reference only when truly optional, loadable, and cohesive | A reference that must be loaded anyway adds cost without benefit |
| Script packaging as a separate step | Re-bind | Inside recomposition as 3.2; not a top-level SOP step | The composition step owns the target skill's resources |
| Semicolon chains and over-fragmented lists | Adapt | 顿号 for parallel words; lists or tables for conditions and branches | The format rule owns the form |
| Record as the project's decision mechanism | Keep | This Agent Note | The repository declares the notes form in `AGENTS.md` |

### Verification

`node .agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/script/verify-skill-spec.mjs .agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge --strict-budget --name-max 64 --description-max 1024 --compatibility-max 500 --max-lines 500 --max-tokens 5000 --cjk-tokens-per-char 0.6 --other-tokens-per-char 0.3` → 11 checks, 0 failed, 181 lines, ~3,363 tokens, strict budget passes. The script defaults report ~3,437 tokens and also pass. Three SOP steps are routed whole to `references/` to keep the body inside budget. The review draft is generated at `.agents/dsh-spec-skill-forge/review/dsh-spec-skill-forge/` and is not re-judged. The checker parses the frontmatter as YAML with the bundled `yaml` parser: syntax and mapping shape, required and optional field types, metadata string keys and values, duplicate keys and `allowed-tools` spacing. `vp run build:work` → deterministic work draft `script/verify-skill-spec.mjs`; `vp run copy:review` → identical review script; `node --test 'tests/**/*.test.ts'` → 47 pass; `notes check --all` → 24 notes; the named translation pairs and the changed Markdown files' links check clean. `dsh-spec check --all` still reports a pre-existing `norm-reference` failure: this branch has no `.agents/skills/dsh-spec-manager/references/norms.json`; that is the installed-skills state, not this draft, and `.agents/skills/` was not edited. External trigger quality, cold start and task utility are not part of the skill-spec assertion; they remain unverified.

### Review status

Review draft generated at `.agents/dsh-spec-skill-forge/review/dsh-spec-skill-forge/`, awaiting driver review. The work draft has not landed. The shipped skill at `skills/dsh-spec-skill-forge/` is unchanged. It still carries its landed gate until `vp run land:skills` after acceptance.

## Alternatives considered

**Keep the five-step procedure and compress it.** It lost because the corrections moved the skill's identity to the Docs/SOP/Script composition rule and the skill structure; compressing the old stages would preserve the process shape and keep draft/verification rules mixed into the steps.

**Keep the four references and the self-shipped gate.** It lost because the draft is one self-contained skill with its bundled checker; a second gate would be a second authority for the same rules.

**Keep the old language model (draft/target/request) with no review draft.** It lost because the driver review before landing was an explicit correction: the review draft is the only place the driver sees the result, and the work draft must not land unreviewed.

**Let the result assertion repeat the global rules and step assertions.** It lost because those are already checkable during the process; the result assertion exists for the outcome no step can judge.

**Keep a custom draft home.** It lost because the repository uses the skill's default forge directory for the draft, and the record must be an Agent Note, not a second file in the draft directory.

## Acceptance criteria

- The work draft lives at `.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/SKILL.md`; the review draft lives at `.agents/dsh-spec-skill-forge/review/dsh-spec-skill-forge/SKILL.md`.
- The description contains an English trigger sentence and a Chinese trigger, with no body concepts and no "explain/completed" wording.
- Parallel words use 顿号 inside a sentence; conditions and branches use lists or tables; the body has no semicolon chains.
- The skill body passes the structure checker with 11 checks, 0 failed.
- The forging record is this Agent Note, with its Chinese counterpart and sidecar; `notes check` and `translation-pair check` pass.
- The driver reviews and accepts the review draft; only then does the work draft replace `skills/dsh-spec-skill-forge/`.
- `vp run build:work` produces the work draft script with `yaml` bundled. `vp run copy:review` copies it unchanged to the review draft. The suite runs against the work draft script. `vp run land:skills` is the landing step after acceptance.
- Frontmatter YAML syntax, field types, metadata string keys and values, duplicate keys and `allowed-tools` spacing are checked mechanically.
- The body passes `--strict-budget` with the current specification parameters: 64 name, 1024 description, 500 compatibility, 500 lines, 5,000 tokens at 0.6 CJK / 0.3 other tokens per character.
- External trigger quality, cold start and task utility are not part of the skill-spec assertion; they remain unverified.

## Risks

The current-spec body is 181 lines and ~3,363 tokens and passes `--strict-budget`; the script defaults also pass at ~3,437 tokens. Language uses the defaults: delivery English, review Chinese, additional trigger Chinese. The body keeps the step order and each step reference; the three SOP steps have been routed whole to `references/`, with their assertions and dependencies. External trigger quality, cold start and task utility are not part of the skill-spec assertion and remain unverified, so the structure pass is not evidence that the skill works. The proposal partially supersedes the shipped five-step skill; the old implemented note stays current until this proposal ships. The shipped skill is unchanged and remains the rollback point. Its gate is updated only by `vp run land:skills` after acceptance. The staged paths are being moved and re-staged.

## Related

- [Forging dsh-spec-skill-forge (2026-10-19, implemented)](../../implemented/process/2026-10-19-forging-dsh-spec-skill-forge.md) — the record of the shipped five-step skill this proposal would replace.
