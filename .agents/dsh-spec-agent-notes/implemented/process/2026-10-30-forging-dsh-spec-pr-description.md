# Agent Note: Forging dsh-spec-pr-description from the upstream dsh-pr-description skill

Status: implemented

English | [中文](2026-10-30-forging-dsh-spec-pr-description.zh.md)

## Problem

The package ships skills for software engineering in a general project but has no skill for the artifact every change request carries: its description. The upstream skill `dsh-pr-description` states the discipline for the deepseek-harness repository in particular — its own Issue policy and Priority matching, its pull-request template, its label and status taxonomy, its documentation-budget manifest, its GUI-recording skill, its translation terminology list, its `gh` and `.artifacts` workflow, and a Chinese default language — while this package's deliverable must work in a project that declares none of these. `dsh-spec-pr-description` adapts the skill for that domain: it keeps the obligations a change-request description carries, and re-binds, generalizes or dissolves each repository-specific referent.

## Decision

The package ships `dsh-spec-pr-description` as an adaptation of the pinned upstream skill at `submodules/dsh/.agents/skills/dsh-pr-description/SKILL.md` (`submodules/dsh` pinned at `dsh-v0.2.2-alpha.2`, `f3803c96974ad4a94195fb97e5c637e9c2a3afe3`).

The landed directory holds `SKILL.md`, `references/ai-usage.md`, `references/default-conventions.md` and `THIRD_PARTY_NOTICES`; the installed copy is mirrored to `.agents/skills/dsh-spec-pr-description/`. The root `THIRD_PARTY_NOTICES.md` adapted-skill paragraph names the skill, and the root `README.md` skill table lists it.

The skill keeps the upstream mechanism as obligations: the description states why the change exists (with a same-project tracked-issue reference when one exists), what it changes, what proves it, and the AI Usage declaration. It keeps the test-design forms, the test-entry and proof-block discipline, the general disclosure duty with the upstream four categories as typical examples, the AI Usage model (five levels, five stages, 5%-multiples grading, badge and declaration block pinned to AI-DECLARATION 0.1.2, update timing, decision-record rules, and the mandatory reference load), the update triggers and the read-back validation. Read-back checks the AI-DECLARATION block specifically: the badge URL matches its level, the declaration line's level equals the badge, the version is 0.1.2, and a non-English description keeps the stage and level identifiers in English with a rendering in the description's language. The four-section structure, headings and labels are the default that a project's template may replace; the AI Usage block keeps its markers and table under any structure. Project conventions supply the values, forms, places and examples; they never remove an obligation.

The skill dissolves or re-binds the repository-specific referents: the declaration routing, the label and Priority validation, the Project Priority and Start Date mechanics, the documentation-budget values, the GUI-GIF mandate, the specific tooling and artifact paths. The re-bound defaults live at their point of use, and `references/default-conventions.md` offers a project that declares no conventions an adoptable working default (reference forms, optional labels and priority, Project fields, statuses, Start Date behaviour, GitHub commands) explicitly marked as examples and defaults, not obligations. `user-invocable: false` cannot be carried by this package's closed frontmatter set and is recorded as a deviation in the skill-root `THIRD_PARTY_NOTICES`.

- The skill is not for commit messages, release notes, code-review findings or the code change itself; it states the change-request description's obligations and leaves the project's tracker, template, tools and language to its own declarations.
- Delivery language is English, with Chinese additional trigger language appended to the description; the record is English with a Chinese pair.
- The skill requires no runtime or tooling; the adopting project's declared tooling supplies creation and update.

### Disposition summary

The disposition summary covers every source unit with one location, disposition and home, and the anchors name one check per requirement. Carried: the four content blocks and their content requirements, the fixed-English-label default vocabulary, the test-design forms and test-entry discipline, the four disclosure categories as the examples of a general duty, the AI Usage model and its update timing, the creation and update states, and the read-back validation. Re-bound: the section structure (default and replaceable), the description language (existing descriptions → documentation → request), the Issue reference (declared syntax or tracker conventional form or named link), the body path and tool (project defaults, GitHub examples), and the disclosure form/values/place/examples (project conventions). Dissolved: the declaration table and absence routing, the label/Priority/Project/lifecycle validation requirements, the documentation-budget values, the GUI-GIF mandate, the repository tooling and artifact paths, and the explicit repository-level AI declaration rule. Added: the adoptable `default-conventions` reference, the retained GitHub examples, the required read-back validation of the AI-DECLARATION block (badge/level/version and language identifiers; the no-script deviation), and the licence and notices.

## Alternatives considered

**Copy the upstream text verbatim.** It would import one repository's tracker, label, template, tooling, budget, recording and language rules as requirements, and every one of them is false for an adopter.

**Keep a dsh-specific section inside the generic skill.** A condition written in one project's vocabulary carries that vocabulary into a general skill; the mechanism is re-bound or dissolved instead.

**Put every project value in a new declaration file.** Adopters already keep standing instructions and a template; a new file would make them rewrite what they have and maintain a second declaration.

**Keep a declaration table as the coordinator of defaults.** It turned writing into declaration parsing and let an absent declaration remove the issue association; each default now sits at its point of use.

**Keep the AI Usage model with its Chinese literals as the requirement.** The level and stage identifiers stay English and the description-language rendering is the writer's adaptation; the Chinese name pairs are examples in the reference.

**Make the disclosure duties depend on a declaration, or close them to four categories.** The duty belongs to the decision a reviewer cannot assess; the four categories are the typical examples.

**Keep the AI Usage details in `SKILL.md`.** The gate's measured budget forces one always-needed reference; the entry keeps the mandatory rules and the reference load.

**Ship a checker script for the structural requirements.** The local body is a working copy while the delivered description lives behind the project's tool; the read-back validation carries the exactly-decidable items and the deviation is recorded.

## Consequences

The description is a landed skill with an installed copy, two references, a skill-root notices file and a root-notice entry; the Chinese record pair preserves the decision for the next maintainer. The default structure is replaceable, so two adopters may present the four content blocks differently; the AI Usage block and its model stay fixed. The enforceability is the read-back, not a script, so the structural validation depends on the writer's read-back. `user-invocable: false` is not carried, and the optional default conventions are examples that no test exercises against a live adopter. Trigger quality is judged, not measured: the description's keyword set is not exercised against real user prompts. The record's Chinese pair is current with the record. The change is on `refactor/dsh-skills` and pushed; no pull request was opened. Reverting the landing commit restores the removed work directory and the published copies.
