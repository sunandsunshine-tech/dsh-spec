# Agent Note: Forging dsh-spec-pr-description from the upstream dsh-pr-description skill

Status: implemented

English | [中文](2026-10-30-forging-dsh-spec-pr-description.zh.md)

## Problem

The package ships skills for software engineering in a general project but has no skill for the artifact every change request carries: its description. The upstream skill `dsh-pr-description` states the discipline for the deepseek-harness repository in particular — its own Issue policy and Priority matching, its pull-request template, its label and status taxonomy, its documentation-budget manifest, its GUI-recording skill, its translation terminology list, its `gh` and `.artifacts` workflow, and a Chinese default language — while this package's deliverable must work in a project that declares none of these. `dsh-spec-pr-description` adapts the skill for that domain: it keeps the obligations a change-request description carries, and re-binds, generalizes or dissolves each repository-specific referent.

## Decision

The package ships `dsh-spec-pr-description` as an adaptation of the upstream skill at `.agents/skills/dsh-pr-description/SKILL.md` from source revision `f3803c96974ad4a94195fb97e5c637e9c2a3afe3` (`dsh-v0.2.2-alpha.2`); the current extraction baseline is `dsh-v0.2.2-rc.5` (`9c2670d3bce5275e0d1610272958121af87787bb`).

The landed directory holds `SKILL.md`, `references/ai-usage.md`, `references/default-conventions.md` and `THIRD_PARTY_NOTICES`; the installed copy is mirrored to `.agents/skills/dsh-spec-pr-description/`. The root `THIRD_PARTY_NOTICES.md` adapted-skill paragraph names the skill, and the root `README.md` skill table lists it.

The skill keeps the upstream mechanism as obligations: the description states why the change exists (with a same-project tracked-issue reference when one exists), what it changes, what proves it, and how much the AI took part. The entry owns the four content blocks, test-design forms, test-entry and proof-block discipline, the general disclosure duty with the upstream four categories as typical examples, the default and replaceable section structure, the creation and update triggers, and the final read-back gate. `references/ai-usage.md` is the sole owner of the AI Usage model: five levels, five stages, 5%-multiple grading, decision-record limits, badge and AI-DECLARATION block pinned to AI-DECLARATION 0.1.2, update timing, language adaptation, replacement and structural validation. The entry requires that reference before writing the section and applies its checklist during final read-back; each stack layer records only its own work against its base. Project conventions supply the values, forms, places and examples; they never remove an obligation.

When no review comments have been handled, the review row remains `n/a` with an empty decision-record cell; the statement that no comments were handled follows the table.

The skill dissolves or re-binds the repository-specific referents: the declaration routing, the label and Priority validation, the Project Priority and Start Date mechanics, the documentation-budget values, the GUI-GIF mandate, the specific tooling and artifact paths. `references/default-conventions.md` separates description defaults (issue references, structure, drafting commands and disclosure pointers) from optional tracker lifecycle examples (labels, Project fields, statuses and dates); the latter are examples a project may adopt, not obligations of this skill. `user-invocable: false` cannot be carried by this package's closed frontmatter set and is recorded as a deviation in the skill-root `THIRD_PARTY_NOTICES`.

- The skill is not for commit messages, release notes, code-review findings or the code change itself; it states the change-request description's obligations and leaves the project's tracker, template, tools and language to its own declarations.
- Delivery language is English, with Chinese additional trigger language appended to the description; the record is English with a Chinese pair.
- The skill requires no runtime or tooling; the adopting project's declared tooling supplies creation and update.

### Disposition summary

The disposition summary covers every source unit with one location, disposition and home, and the anchors name one check per requirement. Carried: the four content blocks and their content requirements, the fixed-English-label default vocabulary, the test-design forms and test-entry discipline, the four disclosure categories as the examples of a general duty, the creation and update states, and the read-back obligation. The AI Usage model and its exact validation now have one home in `references/ai-usage.md`; the entry owns the load-before-write, load-before-read-back and stack-local rules that select that home. Re-bound: the section structure (default and replaceable), the description language (existing descriptions → documentation → request), the Issue reference (declared syntax or tracker conventional form or named link), the body path and tool (project defaults, GitHub examples), and the disclosure form/values/place/examples (project conventions). Dissolved: the declaration table and absence routing, the label/Priority/Project/lifecycle validation requirements, the documentation-budget values, the GUI-GIF mandate, the repository tooling and artifact paths, and the explicit repository-level AI declaration rule. Added: the adoptable `default-conventions` reference with description defaults separated from optional tracker examples, the retained GitHub examples, the sole AI Usage reference, and the licence and notices.

## Alternatives considered

**Copy the upstream text verbatim.** It would import one repository's tracker, label, template, tooling, budget, recording and language rules as requirements, and every one of them is false for an adopter.

**Keep a dsh-specific section inside the generic skill.** A condition written in one project's vocabulary carries that vocabulary into a general skill; the mechanism is re-bound or dissolved instead.

**Put every project value in a new declaration file.** Adopters already keep standing instructions and a template; a new file would make them rewrite what they have and maintain a second declaration.

**Keep a declaration table as the coordinator of defaults.** It turned writing into declaration parsing and let an absent declaration remove the issue association; each default now sits at its point of use.

**Keep the AI Usage model with its Chinese literals as the requirement.** The level and stage identifiers stay English and the description-language rendering is the writer's adaptation; the Chinese name pairs are examples in the reference.

**Make the disclosure duties depend on a declaration, or close them to four categories.** The duty belongs to the decision a reviewer cannot assess; the four categories are the typical examples.

**Duplicate the AI Usage details in `SKILL.md` and `references/ai-usage.md`.** The reference is already required before writing and owns the checklist used during final read-back, so a second copy adds context and creates a second owner without making the rules more discoverable.

**Ship a checker script for the structural requirements.** The local body is a working copy while the delivered description lives behind the project's tool; the read-back validation carries the exactly-decidable items and the deviation is recorded.

## Consequences

The description is a landed skill with an installed copy, two references, a skill-root notices file and a root-notice entry; the Chinese record pair preserves the decision for the next maintainer. The default structure is replaceable, so two adopters may present the four content blocks differently; the AI Usage section carries a fixed AI-DECLARATION block and table. The entry owns routing and completion, while `references/ai-usage.md` owns the model and read-back checklist. `user-invocable: false` is not carried, and the optional tracker lifecycle examples do not change the description contract. Trigger quality is judged, not measured: the description's keyword set is not exercised against real user prompts. The record's Chinese pair is current with the record.
