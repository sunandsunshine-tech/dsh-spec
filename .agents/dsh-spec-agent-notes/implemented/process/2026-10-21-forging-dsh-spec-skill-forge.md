# Agent Note: Forging dsh-spec-skill-forge as a composition-first skill

Status: implemented

English | [中文](2026-10-21-forging-dsh-spec-skill-forge.zh.md)

## Problem

The previous forge was a five-step procedure with four references and a self-shipped gate. Its adaptation and budget decisions were split across process stages, and the draft, record, description and skill-directory layout did not follow a single composition rule. The forge needed to derive the target skill from Docs, SOP and Script, expose the skill structure and nested steps, and make the final assertion a specification check with a budget route.

## Decision

The forge is a three-step SOP: intent recognition, collection/analysis/disposition of Docs/SOP/Script, and recomposition. Recomposition has two nested steps, 重组 and 完成 Script, each with its own completion judgment, check method and failure recovery. The parent step asserts that both sub-steps are complete. 重组 states the skill structure, generates the body fully inline, extracts global definitions, rules and outcome assertions, then tidies.

The skill structure has six layers: trigger condition, skill definition and boundary, global definitions, global rules, SOP steps and outcome assertions. Layer-internal form is unrestricted. The default format uses 顿号 or commas for parallel words, lists or tables for conditions and branches, and tables for structured content. An adopter's declaration may override the default.

SOP steps may nest. Every level has its own task, the Docs and Script it needs, a completion judgment, a check method and failure recovery. Sub-steps use the next numbering level, and a parent's completion judgment covers its sub-steps.

The outcome assertion requires the forged skill to satisfy global rules, every SOP step's assertions, the [Agent Skills specification](https://agentskills.io/specification) and [best practices](https://agentskills.io/skill-creation/best-practices). Mechanically decidable checks use `script/verify-skill-spec.mjs`; `--help` lists what it supports. When the script does not support a check, a temporary script judges it, and non-mechanical parts are judged directly. Check parameters come from the specification and best practices.

The checker parses frontmatter as YAML with the bundled `yaml` parser. It validates syntax and mapping shape, required and optional field types, metadata string keys and values, duplicate keys, `allowed-tools` spacing, name and description limits, directory and link rules, reference and script mentions, and the line and token budget. Default token estimates are 0.6 tokens per Chinese character and 0.3 per English character. When the body exceeds the budget, the forge compresses wording without losing precision, extracts only genuinely optional material, then routes every SOP step whole into `references/<step>.md`. The body keeps step order and each step reference; assertions and dependencies move with the step. After each adjustment the checker reruns, and an adjustment made by the outcome assertion reruns the skill's SOP.

The default forge directory is `.agents/dsh-spec-skill-forge/`, with `record/<name>.md`, `draft/<name>/` and `review/<name>/`. The declaration may override each default. Language uses the defaults: delivery English, review the adopter's language (Chinese here), and additional trigger language the review language. The work draft and landed artifact are English with a Chinese trigger. A review draft is Chinese with an English trigger. Reviews are projections, not new judgments.

A skill's script source lives under `package/<name>/` with a `vite.config.ts` that names the bundle entries. `pnpm run skill:build` bundles them into the work draft's `script/`; `pnpm run skill:review` mirrors that script into the review draft; `pnpm run skill:land` copies the accepted work draft into the landing directory and removes only the work draft and the review draft; `pnpm run skill:refresh` refreshes the installed copies. The forge's gate source is `package/dsh-spec-skill-forge/verify-skill-spec.ts` and its lifecycle source is `package/dsh-spec-skill-forge/forge.ts`; the landed scripts are `skills/dsh-spec-skill-forge/script/verify-skill-spec.mjs` and `skills/dsh-spec-skill-forge/script/forge.mjs`.

### Forging settings

| Setting | Value |
|---|---|
| Mode | iteration; the skill applied to itself |
| Upstream | the previous five-step skill and its references, a 318-line Chinese backup that was removed, the prior implemented note, and the design conversation |
| Draft parent / forged skill's parent | `.agents/dsh-spec-skill-forge/draft/` / `skills/dsh-spec-skill-forge/`; the draft and review were removed after landing, and the shared directories stayed |
| Languages | defaults: delivery English, review Chinese (the adopter's language), additional trigger Chinese; landed artifact English with a Chinese trigger |
| Description | English trigger sentence plus a Chinese trigger; no body concepts; no "explain/completed" |
| Record | this note |
| Acceptance | the driver accepted the review draft and the skill landed on 2026-10-22 |

### Dispositions

| Upstream item | Disposition | Location | Basis |
|---|---|---|---|
| Five-step procedure (converge, anchor, draft/dispose, script, verify/route) | Re-bind | Three-step SOP; the composition core is step 3 | The composition rule, not the old process stages, is the skill's definition |
| Four references and the self-shipped gate | Adapt | Inline rule sections; bundled gate; target project's checker | Self-contained skill and SSOT |
| Draft/driver interaction (show diff, accept per exchange) | Re-bind | Work draft + review draft; hard red lines and final review reach the driver; other decisions are rulings | The driver's attention is zero outside hard red lines and final review |
| Draft/target/request languages and rendition | Adapt | Delivery, review, additional trigger; review projection | Agent Skills description triggers; work/review pair |
| Step-level verification and final checklist | Re-bind | Skill-spec assertion and over-budget routing in `成果断言` | The final result is the only object not assertable mid-process |
| Resource routing (reference when optional) | Re-bind | Three-level placement; reference only when truly optional, loadable and cohesive | A reference that must be loaded anyway adds cost without benefit |
| Script packaging as a separate step | Re-bind | Inside recomposition as 3.2; not a top-level SOP step | The composition step owns the target skill's resources |
| Semicolon chains and over-fragmented lists | Adapt | 顿号 for parallel words; lists or tables for conditions and branches | The format rule owns the form |
| Record as the project's decision mechanism | Keep | This Agent Note | The repository declares the notes form in `AGENTS.md` |

### Verification

`node skills/dsh-spec-skill-forge/script/verify-skill-spec.mjs skills/dsh-spec-skill-forge --strict-budget --name-max 64 --description-max 1024 --compatibility-max 500 --max-lines 500 --max-tokens 5000 --cjk-tokens-per-char 0.6 --other-tokens-per-char 0.3` → 11 checks, 0 failed, 181 lines, ~3,421 tokens, strict budget passes. The script defaults report ~3,496 tokens and also pass. Three SOP steps are routed whole into `references/` to keep the body inside budget.

The checker parses frontmatter with the bundled `yaml` parser; its tests cover invalid YAML, non-mapping frontmatter, duplicate keys, field types, metadata maps, `allowed-tools` spacing and the numeric parameters. `pnpm test` → 82 pass, including 27 lifecycle cases and 6 installed-copy cases. `pnpm run skill:build` writes both scripts into the work draft, and `pnpm run skill:land` copies that work draft into `skills/dsh-spec-skill-forge/`. `dsh-spec notes check --all` → 24 active notes, `notes-archived check --all` → 6 frozen artifacts, and the named translation pairs and changed Markdown links check clean. `dsh-spec check --all` still reports a pre-existing `norm-reference` failure because the branch has no `.agents/skills/dsh-spec-manager/references/norms.json`; that is the installed-skills state, not this skill.

External trigger quality, cold start and task utility remain unverified: this environment has no agent harness in the target audience's environment. They are recorded as a gap, not a pass.

### Review and landing

The review draft was generated in Chinese with an English trigger at `.agents/dsh-spec-skill-forge/review/dsh-spec-skill-forge/`. The driver accepted it, the work draft was copied into `skills/dsh-spec-skill-forge/`, the installed copies were refreshed, and the draft and review directories were deleted; only this skill's `draft/<name>/` and `review/<name>/` were removed, and the shared directories stayed.

## Alternatives considered

**Keep the five-step procedure and compress it.** It lost because the corrections moved the skill's identity to the Docs/SOP/Script composition rule and the skill structure; compressing the old stages would preserve the process shape and keep draft/verification rules mixed into the steps.

**Keep the four references and the self-shipped gate.** It lost because the skill is one self-contained skill with its bundled checker; a second gate would be a second authority for the same rules.

**Keep the old language model with no review draft.** It lost because driver review before landing was an explicit correction: the review draft is where the driver sees the result, and the work draft must not land unreviewed.

**Let the result assertion repeat the global rules and step assertions.** It lost because those are already checkable during the process; the result assertion exists for the outcome no step can judge.

**Keep a custom draft home.** It lost because the repository uses the skill's default forge directory, and the record must be an Agent Note, not a second file in the draft directory.

**Build directly into `skills/`.** It lost because `skills/` is the landing target; a direct build can differ from the reviewed draft. The build now targets the work draft, the review draft copies that script, and landing copies the accepted draft.

**Use a second independent pack for `skills/`.** It lost for the same reason: two pack targets can diverge. Landing copies the accepted bytes instead of rebuilding them.

## Consequences

The forge is smaller in shape and has one composition rule, one skill structure, nested step assertions, a specification-linked outcome assertion and a parameterized checker. The YAML parser and its bundle add about 240 KB to the landed script, but the skill stays self-contained and needs no install.

The body is 181 lines and about 3,421 tokens because the SOP steps are routed whole into three references. The body keeps the step order and references; loading a step now needs its reference. That is the budget route's deliberate cost.

The work/review/landing flow keeps `skills/` equal to the accepted draft. The trade-off is that tests target the work draft while it exists and fall back to the landed script after landing.

The remaining evidence gap is external: trigger quality, cold start and representative-task utility have not run in an agent harness.

## Related

- [Forging dsh-spec-skill-forge (2026-10-19, archived)](../../archived/process/2026-10-19-forging-dsh-spec-skill-forge.md) — the previous five-step record this note supersedes.
- [The draft lifecycle belongs to the forging skill (2026-10-22)](2026-10-22-the-draft-lifecycle-belongs-to-the-skill.md) — the lifecycle CLI and the package command structure that implements the Drafts rule.
