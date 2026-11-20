# Agent Note: Forging dsh-spec-web-ui-review from the DSH UI skills

Status: implemented

English | [中文](2026-11-20-forging-dsh-spec-web-ui-review.zh.md)

## Problem

The skill set covers review, delivery, prompts, durable prose, and project instructions, but it has no project-level procedure for validating a browser-rendered UI change. Code review can read the diff, and a test suite can pass, while the assembled page still clips an action, loses a state, affects an untraced consumer, or is claimed visually accepted without rendered evidence.

DeepSeek Harness carries a mature UI change workflow and responsive interaction rules. Their mechanism transfers, but the source text names DSH tokens, client packages, product pages, platform clearance variables, a designer roster, and a mandatory GUI GIF policy. Copying that text would give an adopter another project's visual system and review policy.

## Decision

The package ships `dsh-spec-web-ui-review` as a project-level browser UI change review skill. It owns impact-scaled inspection, minimum rendered checks, shared-component consumer tracing, responsive and input-state coverage, comparison preservation, evidence reporting, and honest handoff for uninspected scope.

The adopting project owns its visual system, component APIs, supported browsers, supported themes and widths, localization mechanism, approval policy, and exact design values. The skill reads those declarations and does not introduce a second token system or a style catalog.

A user-visible browser UI behavior change produces recorded browser evidence by default. The skill states the generic requirement without naming an evidence implementation; a tool-specific recording skill added by a dependent layer may provide an availability-qualified example. A project may declare an equivalent evidence form. Missing rendered evidence or recording capability produces an explicit handoff instead of a visual-completion claim.

The skill is one `SKILL.md` with a skill-root `THIRD_PARTY_NOTICES`. It ships no script and depends on no sibling skill. The installed copy mirrors the landed directory.

- Delivery and language: English skill text with Chinese trigger keywords in the description.
- Default: inspect the actual rendered UI; a user-visible browser UI behavior change records browser evidence in one isolated run unless the project supplies an equivalent form or override.
- Boundary: this skill does not generate a visual identity, curate styles or palettes, replace a general web-guidelines audit, or make unrelated UI changes.

## Source and revision

Upstream source is `deepseek-ai/deepseek-harness` at `dsh-v0.2.2-rc.5` (`9c2670d3bce5275e0d1610272958121af87787bb`), read on 2026-11-20:

- `.agents/skills/dsh-client-ui-ux/SKILL.md`
- `.agents/skills/dsh-client-ui-ux/references/alignment.md`
- `.agents/skills/dsh-client-ui-ux/references/icons.md`
- `.agents/skills/dsh-client-ui-ux/references/spacing.md`
- `.agents/skills/dsh-responsive-ui/SKILL.md`

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
| R6 | External design-generation and general UI-guideline systems remain outside this skill. Taste Skill, UI UX Pro Max, and frontend-design may inform visual craft, but none owns this project's supported consumers, states, evidence policy, or rendered acceptance. | They answer different questions: visual direction and general rule compliance do not replace project-level rendered verification. | Merge a concrete external capability into this skill. |
| R7 | The inspection is recursive but bounded: trace changed consumers and check only states, themes, widths, and data the change can affect. | A fixed matrix is expensive and incomplete; one isolated example is also insufficient for shared changes. | Replace impact scaling with a universal checklist or a fixed screenshot count. |

## Constraint dispositions

| # | Source constraint | Disposition | Target |
|---|---|---|---|
| D1 | Choose review effort by change impact; ordinary local changes do not require a full design audit. | Keep | `## Scale inspection to impact` |
| D2 | Minimum checks cover color and opacity, layout and responsive relationships, interaction states, and shared consumers. | Adapt | `## Minimum rendered checks`, expressed in project-neutral language |
| D3 | Inspect the actual page with neighbors rather than CSS or an isolated component. | Keep | opening and minimum checks |
| D4 | Missing required scenes are disclosed; a fixture supplies partial evidence, not an actual-page pass. | Keep | evidence and report sections |
| D5 | Tests and source inspection do not establish the rendered result. | Keep | minimum checks and report sections |
| D6 | Preserve the real before state and comparable capture conditions. | Keep | `## Preserve the comparison` |
| D7 | Reuse existing components, tokens, treatments, and artwork before adding another system. | Re-bind | scope authority, rendered checks, and boundaries; exact token and artwork catalogs stay with the project |
| D8 | Feedback, loading, overlays, menus, scrolling, focus, and platform-owned behavior affect UI acceptance. | Adapt | feedback, overlays, platform chrome, and component geometry checks |
| D9 | Numeric DSH typography, radius, spacing, viewport, stroke, and icon variants define one product's system. | Dissolve | the project's declared supported values and surfaces; the review still checks stable geometry, visible grouping, and actual usage conditions |
| D10 | Responsive rules preserve primary actions, focus, readable content, wrapping, input capability, and touch access. | Adapt | responsive behavior and interaction checks |
| D11 | DSH plugin pages, sidebar slots, clearance variables, and component paths select the evidence. | Dissolve | the project's declared consumers, composition wrappers, and supported surfaces |
| D12 | Official design/product approval names a roster and product role. | Dissolve | the project's declared approval policy; absence is reported as a policy gap |
| D13 | Every DSH GUI pull request requires a GIF from the real server and model flow. | Re-bind | default recorded browser evidence from the changed build; project override and capability handoff |
| D14 | UI copy belongs to a locale mechanism and the prose standard. | Re-bind | text and localization check; the project supplies the mechanism and the prose standard |
| D15 | The skill must work when responsive, error-handling, and other related skills are absent. | Keep | self-contained rules; no sibling dependency |

## Verification

| Requirement | Evidence |
|---|---|
| The skill obeys the Agent Skills format and catalog budget. | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-web-ui-review --description-max 500` |
| No DSH product path, token, roster, or source repository name remains. | Source scan against the shipped skill directory |
| The skill has no unresolved sibling reference before a recording mechanism ships. | `node scripts/verify-sibling-references.ts` |
| Shared-consumer coverage and missing rendered evidence are falsifiable scenarios. | `tests/skill-evals/dsh-spec-web-ui-review/evals/evals.json` and `node --test tests/skill-scenarios.test.ts` |
| The skill and installed copy agree. | `pnpm run skill:refresh` followed by the repository installed-copy check |
| The record, translation pair, corpus, and notices are consistent. | Agent Notes check, pairing check, `pnpm run check:corpus`, and `pnpm run notices:check` |

### Model evaluation

The clean-context evaluation under `tests/skill-evals/evidence/2026-11-20-pr114/` ran candidate and
no-skill profiles for three scenarios. The candidate passed all 12 assertions; the baseline passed
10. Candidate and baseline both recognized consumer coverage and missing-renderer handoff. In the
screenshot-override scenario, the fixture intentionally contains a simulated focus treatment; the
candidate rejected it as proof of native focus and reported the gap, while the baseline accepted
the screenshots as complete.

The final trigger corpus contains five positive and five near-miss queries. All ten matched their
expected trigger result, and every retained trace records the installed skill hash.

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
- The model evidence covers consumer discovery, rendered-evidence reuse, missing-capability handoff, screenshot overrides, simulated-focus rejection, and ten trigger queries. Other product contexts, visual systems, capture mechanics, and reviewers remain outside that evidence.
- Rollback: revert the landing commit; the pinned upstream baseline remains untouched.
