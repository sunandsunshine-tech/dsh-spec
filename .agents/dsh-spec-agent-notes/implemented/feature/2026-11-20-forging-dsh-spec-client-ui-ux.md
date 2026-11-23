# Agent Note: Forging dsh-spec-client-ui-ux from the DSH UI skills

Status: implemented

English | [中文](2026-11-20-forging-dsh-spec-client-ui-ux.zh.md)

## Problem

The skill set covers review, delivery, prompts, durable prose, and project instructions, but it has no project-level procedure for validating a browser-rendered UI change. Code review can read the diff, and a test suite can pass, while the assembled page still clips an action, loses a state, affects an untraced consumer, or is claimed visually accepted without rendered evidence.

DeepSeek Harness carries a mature UI change workflow and responsive interaction rules. Their mechanism transfers, but the source text names DSH tokens, client packages, product pages, platform clearance variables, a designer roster, and a mandatory GUI GIF policy. Copying that text would give an adopter another project's visual system and review policy.

## Decision

The package ships `dsh-spec-client-ui-ux` as a project-level browser UI change review skill. It owns impact-scaled inspection, minimum rendered checks, shared-component consumer tracing, responsive and input-state coverage, comparison preservation, evidence reporting, and honest handoff for uninspected scope. The `Trace every affected consumer` section owns the detailed consumer set, inherited variants and wrappers, and the affected/inspected/unverified report; the scope and minimum-check sections point to that owner instead of restating it.

The adopting project owns its visual system, component APIs, supported browsers, supported themes and widths, localization mechanism, approval policy, and exact design values. The skill reads those declarations and does not introduce a second token system or a style catalog.

A user-visible browser UI behavior change produces recorded browser evidence by default. The skill states the generic requirement without naming an evidence implementation; a tool-specific recording skill added by a dependent layer may provide an availability-qualified example. A project may declare an equivalent evidence form. Missing rendered evidence or recording capability produces an explicit handoff instead of a visual-completion claim.

The skill is one `SKILL.md` with a skill-root `THIRD_PARTY_NOTICES`. It ships no script and depends on no sibling skill. The installed copy mirrors the landed directory.

- Delivery and language: English skill text with Chinese trigger keywords in the description.
- Default: inspect the actual rendered UI; a user-visible browser UI behavior change records browser evidence in one isolated run unless the project supplies an equivalent form or override.
- Boundary: this skill does not generate a visual identity, curate styles or palettes, replace a general web-guidelines audit, or make unrelated UI changes.

## Source and revision

Upstream source is `deepseek-ai/deepseek-harness` at `dsh-v0.2.3-alpha.2` (`4b399c39a6d1479cd84ca591b4d7c88e24d38a96`), read on 2026-11-23:

- `.agents/skills/dsh-client-ui-ux/SKILL.md`
- `.agents/skills/dsh-client-ui-ux/references/alignment.md`
- `.agents/skills/dsh-client-ui-ux/references/icons.md`
- `.agents/skills/dsh-client-ui-ux/references/spacing.md`
- `.agents/skills/dsh-responsive-ui/SKILL.md`
- `.agents/skills/record-browser-gif/SKILL.md`

The Agent Skills overview, specification, best-practices, description-optimization, and evaluation pages were read at <https://agentskills.io/> on 2026-11-20.

Publish authorization: the maintainer authorized landing this skill in the package and opening its subissue and pull request.

## Target rulings

| # | Ruling | Why | Reversible by |
|---|---|---|---|
| R1 | The target is a project-level web UI review skill for software projects, not a DSH client-development skill. | A general project supplies its own design system, supported surfaces, and review policy. | Restore source product scope and a fixed system. |
| R2 | The project's declarations own visual and component rules; the skill owns the rendered-evidence workflow and the required checks when the project leaves a choice open. | The workflow transfers while another project's tokens, values, paths, and approvals do not. | Bind the skill to one project's design system. |
| R3 | Recorded browser evidence is the default for a user-visible browser UI behavior change. The project may declare screenshots, video, or another equivalent form; a screenshot pair records two states, and a labeled fixture is controlled evidence rather than an assembled-application pass. Missing evidence or capability is a handoff. | A rendered behavior cannot be established from CSS, source, or unit tests alone, while capture and encoding mechanics remain replaceable. | Remove the default or treat missing evidence as success. |
| R4 | This skill owns the evidence requirement, affected-scope analysis and rendered-result review. The selected evidence mechanism owns capture, encoding, encoding validation and publication; it is not a dependency of the review procedure. | Every skill installs independently, and a project may supply another recording mechanism. | Merge one media implementation into the review skill or make it mandatory. |
| R5 | The skill remains prose-only. | Inspection, design judgment, and consumer coverage are semantic decisions; no project-independent command decides them. | Bundle a script when a new requirement becomes mechanically decidable. |
| R6 | External design-generation and general UI-guideline systems remain outside this skill. Taste Skill, UI UX Pro Max, and frontend-design may inform visual craft, but none owns this project's supported consumers, states, evidence policy, or rendered acceptance. A source-only refactor that explicitly excludes rendered review is outside this skill's trigger boundary. | They answer different questions: visual direction, general rule compliance, and source-only edits without rendered review do not call for project-level rendered verification. | Merge a concrete external capability into this skill or trigger on review-excluded source refactors. |
| R7 | The inspection is recursive but bounded: trace changed consumers and check only states, themes, widths, and data the change can affect. `Trace every affected consumer` is the single detailed owner of conditional variants, composition wrappers, feature flags, generated outputs, and the inspected/unverified consumer report. | A fixed matrix is expensive and incomplete; one isolated example is also insufficient for shared changes. A single owning section prevents the impact table and minimum checks from drifting. | Replace impact scaling with a universal checklist or a fixed screenshot count, or spread the detailed consumer rule back across sections. |

## Constraint dispositions

| # | Source | Constraint | Disposition | Target and basis |
|---|---|---|---|---|
| D1 | `dsh-client-ui-ux/SKILL.md:11-32` | Choose review effort by change impact; ordinary local changes do not require a full design audit, and every review runs its applicable project tests. | Adapt | `## Scale inspection to impact` and the closing minimum-check paragraph; the impact ladder and test command are project-owned. |
| D2 | `dsh-client-ui-ux/SKILL.md:21-28` | Minimum checks cover color, layout, interaction states, and shared consumers. | Adapt | `## Minimum rendered checks`; DSH state names become the project's affected-state inventory. |
| D3 | `dsh-client-ui-ux/SKILL.md:23,28` | Inspect the assembled page and affected neighbors rather than CSS or an isolated component. | Keep | Opening and `Trace every affected consumer`; the impact table and minimum checks reference that owner. |
| D4 | `dsh-client-ui-ux/SKILL.md:30` | Missing scenes are disclosed and a fixture is only partial evidence. | Keep | Default evidence section and report requirements. |
| D5 | `dsh-client-ui-ux/SKILL.md:30` | Source inspection and passing tests do not establish rendered acceptance. | Keep | Minimum checks and report boundaries. |
| D6 | `dsh-client-ui-ux/SKILL.md:32-36` | Preserve the actual starting implementation and comparable capture conditions. | Keep | `## Preserve the comparison`. |
| D7 | `dsh-client-ui-ux/SKILL.md:57-63` | Reuse existing components, containers, interactions, tokens, and treatments before adding another system. | Adapt | Scope, interaction, icon, and boundary checks; the project owns its component and token catalog. |
| D8 | `dsh-client-ui-ux/references/icons.md:5-11,44-58` | Reuse existing artwork and compare a control's target, painted base, icon slot, and painted glyph at intended size, including shared foreground color and effective opacity. | Adapt | Icon and component-geometry checks; exact source libraries and numeric variants stay with the project. |
| D9 | `dsh-client-ui-ux/SKILL.md:82-101` | Feedback lifetime, loading treatment, overlay dismissal, viewport fit, clipping, menu behavior, and scrollbars within unclipped rounded containers affect acceptance. | Adapt | Feedback, loading, overlay, menu, scrolling, and geometry checks; the project supplies its primitives. |
| D10 | `dsh-client-ui-ux/SKILL.md:103-109` | Platform chrome and the combined frame clearance plus page inset affect the assembled surface. | Re-bind | Platform-chrome check against the project's supported host surfaces. |
| D11 | `dsh-client-ui-ux/SKILL.md:61-80` | Numeric typography, radius, spacing, viewport, stroke, and icon variants belong to a product system. | Dissolve | The project supplies exact values; the skill checks stable grouping, geometry, and actual conditions. |
| D12 | `dsh-client-ui-ux/references/alignment.md:5-32` and `spacing.md:5-19` | Compare named aligned objects and axes at rendered size; include both gap endpoints, padding, border and line box, and reuse the project's spacing owners. | Adapt | Layout, geometry, and consumer checks use project-declared relationships and values. |
| D13 | `dsh-responsive-ui/SKILL.md:8-31` | Preserve in-progress drafts, focus and primary actions in narrow layouts; prefer reflow before truncation or icon collapse; do not hide conflicts through global clipping, global shrinking, or shrunken targets; keep important or truncated titles available in full elsewhere. | Adapt | Responsive behavior, text/localization, and consumer checks; the project sets supported widths and may tighten, but not omit, draft preservation. |
| D14 | `dsh-responsive-ui/SKILL.md:33-60` | Icon-only controls need recognizable help or a visible tooltip, plus hover, touch, keyboard behavior, focus across width changes, software-keyboard, and input-capability rules. A coarse-pointer text input stays at least 16 CSS pixels when the project declares no stricter input-size rule, preventing focus zoom. | Adapt | Interaction, responsive/pointer, icon/touch-help, focus/input, and overlay checks; mechanism names stay with the project, while the no-declaration accessibility floor remains visible. |
| D15 | `dsh-client-ui-ux/SKILL.md:54,91` | User-visible copy belongs to the project's locale and prose owners. | Re-bind | Text/localization check requires that ownership and invokes the project's mechanism when one exists. |
| D16 | `dsh-client-ui-ux/SKILL.md:117-120` | A perceivable UI change can require designer or product approval; the source's named roster is product data. | Dissolve | The skill reports a missing project approval policy when sign-off is part of claimed acceptance and never invents reviewers. |
| D17 | `record-browser-gif/SKILL.md:12-22` | A user-visible GUI change carries truthful browser evidence from the changed build; capture and publication are separate. | Re-bind | Recorded browser evidence is the default, with project override and capability handoff; the selected mechanism owns capture and publication. |
| D18 | Repository `AGENTS.md` and `dsh-spec-skill-forge/SKILL.md` | Each skill installs independently and still completes or hands off when a preferred capability is absent. | Adapt | The skill names no sibling dependency and includes a capability-absent handoff. |
| D19 | alpha.2 `references/icons.md` | Shared and inline line artwork keeps its declared stroke behavior as the viewport changes; fills remain geometry; ordinary placement or reuse fixes do not alter that rendering contract, and artwork, stroke or rendering changes validate the declared sizes and device-pixel ratios across every consumer. | Adapt | Icon/touch-help and affected states cover ordinary placement without a fixed size/DPR matrix; a rendering change inspects the project's declared stroke contract at target CSS size and supported device-pixel ratios. No upstream widths or component names are copied. |

## Verification anchors

| # | Requirement | Anchor | Evidence |
|---|---|---|---|
| A0 | The skill obeys the Agent Skills format, closes frontmatter and external links, and stays within the catalogue description budget. | Mechanical | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-client-ui-ux --description-max 500` decides it. |
| A1 | Every source constraint D1-D19 has one disposition and one home in the shipped instructions. | Judged | One conclusion per row against `SKILL.md` and the named reference. |
| A2 | Instruction files contain no DSH product path, token, roster, source repository name, fixed viewport, or hard sibling dependency. | Mechanical + Judged | Source scan over `SKILL.md` and shipped references, excluding the required `THIRD_PARTY_NOTICES`; the sibling-reference gate decides the naming form. |
| A3 | A user-visible browser UI change defaults to truthful rendered evidence; equivalent project evidence is accepted; unavailable evidence produces an explicit resumable handoff. | Judged | One conclusion against `## Record browser evidence by default`; capability-present and capability-absent model runs are A6. |
| A4 | The review covers the assembled page, affected consumers, layout relationships, interaction, responsive and pointer behavior, scroll and overlay behavior, focus/input adaptation, locale content, geometry, and platform chrome. | Judged | One conclusion per minimum-check bullet against D2-D14. |
| A5 | Tests, source, and fixtures are never promoted to a complete application or visual acceptance claim. | Judged | One conclusion against the minimum-check closing paragraph, evidence section, and report closing rule. |
| A6 | Candidate model behavior covers evidence reuse, capability-present capture, capability-absent handoff, project evidence override, and comparison preservation under an exact input manifest. | Judged + Mechanical | Clean-context runs under `tests/skill-evals/evidence/2026-11-20-pr114/`; the repository scenario test reconstructs the candidate revision, verifies trace integrity, and checks the recorded input manifest. A later edit changes only the scenarios whose behavior it changes. |
| A7 | The description triggers on affected implementation and review requests and stays out of visual-direction, general-audit, documentation, and non-UI tasks. | Judged + Mechanical | `tests/skill-evals/dsh-spec-client-ui-ux/trigger-evals.json`; trigger evidence binds the name and description, and every trace names the recorded skill revision and exact file read. |
| A8 | README, installed copy, notices, Agent Note companions, translation pairs, defaults inventory, corpus, and static checks agree. | Mechanical | `pnpm test`, `pnpm run check:static`, `pnpm run check:corpus`, `pnpm run notices:check`, and `pnpm run skill:verify-bundles`. |
| A9 | The record and its Chinese companion describe the shipped behavior with current source revisions, paths, evidence and translation terminology. | Mechanical + Judged | Pairing check plus semantic comparison against this note and `SKILL.md`. |

### Model evaluation

The clean-context evaluation under `tests/skill-evals/evidence/2026-11-20-pr114/` ran the candidate
on four scenarios: shared-consumer coverage, missing-renderer handoff, project-declared screenshot
evidence, and capability-present default evidence. The candidate passed all 17 assertions. For the
screenshot override, the fixture intentionally contains a simulated focus treatment; the candidate
rejected it as proof of native focus and reported the gap, while the no-skill baseline accepted the
screenshots and passed only 2 of 4 assertions. The capability-present probe used one headless-Chrome
run and did not use BrowserSkill.

The trigger corpus contains six positive and six near-miss queries. All twelve matched their
expected trigger result, and every retained trace records the installed skill revision. The trigger
manifest binds the frontmatter name and description.

## Alternatives considered

**Copy the DSH UI skill with paths renamed.** It would preserve a large review workflow, but its tokens, product pages, platform clearance, approval roster, and mandatory GIF policy remain another project's rules under different names.

**Make the browser GIF skill a hard dependency.** It would give one evidence path, but it prevents independent installation and excludes projects with an equivalent recording mechanism.

**Ship only a general web-guidelines checklist.** It would cover common accessibility and interaction rules, but it would not verify the project's assembled page, consumer set, design system, or intended states.

**Include a visual style generator.** It would add design direction, but it would change the skill from change verification into product identity creation and duplicate external design skills.

**Require screenshots at a fixed matrix of widths, themes, and states.** It appears comprehensive, but many cells cannot be affected by a local change, while one assembled consumer can still miss a shared component's real dependency.

**Keep GIF as an optional afterthought.** It keeps the review lightweight, but it permits a visually observable change to claim completion without a durable demonstration.

## Consequences

- The set gains an independently installable browser UI review skill.
- A project with no recording mechanism receives an explicit evidence handoff, while a project with an equivalent mechanism remains supported.
- Shared-component changes require consumer evidence rather than a single representative fixture.
- The skill adds no DSH tokens, component paths, designer roster, product page rules, scripts, or hard sibling dependency.
- The model evidence covers consumer discovery, rendered-evidence reuse, missing-capability handoff, screenshot overrides, simulated-focus rejection, capability-present headless capture, and twelve trigger queries. Other product contexts, visual systems, capture mechanics, and reviewers remain outside that evidence.
- Rollback: revert the landing commit; the pinned upstream baseline remains untouched.
