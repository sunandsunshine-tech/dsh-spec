# Agent Note: Forging dsh-spec-prose-standard from the upstream prose standard

Status: implemented

English | [中文](2026-10-28-forging-dsh-spec-prose-standard.zh.md)

## Problem

The skill set has no skill that owns durable text. An adopting project can hold standards for code, tests and gates, but the prose it commits — documentation, comments, decision records, instructions, visible strings — has no agent-facing standard for deciding where text is required, preserving a contract through an edit, and removing a reasoning transcript that leaked into a file. Upstream `dsh` carries two skills for exactly that judgement: `dsh-prose-standard` owns editorial judgement and required prose coverage; `dsh-trim-cot-leakage` owns the audit that finds prose written from an authoring session's vantage. Both are written into that repository's own conventions — its documentation tree, its UI-i18n and snapshot gates, its notes-archive path, its gates and lint names. Copying them verbatim would carry another project's layout and policy; leaving them out would drop a mechanism the pattern names, and shipping the leakage audit as a required separate skill would leave either install incomplete.

The package is an extraction, and a shipped skill's text deviates from its source only for a reference change the shipped layout requires or a generalization that removes one project's specifics. So the forging answers a narrower question than "what new method should exist": which target value replaces each source referent, and what domain and structure the merged skill has.

## Decision

The skill `dsh-spec-prose-standard` is landed at `skills/dsh-spec-prose-standard/`, forged from the two upstream skills and adapted to durable text in any project that adopts the package. It merges the leakage audit into the editorial standard because the audit applies the standard's complete-proposition rule, and because a skill is installed on its own: a required-background pointer to a second unshipped skill would dangle.

Landed shape (see R9):

- `SKILL.md` — the domain, required inputs and exclusions, the complete-proposition rules, the coverage-by-surface pointer, the leakage audit (one test, eight classes, keep rules, overcorrection traps), the workflow, borderline handling and the report.
- `references/coverage.md` — the required coverage for each prose surface, moved out of the entry to restore gate headroom; the entry points to it.
- `references/examples.md` — calibration cases for editorial judgement, the leakage keep cases, and the four overcorrection traps.
- `references/recall-batteries.md` — search probes for leakage: the invocation rules that keep a probe honest (hidden directories, exclusion order and self-exclusion, case sensitivity, bounded phrases, calibration), an English battery, a bilingual worked example, and the known false-positive families.
- No script and no package source: neither source requirement is decidable by a command the adopting project does not already own; bundling a probe script would invent a mechanism the sources explicitly avoid (R3).
- `THIRD_PARTY_NOTICES` — the adapted-skill provenance declaration required by the baseline convention (R16).

The skill landed on `refactor/dsh-skills` as one squashed commit on 2026-10-28, after the human review accepted it. Landing published the work directory with `forge publish` (which removed the Chinese review drafts), refreshed the installed copies, removed the two superseded installed skills `dsh-prose-standard` and `dsh-trim-cot-leakage` with their manifest entries, updated the root `THIRD_PARTY_NOTICES.md` and the `AGENTS.md` skill sentence, and moved this record to `implemented/` with its Chinese counterpart and consistency record.

**Domain.** Durable text is prose that a project commits and later readers depend on, as opposed to text read once in a conversation. The skill covers writing, reviewing, restoring, trimming and auditing it across Markdown documentation, public API documentation (JSDoc, Javadoc, docstrings, doc comments, whichever form the project uses), code and test comments, module comments, READMEs and package documentation, cookbooks and guides, decision records, postmortems and incident reports, skills and agent instructions, example and configuration comments, prompts and committed user-visible strings, and diagnostics. It does not cover transient chat replies, scratch notes, or the correctness of the code a comment describes; process text such as commit messages and change descriptions follows the project's change conventions. It does not own documentation placement, word budgets, translation authority or the adopting project's gates: the project's standing instructions (for example a root `AGENTS.md` or the file it cites) own those, and the skill refers to them generically.

**Merged responsibility.** One skill owns both halves of the judgement:

- the complete-proposition rule stays the property of the editorial standard; the leakage audit cites it in the same file instead of naming a background skill;
- the leakage workflow's scope and exclusion rules are stated once, in the merged inputs section, instead of referencing the prose standard;
- the source's archived-citation rationale note is not carried: it is source-repository history, and the citation rule stands on its own (R1);
- the cross-skill pointers to `dsh-doc` dissolve into the generic rule that the adopting project's standing instructions own placement, budgets and pairing (R4).

**Progressive disclosure.** `SKILL.md` carries the rules an agent applies while editing in one pass, so a leakage audit does not load a second reference to learn the classes. The three references carry material read on demand: per-surface coverage, calibration cases, and search probes whose hits still need semantic judgement. All three are named in the entry so the mechanical gate can check mention and link resolution.

## Source and revision

Upstream source: `deepseek-ai/deepseek-harness`, read from the pinned submodule `submodules/dsh` at `1f81c047fc48fa190a683e469daa699857e9afe8` (`dsh-v0.2.1-rc.3`, the revision `git submodule status` records). Files read as source:

- `submodules/dsh/.agents/skills/dsh-prose-standard/SKILL.md`
- `submodules/dsh/.agents/skills/dsh-prose-standard/references/examples.md`
- `submodules/dsh/.agents/skills/dsh-trim-cot-leakage/SKILL.md`
- `submodules/dsh/.agents/skills/dsh-trim-cot-leakage/references/examples.md`
- `submodules/dsh/.agents/skills/dsh-trim-cot-leakage/references/recall-batteries.md`

Not read as source: the installed copies under `.agents/skills/` (deployed state, not the extraction baseline, and their text is this repository's older adaptation), any other skill, any other session's work or forging record, and any parallel forging result. The request and the repository's declaration are the other source: the root `AGENTS.md`, `docs/AGENTS.md` and `docs/terminology.md`. `skills/dsh-spec-agent-notes/SKILL.md` and its contracts were read for the record's format and for the notes-root default only; the notes-tree decision records were read as the repository's standing rules where the declaration points at them, not as a design source for this skill.

Agent Skills pages read online on 2026-10-28, before writing the skill:

- `https://agentskills.io/llms.txt`
- `https://agentskills.io/specification.md`
- `https://agentskills.io/skill-creation/best-practices.md`
- `https://agentskills.io/skill-creation/using-scripts.md`
- `https://agentskills.io/skill-creation/optimizing-descriptions.md`

Every page was readable; the forge skill's offline fallback was not used.

## Settings

| Setting | Value | Basis |
|---|---|---|
| Skill name | `dsh-spec-prose-standard` | the request |
| Delivery language | English | the package's skills are English |
| Review language | Chinese | the request's language and the package's pairing practice |
| Additional trigger language | Chinese, appended to the description | the review language differs from the delivery language |
| Domain | durable text, defined in the entry | the request's target audience and domain |
| Sources | the two upstream skills above | the request |
| Merge | the leakage audit is owned by the forged skill; no second skill ships | the request, and a standalone install cannot satisfy a required-background pointer |
| Script | none | R3 |
| References | `references/coverage.md`, `references/examples.md`, `references/recall-batteries.md` | progressive disclosure; operating rules stay in the entry and per-surface coverage detail loads on demand |
| Landed directory | `skills/dsh-spec-prose-standard/` | the forge landing path; the work directory `.agents/dsh-spec-skill-forge/dsh-spec-prose-standard/` was published and removed |
| Superseded skills | The installed copies `.agents/skills/dsh-prose-standard/` and `.agents/skills/dsh-trim-cot-leakage/`, and their manifest entries, were removed at landing | the landed skill replaces the separate prose standard and absorbs the leakage audit (R1) |
| Branch and worktree | `forge/dsh-spec-prose-standard` in an independent worktree at `../dsh-spec-prose-standard`; based on `refactor/dsh-skills` at `609514c`, rebased onto `9301061` and landed there as one squashed commit on 2026-10-28; the worktree was removed after landing and the forge branch keeps the review commits | the request; the main working tree stays on its branch |
| Candidate gate | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-prose-standard` | the forge's mechanical gate, run on the landed directory |
| Review drafts | Chinese `.zh.md` beside `SKILL.md` and each reference, each with its `.i18n.yaml` consistency record; written and paired before the stop, then removed by `forge publish` at landing | the request; the project's pairing gate treats the two companions as one pair; no translation ships with the skill (R10) |
| Review-draft-only content | The three English sources carried a language-switcher paragraph while the drafts existed; it was removed before publish, and the landed sources carry none | the project's pairing gate requires a switcher on both sides; the forge removes review-draft-only content before publish |
| Description trigger vocabulary | Domain-first: durable text and its duties lead, the surfaces are examples among other surfaces rather than a closed list, leakage is mentioned without enumerating its classes, and a near-miss exclusion is stated | the maintainer review decision of 2026-10-28 (M1) |
| Provenance declaration | The frontmatter `license` field names a skill-root `THIRD_PARTY_NOTICES`; that file lists the two upstream skills' five source files, the pinned revision, the adaptation relation and both MIT notices; the shared root `THIRD_PARTY_NOTICES.md` registers the third adapted skill | the baseline's adapted-skill policy, applied by the maintainer decision of 2026-10-28 (M2, M3) |
| Record pairing | The note's Chinese counterpart and consistency record are written and paired; they moved with the note to `implemented/` | the maintainer decision of 2026-10-28 (M5); R15 is revised |
| Isolation | The shipped skill reads in complete isolation: it names no other skill, no sibling skill's path or default, and no package-internal mechanism; forms borrowed from another tool, skill or the package appear only as examples | the maintainer directive of 2026-10-28 (M8); R18 |
| Landing | landed on `refactor/dsh-skills` as one squashed commit on 2026-10-28 after the human review accepted the skill; nothing is pushed | the request and the human review |

## Constraint dispositions

Dispositions use the forge skill's values: **Keep** carries the original wording and sense with language and layout adjustments; **Adapt** instantiates a target value; **Re-bind** abstracts a vanished referent to its purpose and finds the target's equivalent; **Dissolve** records that the referent is gone and what check takes over. Target homes: `SK` = `SKILL.md`, `COV` = `references/coverage.md`, `EX` = `references/examples.md`, `RB` = `references/recall-batteries.md`, `—` = not carried. Source locations are line numbers in the file named in the row.

### Prose standard

| # | Source | Constraint | Disposition | Home | Basis |
|---|---|---|---|---|---|
| PS1 | prose `SKILL.md` 8 | Write enough to preserve the contract, then remove reasoning transcripts, repetition and decoration. | Keep | SK intro | upstream text |
| PS2 | prose `SKILL.md` 8 | A contract is an obligation, invariant, precondition, postcondition or compatibility promise a caller, callee, implementer, producer or consumer relies on. | Keep | SK intro | upstream text |
| PS3 | prose `SKILL.md` 8 | The skill owns editorial judgement and required prose coverage. | Adapt | SK intro | the merged skill also owns the leakage audit (R1) |
| PS4 | prose `SKILL.md` 8 | Placement, budgets, bilingual pairs and documentation gates belong to another skill (`dsh-doc`). | Re-bind | SK intro | the referent is unshipped; the equivalent is the adopting project's standing instructions (for example a root `AGENTS.md` or the file it cites), and the unshipped skill is not named |
| PS5 | prose `SKILL.md` 8 | Leakage hunting and fixing belong to `dsh-trim-cot-leakage`. | Re-bind | SK § Leakage audit | the audit is merged into this skill (R1) |
| PS6 | prose `SKILL.md` 8; leakage `SKILL.md` 8 | The skill is guidance, not a script. | Keep | SK intro | upstream text; both sources state the same sentence |
| PS7 | prose `SKILL.md` 10 | Contract, boundary, shape, surface, seam, gate and vocabulary are terms to check, not banned words; ask whether the exact rule, API, field set, type, validation, timing point, component split or failure states the fact better; keep the term when it names the exact technical subject, including caller and callee contracts and security or process boundaries. | Keep | SK intro | upstream text |
| PS8 | prose `SKILL.md` 12 | Comments describe non-obvious contracts or rationale code cannot express; they do not restate what code already implies. | Keep | COV § Required coverage by surface | upstream text |
| PS9 | prose `SKILL.md` 16 | Require an explicit `scope`; when missing, report the required input and stop; never infer repository-wide scope or begin an interview. | Keep | SK § Inputs and exclusions | upstream text |
| PS10 | prose `SKILL.md` 18 | Accept `mode: automatic` or `interactive`; default to automatic; enter interactive only on explicit request. | Keep | SK § Inputs and exclusions | upstream text |
| PS11 | prose `SKILL.md` 20 | Mode controls questions, not write authority: review and audit report without editing; an explicitly requested write, fix or trim applies clear changes. | Keep | SK § Inputs and exclusions | upstream text |
| PS12 | prose `SKILL.md` 22; leakage `SKILL.md` 41 (the exclusion half) | Exclude third-party trees the project does not author, for example `vendor/`, a dependency cache or a vendored checkout; never follow a symlink into one; put exclusions after inclusions in the project's own search and VCS syntax so a later include cannot re-admit them; when the scope holds only excluded files, report that none remain. | Adapt | SK § Inputs and exclusions | the rule keeps its force; `vendor/` is one example among third-party trees, and the source's ripgrep and Git syntax belongs to the project's tools, so it is not carried as a condition (M8, R18); generated files stay under the derivative rule, not the exclusion example; ordering, symlink and reporting rules are kept |
| PS13 | prose `SKILL.md` 24; leakage `SKILL.md` 41 (the frozen-archive half) | Exclude the project's frozen text — an archived decision-record tree, a frozen history area, or whatever the project declares frozen; inspect an exact target only to understand a historical inbound citation; never modernize its prose or links. | Adapt | SK § Inputs and exclusions | the source path becomes the project's own frozen area; the notes skill, its root and its default path are not named in the shipped skill (R5, R18) |
| PS14 | prose `SKILL.md` 26; prose `SKILL.md` 69 (the owner-first half); leakage `SKILL.md` 41; leakage `SKILL.md` 43 (the owner-first half) | Generated catalogs, snapshots, fixtures and other generated artifacts are derivative and are not prose targets: trace every consumer, edit the owning source or scenario first, regenerate every derivative; regenerate recorded fixtures and snapshots only when an authorized behavior change requires new evidence; an extracted summary sentence must be complete for the surface it feeds. | Adapt | SK § Inputs and exclusions (the rule); SK workflow 6 refers to it | the rule is stated once for the merged skill; the workflow step applies it without restating it |
| PS15 | prose `SKILL.md` 26; leakage `SKILL.md` 43 (the bilingual-prose half) | A translated pair has no permanent owner: either language may be the authored side; update the counterpart minimally and re-record the pair. | Re-bind | SK § Inputs and exclusions (the rule); SK workflow 6 refers to it | the source's lightweight-routine link is dissolved; the equivalent is the project's own pairing check |
| PS16 | prose `SKILL.md` 30 | Before editing, identify every proposition in the passage. | Keep | SK § Preserve the complete proposition | upstream text |
| PS17 | prose `SKILL.md` 32-36 | Preserve actor and action; condition, timing and ordering; modality; negative guarantee and exception; ownership, side effect, failure mode and consequence. | Keep | SK § Preserve the complete proposition | upstream text |
| PS18 | prose `SKILL.md` 38 | Remove adjectives, repetition and narration only when every factual clause survives and the result is clearer; a smaller word count alone is not an improvement. | Keep | SK § Preserve the complete proposition | upstream text |
| PS19 | prose `SKILL.md` 40 | Keep a complete local contract at the point of use: behavior, failure, ownership and consequence that a caller or maintainer needs; link aggressively to the owning document for architecture, rationale, algorithms, history or extended examples; one explanation has one home; essential contract facts may repeat locally. | Keep | SK § Preserve the complete proposition | upstream text |
| PS20 | prose `SKILL.md` 42 | Keep non-obvious rationale when omitting it could cause misuse or an incorrect simplification; otherwise state the consequence and link the rationale's home. | Keep | SK § Preserve the complete proposition | upstream text |
| PS21 | prose `SKILL.md` 46 | This is not a one-way shortening pass: add or restore prose when code, types and structure do not communicate a required contract; do not add a comment when the fact is already obvious locally. | Keep | COV § Required coverage by surface (intro) | upstream text |
| PS22 | prose `SKILL.md` 48 | Public JSDoc documents caller-visible return distinctions, throws or rejections, side effects, ownership, timing, cancellation and durability. | Adapt | COV § Required coverage by surface | the ecosystem-specific JSDoc becomes public API documentation in whichever form the project uses; every listed contract fact is kept |
| PS23 | prose `SKILL.md` 49 | Internal comments orient non-local structure and obviously complicated local structure, including invariants, race ordering, ownership, security boundaries and surprising failure behavior; delete control-flow narration and code restatement. | Keep | COV § Required coverage by surface | upstream text |
| PS24 | prose `SKILL.md` 50 | Module comments state the module's role, dependencies, responsibilities and non-obvious architecture choices, and link the architecture explanation. | Keep | COV § Required coverage by surface | upstream text |
| PS25 | prose `SKILL.md` 51 | Tests explain only non-obvious test design: why a fixture, assertion, platform accommodation, real entry path or indirect observation is necessary; delete walkthroughs and inventories. | Keep | COV § Required coverage by surface | upstream text |
| PS26 | prose `SKILL.md` 52 | Cookbooks and guides (the project's equivalent name for the document) include prerequisites, required actions, the real entry path, observable verification and concise warnings. | Adapt | COV § Required coverage by surface | the source genre is kept; the added name is the target domain's word for the same document (R2), not a new requirement |
| PS27 | prose `SKILL.md` 53 | READMEs carry the consumer contract: configuration, semantics, failures, limitations, extension points and model-visible effects; quote stable visible text owned by the package; link generated catalogs and cross-package owners; keep durable gaps and maintainer traps, not cleanup inventories; follow the package README requirements. | Re-bind | COV § Required coverage by surface | "the package README requirements" is a source-repository document; the equivalent is the project's standing instructions, and the contract content is kept |
| PS28 | prose `SKILL.md` 54 | Decision records (the project's name for them, for example ADRs) retain unique rationale, mechanisms, alternatives, consequences, shipped verification evidence and named coverage gaps; implemented records state shipped reality in the present tense; remove planning checklists but not evidence. | Adapt | COV § Required coverage by surface | "Agent Notes" becomes the target's own name for decision records; the shipped skill names no notes mechanism or sibling skill (R8, R18) |
| PS29 | prose `SKILL.md` 55 | Postmortems and incident reports (the project's equivalent name for the document) retain the incident sequence, evidence, causal chain, impact and prevention; remove repeated persuasion or implementation detail that does not establish causality. | Adapt | COV § Required coverage by surface | the source genre is kept; the added name is the target domain's word for the same document (R2), not a new requirement |
| PS30 | prose `SKILL.md` 56 | Skills and agent instructions state behavioral guardrails and explicit scope limitations such as "guidance, not a script or a checklist"; keep the workflow concise and link its source of truth. | Keep | COV § Required coverage by surface | upstream text |
| PS31 | prose `SKILL.md` 57 | Example and configuration comments explain access limits, non-obvious wiring or load order, security stance, replay behavior, exceptions and likely misuse; do not narrate entries the configuration already shows. | Keep | COV § Required coverage by surface | upstream text |
| PS32 | prose `SKILL.md` 58 | Prompts and visible strings: wording is behavior; client UI copy belongs in typed locale dictionaries and reaches primitives as explicit localized props; inspect text, accessibility names, tooltips, placeholders and format templates together; run the UI-i18n check; update the owning runnable snapshot and GUI evidence; with no owning scenario, leave the wording unchanged and report the deferral. | Re-bind | COV § Required coverage by surface | the source's locale dictionary, primitive prop, UI-i18n check and GUI evidence are one repository's mechanisms; the equivalent is the project's owned localizable strings plus the owning behavior evidence (scenario or snapshot), with the deferral rule kept |
| PS33 | prose `SKILL.md` 59 | Diagnostics name the failing subject or path, the violated rule and the correction when it is non-obvious; remove internal execution narration. | Keep | COV § Required coverage by surface | upstream text |
| PS34 | prose `SKILL.md` 61 | Preserve searchable mechanism names and meaningful modal, temporal or negative emphasis; normalize decorative emphasis only. | Keep | SK § Preserve the complete proposition | upstream text |
| PS35 | prose `SKILL.md` 65 | Confirm the scope, mode, current branch or change base, and applicable project instructions; do not inspect unrelated branches. | Adapt | SK workflow 1 | "branch or PR base" becomes the change's current state; "AGENTS.md" becomes the project's standing instructions |
| PS36 | prose `SKILL.md` 66 | Read the documentation standard and the owning code or document before judging a passage; read the distilled examples for calibration. | Re-bind | SK workflow 2 | the source's documentation standard is dissolved; the equivalent is the project's standing instructions when it has them, plus the owning source; the examples reference is kept |
| PS37 | prose `SKILL.md` 67 | Inspect the requested scope, not only the largest files: use searches and word counts to find candidates, then judge passages semantically. | Keep | SK workflow 3 | upstream text |
| PS38 | prose `SKILL.md` 68 | Classify each candidate as keep, add, trim, restore, restructure or defer; apply clear changes only when the task authorizes edits; do not manufacture edits to satisfy a deletion target. | Keep | SK workflow 4 | upstream text |
| PS39 | prose `SKILL.md` 69 (the re-check half) | Re-check analogous passages after learning a new rule. | Keep | SK workflow 7 | upstream text; the owner-first half is carried by PS14 |
| PS40 | prose `SKILL.md` 70 | Run the narrow relevant checks, documentation gates, the project's diff check (for example `git diff --check`) and behavior tests for visible strings; verify the final diff contains no third-party path with the project's diff listing (for example `git diff --name-only`) and report any accidental match rather than claiming a clean exclusion history. | Re-bind | SK workflow 8 | the source's named documentation gates dissolve into the project's checks for the touched surfaces; the exactly-decidable no-third-party-path rule keeps a concrete command as an example, so the rule holds for any VCS (R18) |
| PS41 | prose `SKILL.md` 71 | Report the inspected scope, clear changes, deliberate keeps, deferred cases and checks actually run. | Keep | SK workflow 9 (the report content) | upstream text |
| PS42 | prose `SKILL.md` 75 | A case is borderline only when at least two versions satisfy the complete-proposition rule but trade accepted principles and the skill does not already resolve the tradeoff; a rewrite with one proposition-preserving answer is not borderline. | Keep | SK § Borderline decisions | upstream text |
| PS43 | prose `SKILL.md` 77 | Automatic mode applies clear edits when authorized and reports genuine borderline cases without asking; never weaken a proposition to make progress. | Keep | SK § Borderline decisions | upstream text |
| PS44 | prose `SKILL.md` 79 | Interactive mode groups analogous passages under the governing principle, presents two or three viable versions with one recommendation and the factual or structural difference, offers no inferior distractors, and uses the requested channel; for a change calibrated through inline comments, the recommended version sits in the diff with the alternatives attached to that line. | Adapt | SK § Borderline decisions | "PR" becomes "change"; the interaction rules are kept |
| PS45 | prose `SKILL.md` 81 | After a decision, distill the principle and versions into the examples without review history or reviewer narration, and apply the learned rule to every analogous passage in scope. | Re-bind | SK § Borderline decisions; SK workflow 7 (the analogous-passage half) | the shipped examples may be an installed copy that must not be edited, and a general adopter may not hold this skill's source tree; the equivalent is the project's prose-guidance owner or the report, with a case added to this skill's examples only when its own source tree is the working tree |
| PS46 | prose `SKILL.md` 3 | The description triggers on writing, reviewing, restoring, trimming or auditing prose; it leads with the durable-text domain, states the three duties, lists surfaces as examples among other surfaces, and mentions leakage without enumerating its classes. | Adapt | SK description | the source's trigger vocabulary is kept where it names a duty (write, review, restore, trim, audit, leakage); the surface enumeration is reframed as examples over the target domain, by the maintainer review decision of 2026-10-28 (M1) |


### Leakage audit

| # | Source | Constraint | Disposition | Home | Basis |
|---|---|---|---|---|---|
| LC1 | leakage `SKILL.md` 8 | Chain-of-thought leakage is prose whose vantage is the authoring session rather than the repository: it cites artifacts only that session could see, narrates the change instead of the state, or argues with a reviewer who has left. | Adapt | SK § Leakage audit | "repository" becomes the project; the reviewer stays a generic reviewer the text addresses, so the source's word is kept; the definition is unchanged |
| LC2 | leakage `SKILL.md` 8 | The fix is never deletion alone when a passage carries factual clauses: restate each so it stands at the current state, then delete the transcript around it; a passage carrying none is deleted outright. | Keep | SK § Leakage audit | upstream text |
| LC3 | leakage `SKILL.md` 8 | The complete-proposition rule is owned by the prose standard. | Re-bind | SK § Preserve the complete proposition | the rule is owned by the same skill after the merge (R1), so the pointer becomes a section reference inside one file |
| LC4 | leakage `SKILL.md` 8 | An archived note records the design-session citation rule's rationale. | Dissolve | — | the note is source-repository history; the citation rule stands on its own and its calibration cases take over |
| LC5 | leakage `SKILL.md` 12 | The one test: could a reader at the current state, with no access to any session transcript, change discussion or uncommitted draft, resolve every reference and verify every claim? If no, restate the surviving facts and delete the rest. | Adapt | SK § The one test | "HEAD" becomes the project's current state; the test is kept |
| LC6 | leakage `SKILL.md` 12 | Resolvability only clears this test: on current-state surfaces a resolvable change story is still change narration, and the change-narration class routes it to its sanctioned home. | Keep | SK § The one test; SK § The classes | upstream text |
| LC7 | leakage `SKILL.md` 16 | Dead design-session citations: `(decision 7)`, `(audit C2)`, `design §4.7`, `plan §1.4`, phase labels, "the design ledger", "(B ruling)". A committed owner is cited by name and path; otherwise the citation is deleted and its factual clause restated. | Keep | SK § The classes 1 | upstream text; "committed owner" is project-generic |
| LC8 | leakage `SKILL.md` 17 | Stack and PR vantage: "a later PR in this stack", "this PR adds", "the previous commit". State the shipped mechanism or the extension point; deferred work moves to a `TODO` marker or an issue reference. | Adapt | SK § The classes 2 | PR and stack wording becomes change and series, the VCS-agnostic form the package uses |
| LC9 | leakage `SKILL.md` 18 | Change narration and version stamps: "used to", "no longer", "the old X", indexical stamps such as "v1", "this cut", "today". State the present behavior; a fixed regression becomes a present-tense counterfactual ("without X, Y happens"), never project history ("used to Y"). | Keep | SK § The classes 3 | upstream text |
| LC10 | leakage `SKILL.md` 19 | Review choreography: "Rejected in review:", "the reviewer confirmed", draft ordinals, round attributions. Keep the surviving decision and rationale as plain fact; delete who said it when. | Keep | SK § The classes 4 | upstream text |
| LC11 | leakage `SKILL.md` 20 | Reviewer-addressed justification: "the cast is safe — it simply…", "this is correct because…". State the invariant that makes the code safe, or delete the comment when the code shows it. | Keep | SK § The classes 5 | upstream text |
| LC12 | leakage `SKILL.md` 21 | Restatement and derivation transcripts: control-flow narration, test walkthroughs, proofs of obvious branches. Delete; keep only a non-obvious contract or invariant. | Keep | SK § The classes 6 | upstream text |
| LC13 | leakage `SKILL.md` 22 | Hedges and planning residue: "probably fine for now", "should be enough", deferrals with no marker. Promote to `TODO`/`FIXME` or state the actual bound; delete the hedge. | Keep | SK § The classes 7 | upstream text |
| LC14 | leakage `SKILL.md` 23 | Authoring-language slips: untranslated working-language fragments in text whose language is otherwise settled, or project-session separators. Translate or delete. | Adapt | SK § The classes 8 | the example fragments stay in the examples reference; the class is stated project-generically |
| LC15 | leakage `SKILL.md` 27 | Unaided passes fail in both directions by deleting durable references and keeping dead ones; apply the keep rules as written and calibrate each with the examples. | Keep | SK § What is not leakage; EX | upstream text |
| LC16 | leakage `SKILL.md` 29 | Issue and ticket references resolve at the current state; keep them on any surface, including READMEs; do not relocate them to decision records. | Adapt | SK § What is not leakage | "Agent Notes" becomes decision records |
| LC17 | leakage `SKILL.md` 30 | Merged-PR and issue citations inside Agent Notes and postmortems are sanctioned evidence in a change story. | Adapt | SK § What is not leakage | "merged PR" becomes merged change; "Agent Notes" becomes decision records |
| LC18 | leakage `SKILL.md` 31 | Suppression justifications — a lint-disable reason, a coverage-ignore reason, an empty-catch explanation — are required prose; fix a false reason, never delete it. | Adapt | SK § What is not leakage | the lint-specific example becomes the generic suppression family with its named members |
| LC19 | leakage `SKILL.md` 32 | Counterfactual-present regression pins are not leakage: "without X, Y happens", "a naive X would…". | Keep | SK § What is not leakage | upstream text |
| LC20 | leakage `SKILL.md` 33 | Measured bounds calibrate a constant; the evidence word "measured" is load-bearing. | Keep | SK § What is not leakage | upstream text |
| LC21 | leakage `SKILL.md` 34 | Runtime old and new states name live objects during handover, not repository states. | Keep | SK § What is not leakage | upstream text |
| LC22 | leakage `SKILL.md` 35 | Historical stage names inside a decision record's change-story sections are current-state-safe there; indexical stamps stay banned everywhere. | Adapt | SK § What is not leakage | "Agent Note" becomes decision record |
| LC23 | leakage `SKILL.md` 36 | External references that resolve outside the project by design stay citable, including external standard sections; the section-number ban covers uncommitted internal drafts, not external standards or committed documents that own their numbering. | Keep | SK § What is not leakage | upstream text |
| LC24 | leakage `SKILL.md` 37 | Project voice and genre forms are not leakage: "we" as project voice, and a decision record's alternatives-considered section. | Adapt | SK § What is not leakage | "Agent Note" becomes decision record |
| LC25 | leakage `SKILL.md` 41 (the cross-skill pointer only) | The leakage workflow takes its scope and exclusions from the prose standard. | Re-bind | SK § Inputs and exclusions | the two skills are one, so the pointer resolves to the same section; the scope, exclusion and derivative obligations are carried by PS12-PS14 and are not restated |
| LC26 | leakage `SKILL.md` 42 | Audit read-only first: run the recall batteries, calibrating each probe against a known positive and a near-miss negative before trusting its output, then judge every hit semantically; the batteries are probes, not the definition, and the densest prose is also read without a pattern in hand. | Adapt | SK workflow 3 and 5; RB | the batteries are kept as a reference with generic placeholders; the calibration and unpatterned-read rules are kept |
| LC27 | leakage `SKILL.md` 43 (the fence and visible-string halves) | Fix owner-first per surface: a verbatim excerpt shared by a translated pair or pinned by a check is corrected at its source, copied byte-for-byte into every side, and the pair is re-recorded; a model- or user-visible string changes only with its owning behavior evidence, otherwise the deferral is reported. | Re-bind | SK workflow 6 | the source's type-equivalence fences, translation gates and GUI evidence are one repository's mechanisms; the equivalent is the project's shared excerpt, pairing check and owning behavior evidence; the generated-artifact half is PS14 and the translated-prose half is PS15 |
| LC28 | leakage `SKILL.md` 44 | Before deleting anything, enumerate the passage's propositions and check the overcorrection traps: a trim that flips an obligation into an endorsement, promotes a hypothetical to a shipped feature, deletes a true fact with the transcript around it, or drops the evidence source with the number. | Keep | SK § What is not leakage; EX | upstream text |
| LC29 | leakage `SKILL.md` 45 | Verify: re-run the batteries expecting only sanctioned keeps, the skill's own quoted calibration cases, and the owning record's quoted evidence; confirm every remaining citation resolves at the current state; run the gates for the touched surfaces. | Re-bind | SK workflow 8 | the source's named gates become the project's checks for the touched surfaces; the self-quote exception is required because the examples reference quotes leaked wording |
| LC30 | leakage `SKILL.md` 3 | The description triggers on auditing or fixing prose that reads like a leaked reasoning transcript. | Adapt | SK description | the merged description keeps the leakage vocabulary as trigger keywords |

### Examples and probes

| # | Source | Constraint | Disposition | Home | Basis |
|---|---|---|---|---|---|
| EX1 | prose `references/examples.md` 3-169 | The prose calibration cases: preserve every factual clause, scope is functional, a cookbook keeps action and verification, ownership and timing, event documentation, orienting complicated code, public documentation includes failures, an implementation mapping, linking rationale while keeping the local contract, implemented records retain verification contracts, a security boundary's one example, deleting reasoning transcripts, configuration comments explain what the tree cannot, do not trim for word count alone, model-visible text follows ownership, generated summaries must stand alone, limitations are contracts. | Adapt | EX | every case is kept as a calibration case; one repository's subjects (worker realms, event JSDoc, package catalogs, Agent Notes) become general durable-text cases with the same principle |
| EX2 | leakage `references/examples.md` 3-45 | The dead-citation cases: a decision ordinal with a committed owner, one without, an audit item code, a section number of an uncommitted draft, plan-phase labels. | Adapt | EX | kept as calibration; the committed-owner and restatement rules are the same as LC7 |
| EX3 | leakage `references/examples.md` 47-97 | The change-vantage cases: a stack position in durable prose, "this PR" in a README, a war story with a PR number, removal narration, a fixed regression restated as a counterfactual, indexical version stamps. | Adapt | EX | PR and stack wording becomes change and series; the principles are kept |
| EX4 | leakage `references/examples.md` 99-169 | The review and derivation cases: review verdicts as prose (sanctioned in an alternatives section), draft ordinals, arguing a cast, appeal to review authority, control-flow narration, a test walkthrough, an unmarked deferral, vague sizing. | Adapt | EX | kept as calibration; the alternatives-considered genre becomes the decision-record genre |
| EX5 | leakage `references/examples.md` 171-193 | The authoring-language cases and the behavior-visible candidate: an authoring-language fragment, a slip inside a paired fence, a model-visible sentence that needs its owner and evidence. | Adapt | EX | kept; the source's GUI and snapshot mechanisms become the project's owning behavior evidence |
| EX6 | leakage `references/examples.md` 197-231 | The keep cases: issue references are durable, a dead name-drop is not naming the owner, suppression justifications, measured bounds, runtime old and new, runtime natural time. | Adapt | EX | kept; "Agent Notes" becomes decision records |
| EX7 | leakage `references/examples.md` 233-275 | The four overcorrection traps: flipping an obligation into an endorsement, promoting a hypothetical to a shipped feature, deleting a true fact with the transcript around it, dropping the measurement source with the number. | Adapt | EX; SK § What is not leakage | each trap keeps its original/overcorrected/right contrast and its name; the source subjects (extension slots, an IPC shell, a repository doc-typecheck gate, a generated type module) become general durable-text subjects |
| EX8 | leakage `references/recall-batteries.md` 5-12 | Invocation rules: search hidden directories; put exclusions last; use case-insensitive matching only on natural-language lines and keep code-pattern lines case-sensitive; bound complete phrases; calibrate each probe against a known positive and a near-miss negative before trusting it; target authoring-language probes at the opposite-language surface, and where the residue is an addition to a translated pair, compare it with the counterpart instead of searching for noise. | Adapt | RB § Invocation rules | the source-repository paths, globs and language pair become placeholders and examples; every invocation rule is kept |
| EX9 | leakage `references/recall-batteries.md` 14-24 | The English battery: seven probe families for dead citations, change vantage, change narration, version stamps, review choreography, hedges and section numbers. | Adapt | RB § English battery | the patterns are kept generically with placeholders for the scope; the dead-citation and phase-label patterns stay as written |
| EX10 | leakage `references/recall-batteries.md` 26-38 | The Chinese battery: change and review narration in Chinese counterparts, authoring-language slips in English Markdown, and slips in English code comments (including the Python comment form). | Adapt | RB § One worked example: a bilingual project | one language pair is the source's; the target presents one worked example and states that the project's own languages replace it |
| EX11 | leakage `references/recall-batteries.md` 40-52 | Known false-positive families: instrumental "used to", runtime old/new, "this PR" in process documents, v1 identifiers, committed section owners, contrastive "actually" and the noun "wait", runtime "today" and recorded timestamps, 本版本, alternatives sections. | Adapt | RB § Known false-positive families | every family is kept, including the two halves the source lists beside the probe (`actually`/`wait`, runtime `today`/recorded timestamps); the PR and Agent Note names take the target's change and decision-record wording |
| EX12 | leakage `references/recall-batteries.md` 3, 8 | The batteries over-match by design and under-match by nature, and the skill's own files quote leaked wording, so a scan excludes the skill's own directory and judges self-hits as evidence rather than usage. | Adapt | RB intro; SK workflow 8 | the source's self-exclusion path becomes the shipped skill's own directory, named as a placeholder; the post-fix battery re-run expects the quoted calibration cases as keeps |

### Target rulings

| # | Ruling | Why | Reversible by |
|---|---|---|---|
| R1 | The leakage audit is merged into the prose standard. The forged skill owns both; no second skill ships; the required-background pointer and the source archive note dissolve. | The request merges them; the audit applies the standard's complete-proposition rule; a standalone install cannot satisfy a pointer to an unshipped skill. | Split the leakage material into a second skill and restore the cross-skill pointer. |
| R2 | The target domain is durable text, defined in the entry, with committed comments, records, instructions, prompts and visible strings inside it; chat replies, scratch notes and code correctness are outside it, and process text such as commit messages and change descriptions follows the project's change conventions rather than this skill. | The request names durable text writing as the audience and domain; the source scope is that same material, written into one repository's layout. | Narrow or widen the domain definition and the coverage list together. |
| R3 | The skill ships no script and no package source. Its requirements stay judgment with named authority; the mechanical subset is the commands the adopting project already owns (its diff, documentation, pairing and behavior checks). | Both sources state they are guidance, not scripts. One target rule is exactly decidable — the final diff contains no third-party path — and the workflow names the existing `git diff --name-only` command for it; a bundled script would restate a command the adopter's toolchain owns and bind the skill to a runtime, which the sources avoid. The recall batteries are probes that over-match by design and need judgement on every hit. | Add a script for a requirement no existing project command decides, with a test. |
| R4 | Project-specific documentation references dissolve into one rule: the project's standing instructions own placement, budgets, pairing and gates; the skill names them generically. | The source's documentation tree does not exist in a general adopter; the package's extraction rule permits a generalization, not another project's policy. | Reintroduce a project-owned documentation standard reference. |
| R5 | Third-party trees and frozen text keep named examples (at least one each) and no package coupling: `vendor/` and similar paths are examples of third-party trees, an archived decision-record tree and a frozen history area are examples of frozen text, and the frozen area is whatever the project declares frozen; the shipped skill names no sibling skill, path or default. | Both rules are generic in force; naming the package's notes archive or a sibling default would bind a self-contained skill to another skill (M8, R18). | Name a sibling default or the notes archive again. |
| R6 | Ecosystem-specific surfaces are generalized: JSDoc becomes public API documentation in any form; typed locale dictionaries and UI-i18n checks become the project's owned localizable strings; lint-disable reasons become suppression justifications; runtime snapshots and GUI evidence become the owning behavior evidence. | The package must not claim one ecosystem; the underlying rules survive without the mechanism names. | Reintroduce an ecosystem-specific surface as an example only. |
| R7 | PR, stack and commit vantage language becomes change and series where the rule is about durable text; the examples keep recognizable forms under the generic wording. | The target VCS is the project's, and the package's own skills use change for pull request. | Name Git/GitHub explicitly. |
| R8 | Decision records stand on their own under the project's own name; the shipped skill names no notes mechanism, no sibling skill and no package-internal mechanism, and cross-skill mapping stays in this record. | A self-contained skill must serve a project that installs nothing else; naming another skill would create a dependency the package does not deliver (M8, R18). | Name the notes mechanism or the sibling skill again. |
| R9 | The deliverable was the forge work directory; the landing path is `skills/dsh-spec-prose-standard/`, and the skill landed there as one squashed commit on `refactor/dsh-skills` after the human review. `forge publish` and `skill:refresh` ran in the landing change, and nothing is pushed. | The request forbade landing before review; landing without an installed-copy refresh would also fail the repository's installed-copy invariant. | Revert the landing commit. |
| R10 | Review drafts are Chinese `.zh.md` files beside `SKILL.md` and each reference, each with its `.i18n.yaml` consistency record, written and paired only before the stop and removed by `forge publish` at landing; no translation ships. The record's own pairing is R15. | The request defers translation pairing to the stop; the project pairing gate treats the two companions as one pair, and the forge removes review drafts before publish. | Pair earlier, ship the translations, or declare only `.zh.md` and drop the project pairing-gate step. |
| R11 | The skill ships three references: per-surface coverage, calibration examples and recall batteries. The entry keeps the operating rules and points to coverage detail; the batteries reference carries the invocation rules, the English battery, one bilingual worked example and the false-positive families. | Progressive disclosure: the operating rules load with the skill; per-surface coverage and calibration detail load on demand; three named references keep the mechanical link checks meaningful and leave the entry clear of the 5,000-token ceiling. | Fold coverage back into the entry or split another rule group. |
| R12 | The description leads with English and appends Chinese trigger language; the name is exactly `dsh-spec-prose-standard`. | The package's delivery language and the request's review language. | Change the trigger languages or name. |
| R13 | The skill depends on no other skill at runtime; the decision-record and notes-default mentions are informative examples. | Each skill installs on its own; a dependency would break a single-skill install. | Make the notes skill a required companion. |
| R14 | When the project's standing instructions declare neither exclusions nor a documentation standard, the report states the exclusions used. | A general project may declare nothing; reporting keeps the audit honest without inventing a policy. | Require the standing instructions to declare before any audit. |
| R15 | The forging record's Chinese counterpart and consistency record are written and paired after the review content settles, before the handover, now that the record itself is the review artifact; the pair moved with the note to `implemented/`. | The earlier deferral avoided churn during review rounds; the maintainer's review settled the content, so the pair is part of the handover (M5). | Re-defer the pair if the record churns again. |
| R16 | Provenance follows the repository's adapted-skill convention: the frontmatter `license` field names a skill-root `THIRD_PARTY_NOTICES`, which lists the two upstream skills' five source files, the pinned revision, the adaptation-and-merge relation and both MIT notices; the shared root `THIRD_PARTY_NOTICES.md` registers this third adapted skill. | The baseline states the convention for adapted skill text, and the maintainer directed it applied in this forging (M2, M3); the text is adapted, not rewritten. | Remove the notice and license; revert the root registration. |
| R17 | The description is domain-first and open-scope by decision: the surface list is illustrative ("among other surfaces"), the leakage classes stay in the entry, and the fixed enumeration an earlier review required is withdrawn. | The maintainer judged the enumerated examples an implied fixed range and asked for a domain-first trigger; the duties and the near-miss exclusion keep the trigger precise (M1). | Restore an enumerated description; the gate limit and U1 remain as before. |
| R18 | The shipped skill reads in complete isolation: it names no other skill of this package, no sibling skill's path or default, and no package-internal mechanism. Forms borrowed from another tool, skill or the package (a vendor path, a Git command, a sibling default, a term from elsewhere) appear only as examples and never as conditions of a rule; the skill's own interface placeholders (`scope`, `mode`), generic markers (`TODO`, `FIXME`) and provenance notice are part of its contract, and a concrete tool form stays an example where it helps (workflow 8 keeps the Git diff examples). Sibling defaults and cross-skill mappings live in this record and the handover, not in the shipped text. | The maintainer directed that each skill be treated in isolation (M8); a general adopter installs skills one at a time, and a named sibling or default would read as a requirement the adopter may not satisfy. The placeholders and markers are the skill's own interface, not borrowings. | Reintroduce a named sibling skill, default path or package mechanism in the shipped text; or make a borrowed concrete form a condition. |


## Requirement anchors

Every requirement of the forged skill carries one anchor at the most precise level available. Judged items state one conclusion; unverified items carry their reason.

| Requirement group | Anchor | Evidence or conclusion |
|---|---|---|
| Frontmatter, name, description limit, license, `SKILL.md` budget, reference and link conformance, script coverage | Mechanical | `verify-skill-spec.mjs` run on the landed directory; output recorded in § Verification |
| Provenance declaration | Judged | R16: the gate reports the `license` field; the skill-root `THIRD_PARTY_NOTICES` names both upstream skills, the five paths, the pinned revision, the relation and both MIT notices; the root notice registers this skill; reviewer A checks the paths against the pinned submodule and the notices against the notes precedent |
| Trigger applicability and near-miss exclusion | Judged, with an unverified remainder | The description leads with durable text and its three duties, states surfaces as examples among other surfaces, mentions leakage without enumerating the classes, and excludes transient chat and code correctness; the activation rate is not measured (U1) |
| Description language order | Judged | English leads and the Chinese trigger language is appended (R12); the Chinese review draft reverses the order; reviewer B checks both against the request's review language |
| Domain definition (durable text) | Judged | The entry states what is inside the domain and what is outside it — transient conversation, scratch notes, code correctness, and process text that follows the change conventions; the design audit checks it against the request (Review) |
| Required inputs: scope, mode, write authority | Judged | PS9, PS10 and PS11 each keep one source rule; the target text states one decision per rule |
| Exclusions: third-party trees, frozen archive, generated artifacts, translated pairs | Judged | PS12, PS13, PS14, PS15, LC25; the generic defaults are R5 and the report rule is R14 |
| Complete-proposition rules | Judged | PS16-PS20 state the proposition list, the removal condition, the local-contract rule, the rationale rule and the emphasis rule |
| Required coverage by surface | Judged | One row per source surface: PS22-PS33; each surface names its required contents and its removal rule; the coverage is not a shortening target (PS21) |
| Leakage one test and its current-state qualifier | Judged | LC5 and LC6 state the test and the qualifier in the same section |
| Leakage classes | Judged | LC7-LC14, one class per row; the classes are stated with their fix rules |
| Keep rules | Judged | LC15-LC24, one keep per row; each names why an unaided pass would delete it |
| Overcorrection traps | Judged | LC28 states the enumeration duty and the four traps; EX7 calibrates them |
| Workflow | Judged | PS35-PS41 and LC25-LC29 are merged into nine steps with no repeated rule |
| Borderline handling | Judged | PS42-PS45 keep the definition, the automatic and interactive modes, and the distillation step |
| Report | Judged | PS41; the report names scope, changes, keeps, deferrals and checks run |
| Calibration examples | Judged | EX1-EX12; reviewer A checks one case per principle and each overcorrection contrast against its rule |
| Recall batteries | Judged | RB; each probe is a discovery aid, and the calibration rule is stated before the patterns |
| No script | Judged, with a mechanical consequence | R3; the gate reports no script shipped and none mentioned |
| No invented mechanism | Judged | The independent design audit checks every target referent against R1-R18; findings are in § Review |
| Isolation | Judged, with a mechanical consequence | R18: the three shipped Markdown files name no sibling skill, sibling path or package mechanism — the isolation grep in § Verification results returns no hit — and forms borrowed from another tool, skill or package are marked as examples, while the skill's own placeholders, markers and provenance notice remain part of its contract; reviewer B checks the sentences that carry examples |
| Review-draft pairing | Mechanical | `translation-pair write` created the `.i18n.yaml` records; `forge.mjs pair` reported the declared `.zh.md` and `.i18n.yaml` drafts with no orphan; `translation-pair check` passed on the same anchors; `forge publish` removed the drafts at landing |
| Record format | Mechanical | The notes check run on the implemented tree; output in § Verification results |
| Record coverage: one disposition per source constraint | Judged | The source-parity review enumerates every constraint across all five source files against the disposition table, not a sample; findings are in § Review |
| The forged skill's own prose follows its rules | Judged | The independent implementation review applies the skill to its own text; findings are in § Review |
| Chinese review drafts | Judged, with an unverified remainder | The skill drafts were structurally paired and removed at publish; the record's own pair is paired and ships; translation idiom was left to the human review, which accepted the landing (U4) |
| Record pairing | Judged | R15 pairs the record's Chinese counterpart and consistency record after the review content settles, before the handover; U4 records the remaining human check |
| Handoff completeness | Judged | § Handover records the landing and the remaining maintainer decisions |

## Verification

The landed skill and the moved record were verified on 2026-10-28 from the worktree that produced the landing:

1. The design audit accepted the design before implementation, and two independent reviewers accepted the implementation across four delta rounds (§ Review).
2. The landed skill passes the mechanical gate at `skills/dsh-spec-prose-standard/`, with no script shipped and every link resolving.
3. The installed copy under `.agents/skills/dsh-spec-prose-standard/` is byte-identical to the landed directory, so the repository's installed-copy invariant holds.
4. The record check passes on the implemented tree, and the record's Chinese counterpart and consistency record are paired.
5. The isolation grep over the landed Markdown finds no sibling skill, sibling path or package mechanism.
6. The functional suite and the formatting check pass, and `git diff --check` reports no whitespace error.
7. The landing is one squashed commit on `refactor/dsh-skills`; the tree is clean and nothing is pushed.

### Verification results

Run on the current tree on 2026-10-29, after the coverage split:

```text
$ node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-prose-standard
ok   SKILL.md — 105 lines
ok   frontmatter fields — name, description, license
ok   name — dsh-spec-prose-standard (dir: dsh-spec-prose-standard)
ok   description — 721 characters
ok   license — 59 characters
ok   script mentions — none mentioned
ok   script coverage — none shipped
ok   references directory — references
ok   links stay inside — 11 relative link(s)
ok   links resolve — all resolve
ok   link depth — nothing deeper than one level
ok   reference mentions — 3 reference(s) named
ok   reference targets — 3 path(s) named
ok   budget — 105 lines, ~4160 tokens at 1.1 CJK / 0.303 other tokens/char (limit: under 500 lines and 5000 tokens)
14 check(s), 0 failed

$ diff -r skills/dsh-spec-prose-standard .agents/skills/dsh-spec-prose-standard && echo identical
identical

$ node skills/dsh-spec-agent-notes/scripts/notes.mjs check --root .agents/dsh-spec-agent-notes --companion .zh.md --companion .i18n.yaml
ok   check — 38 note(s) and 76 companion(s) checked

$ node skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check .agents/dsh-spec-agent-notes/implemented/process/2026-10-28-forging-dsh-spec-prose-standard.md --target zh=中文 --root .
1 pair(s) consistent

$ rg -n 'Agent Notes|dsh-spec-agent-|dsh-spec-skill-forge|notes root' skills/dsh-spec-prose-standard/SKILL.md skills/dsh-spec-prose-standard/references/examples.md skills/dsh-spec-prose-standard/references/recall-batteries.md
(no output; exit 1 — no sibling skill, sibling path or package mechanism is named)

$ pnpm test
tests 262 · pass 262 · fail 0

$ pnpm run format:check
All matched files use the correct format.

$ git diff --check
(no output; exit 0)
```

The design audit ran twice (§ Review): round 1 returned needs revision with D1-D11, round 2 accepted after they were resolved. The implementation review returned needs revision in round 1 (A1-A13, B1-B10), round 2 (N1-N4, R1-R6), round 5 (A1-A4, B5-1..B5-3) and round 7 (A7-1..A7-3, B7-1..B7-3); both reviewers accepted the state in round 8. The human review accepted the skill on 2026-10-28, and the landing checks above are the shipped evidence. The review commits remain on the local forge branch; the baseline carries one squashed commit.

## Review

### Design audit, before implementation

Round 1 — independent design audit, 2026-10-28. Verdict: needs revision; no blockers, four major and seven minor findings. The audit read all five source files at the pinned revision, the whole record, the adopter declaration and the named tooling.

| Finding | Severity | Resolution in this record |
|---|---|---|
| D1 — the project pairing gate needs the `.i18n.yaml` record, but the plan declared only `.zh.md` | major | Settings, R10, § Verification steps 3-4 and § Handover now declare both companions, write the three records at the stop and remove both at publish |
| D2 — duplicate disposition rows with conflicting dispositions for the derivative, exclusion and guidance rules | major | PS6 merges both guidance statements; PS12, PS13 and PS14 absorb the leakage locations; PS15 absorbs the translated-prose half; PS39 keeps only the re-check half; LC25 becomes the dissolved cross-skill pointer; LC27 keeps the fence and visible-string halves |
| D3 — EX7 used Keep while carrying source-repository mechanisms | major | EX7 is Adapt and names the four subjects to generalise |
| D4 — the recall batteries were under-covered by one coarse row | major | EX8 is split into EX8-EX12 (invocation rules, English battery, bilingual worked example, false-positive families, self-quote rule); the proposal and R11 name the invocation rules |
| D5 — the prose description had no disposition row | minor | PS46 is added |
| D6 — source-location errors | minor | PS17, PS21, LC5, LC30 and EX1-EX4 are corrected against the pinned revision |
| D7 — disposition labels and the dropped bilingual-fence rule | minor | PS27, PS40 and LC29 are Re-bind; LC3 is split and the archived note is Dissolve with its takeover; LC27 carries the verbatim-excerpt rule; PS12 keeps the executable exclusion forms |
| D8 — R3's "nothing is command-decidable" premise is false | minor | R3 names the existing project commands as the mechanical subset and the one exactly-decidable rule |
| D9 — anchor and plan precision: sampling, a missing language-order anchor, a planless examples review, a vacuous link check | minor | the coverage anchor enumerates instead of sampling; a description-language row and a record-pairing row are added; reviewer A's calibration check is named; the link check is removed |
| D10 — "guides" and "incident reports" were over-included | minor | PS26 and PS29 name the target domain's equivalent genre, with R2 as the basis rather than a circular general form |
| D11 — the note-pairing deferral was attributed to the request | minor | the deferral became R15, cited by Settings, U4 and the anchors; R15 was later revised to pair the record before the handover |

Round 2 — re-audit of the revised design, 2026-10-28. Verdict: accept; no blockers. Every round-1 finding was verified resolved in the revised text, with the source ranges and the pairing plan re-checked against the pinned files and the CLI. Three new minor findings remained, all record-text fixes applied before implementation:

- N1 — PS15 and LC27 both carried the translated-pair minimal-update rule. PS15 now owns the rule and its source locations; LC27 keeps only the verbatim-excerpt and visible-string halves.
- N2 — the pairing steps were numbered before the implementation review, so they could record stale text. The plan now runs steps 1-5 during implementation and steps 6-8 last, and re-runs them after any later edit.
- N3 — PS14 had lost the recorded-fixture condition, and EX11's basis over-claimed the false-positive families. PS14 now carries the authorized-behavior-change condition, and EX11 names the `actually`/`wait` and runtime-`today`/recorded-timestamp halves.

### Implementation review, round 1

Two independent reviewers read the three shipped files, the record, the five pinned source files and the adopter declaration, and re-ran the gate. Both returned needs revision; no finding questioned the design.

| Finding | Reviewer; severity | Resolution |
|---|---|---|
| A1/B6 — the recall-batteries code fences were malformed instead of triple backticks | A, B; blocker | the four fences are restored and the reference renders both batteries as code |
| A2 — workflow 8 carried only the gates half of LC29 | A; major | workflow 8 now re-runs the probes after the fixes expecting only sanctioned keeps, and confirms every remaining citation resolves |
| B1 — the description omitted a leakage class and several trigger terms | B; major | the description names authoring-language slips, audit codes, draft section numbers, change and version narration, Markdown, and tool and parameter descriptions within the 1024-character limit |
| B2 — the borderline rule sent the executor to edit this skill's shipped examples | B; major | PS45 is re-bound: the principle goes to the project's prose-guidance owner or the report, and a case goes into this skill's examples only when its own source tree is the working tree, never an installed copy |
| B3 — duplicate of A2 | B; major | resolved with A2 |
| A3/B5 — the batteries claimed every false-positive family was a keep rule in the entry | A, B; minor | the sentence now says several restate keep rules and the rest are probe-level calibration |
| A4 — the four overcorrection traps lacked their names | A; minor | the examples reference carries the four named subsections |
| A5 — the description dropped Markdown and descriptions | A; minor | resolved with B1 |
| A6 — the declaration clause said translation authority while PS4 said bilingual pairs | A; minor | the entry states "bilingual pairs and their translation authority"; PS4 is unchanged |
| A7 — three record homes named sections that do not exist | A; minor | PS8 and PS41 homes are corrected; EX12 moves to the post-fix battery re-run in workflow 8 |
| A8 — the phrase-bounding example was technically wrong | A; minor | the example now uses the source's valid `this PR`/`this project` pair |
| A9/B4 — the batteries named an unreachable "source's battery" | A, B; minor | the sentence states the worked example has no fixed pair and names the project's own languages |
| A10/B10 — the examples kept `doc-typecheck` and other source-project nouns | A, B; minor | the gate is now "the documentation type-check gate"; pre-step, pressure accounting, worker realm, built-entry smoke and the IPC shell are neutralised |
| A11 — three record coverage gaps: the examples headers, the Python comment probe, the counterpart-comparison clause | A; minor | EX1 and EX2 ranges start at line 3; EX10 names the Python comment probe; the counterpart-comparison rule belongs to EX8's invocation rules and is carried there in round 2 |
| A12 — the visible-string rule and the self-scan rule were stated twice | A; minor | workflow 6 is a pointer to the coverage rule; the examples intro keeps only the calibration statement and the batteries carry the self-scan rule |
| A13 — LC1's basis and the "class below" referent | A; minor | LC1's basis is corrected; the entry names "the change-narration class (class 3)" |
| B7 — three over-trimmed referents | B; minor | current-state surfaces are named, workflow 1 says "current change or branch state", and the batteries name which language is searched in which surface |
| B8 — the domain boundary was positive-only | B; minor | the entry states the outside domain and the description excludes chat and code review |
| B9 — no required-coverage row for a generic documentation page | B; minor | the first coverage row is "Documentation pages, cookbooks, and guides", with the fallback to the closest genre or the project's standing instructions |
| Record note — the Verification section carried no gate output | B; note | the gate output is recorded in § Verification results |

Round 2 — re-review of the implementation after these fixes, 2026-10-28. Both reviewers returned needs revision with minor findings only; no blocker or major remained. Their resolutions:

- N1/R1 — the source's counterpart-comparison rule was missing from the batteries while the record attributed it to EX10. The rule is now carried in the invocation rules (EX8's range) and EX10 keeps only its own range.
- N2 — PS45's re-bound target had dropped the "versions" and the review-history prohibition. The borderline rule now keeps both, and the record's PS45 home names workflow 7 for the analogous-passage half.
- N3/R4 — the coverage row had lost PS22's "return distinctions" and PS23's "surprising failure behavior". Both are restored, together with PS27's "model-visible", "stable visible text owned by the package" and "cross-package owners" qualifiers.
- N4 — the description and the trigger anchor said "code review" while the domain said code correctness. The description, anchor, Domain paragraph and R2 now say code correctness, and process text is placed under the project's change conventions in the domain and R2. The description's two halves were aligned in round 3 (N5).
- R2 — workflow 8 collapsed LC29's three expected-hit categories into two. The sentence now lists sanctioned keeps, this skill's quoted calibration cases, and the owning decision record's quoted evidence.
- R3 — workflow 9 regained "found" and "actually", so a read-only audit has a report field for the classes found and the checks are named as actually run.
- R5 — the documentation row applied procedural requirements to every documentation page. It now requires "the content the page's purpose requires" and states the procedural subset, so a reference page is not over-covered.
- R6 — the four overcorrection traps were siblings of their parent heading. They are now subsections (####) under it.

Observation judged rather than fixed: "realm global" remains in one public-documentation case; it is a generic API subject, not the source repository's mechanism, so it is not a source-specific subject.

Round 3 — confirmation of the round-2 fixes, 2026-10-28. Reviewer B accepted the state: R1-R6 and N1-N4 resolved, no new defect, the remaining limits and observations judged acceptable or record-only. Reviewer A confirmed N1-N4 and the round-2 items resolved and raised one last minor finding:

- N5 — the round-2 description edit flipped the bilingual halves instead of aligning them: the English lost "dead" and said "code correctness" while the Chinese still carried 失效的会话引用 and 代码评审. The English restores "dead", the Chinese says 代码正确性, and "public API documentation" pays the characters; the description is 1022 characters and the gate passes. The Chinese review draft's description mirrors the aligned pair.

Round 4 — final confirmation of N5, 2026-10-28. Reviewer A accepted: N5 is fixed length-neutrally, the gate matches the record, and no parity or coverage item remains. Reviewer B accepted the description alignment as not changing its verdict. The round-2 implementation findings keep their reviewer labels N1-N4 and R1-R6 for traceability; the R-prefixed labels are not the target rulings R1-R18, and the maintainer decisions use M1-M8 so they do not collide with the design-audit findings D1-D11. Both independent implementation reviews accept the skill; the design audit accepted it in round 2 of § Review. The stop-time delta (three Chinese review drafts with their `.i18n.yaml` records, the language switchers in the English sources, the three length-neutral trims and the two removed link fragments) was confirmed by both reviewers afterwards: no parity, coverage, prose or quality item remains.

Rebase, 2026-10-28: after the reviews the baseline moved twice — to `bbc824d` (the landed prompt-writing `dsh-spec-agent-experience` skill and the skill-root provenance declarations for adapted skill text) and then to `9301061` (removing the superseded `dsh-agent-experience` installed copy). The branch was rebased onto the current baseline; no deliverable file changed in either rebase, and every check in § Verification results was re-run on the rebased state.

### Maintainer review, 2026-10-28

The maintainer reviewed the forged skill and gave four opinions; the rulings applied here are recorded as Settings rows, PS46, R15-R17 and the handover.

1. Provenance is required. The skill receives the baseline's adapted-skill declaration: the frontmatter `license` field, a skill-root `THIRD_PARTY_NOTICES` listing the two upstream skills' five source files, and the shared root `THIRD_PARTY_NOTICES.md` registering this third adapted skill (M2, M3; R16).
2. Overlap with the prompt-writing skill is normal: the same text can carry two domains. This skill owns editorial judgement and coverage; `dsh-spec-agent-experience` owns prompt structure and context economy. No cross-reference or runtime dependency is introduced.
3. The description's enumerated examples implied a fixed scope. It is rewritten domain-first: durable text and its duties lead, surfaces are examples "among other surfaces", leakage is mentioned without enumerating its classes, and the near-miss exclusion stays (M1; PS46; R17).
4. Rulings and major direction decisions are presented to the maintainer rather than settled silently. The seven questions M1-M7 were answered, with unmentioned ones following the recommendation: M1 the description rewrite, M2 the provenance file's five upstream paths, M3 the root registration in this branch, M4 a delta re-review after the changes, M5 the record's own pair, M6 landing deferred so the work stops at human review, and M7 keeping "chain-of-thought leakage" as the leakage trigger phrase. The maintainer added two instructions: rebase again, and use this skill and `dsh-spec-agent-experience` for prose guidance where they help, keeping the upstream text where it reads better.
5. The skills are independent and are read in complete isolation. The shipped prose standard therefore names no other skill, no sibling skill's path or default and no package-internal mechanism: the notes-archive example and the Agent Notes naming are removed, `vendor/` and the two diff commands are marked as examples, and the declaration is described as the project's own standing instructions (M8; R5, R8, R18).

The resulting delta (description, license, provenance notices, root registration, record updates) was sent to the two independent reviewers for a short round 5 check; the verdict is in the section below. The record's own Chinese counterpart and consistency record are added afterwards, under R15, so they are not part of that review delta.

### Delta review, round 5, 2026-10-28

Both independent reviewers read the maintainer-directed delta (commit `78049da`) and returned needs revision with record-text findings only; the delta's files themselves were accepted.

- Reviewer A accepted the description (domain-first, surfaces as examples among other surfaces, 721 characters, near-miss kept), the provenance (five upstream paths present at the pinned revision, both MIT notices byte-matched to the upstream and repository licence files, structure matching the notes precedent), the root registration's forward-looking wording, the rebase and the verification evidence. Four record-accuracy findings: acceptance criterion 7 still described the record pairing as deferred (A1); two requirement anchors still carried the deferral wording (A2); the round-5 delta list named the not-yet-written record pair (A3); PS46 and the Settings description row claimed the description enumerates leakage classes (A4). All four are fixed here.
- Reviewer B accepted the description as a prompt, the provenance packaging, the root wording and the unchanged skill body. Three record-only findings: stale R1-R15 references and the D11 row (B5-1); maintainer decision labels D1-D7 colliding with the design-audit findings D1-D11 and leaving M4/M6/M7 unnamed (B5-2); the pending record edits left uncommitted (B5-3). The labels are now M1-M7 with the questions named, the ruling references say R1-R17, and this table is committed; the record's own Chinese counterpart and `.i18n.yaml` record are added under R15 at handover.

Round 6 — confirmation of the record-text fixes, 2026-10-28. Reviewer B accepted: B5-1 and B5-2 are fixed, the round-5 fixes are present, and no new inconsistency was found; its one note was that the round-5 section said the table was committed with the record's own pair while the pair was still being written. Reviewer A confirmed A1-A4 and B5-1/B5-2 resolved and raised one last record-text finding (A5): the same sentence anticipated the record's pair before it was committed. The sentence now says the table is committed and the record's own pair is added under R15 at handover; the pair is committed in the same change, and both reviewers' round-5 and round-6 findings are closed.

### Isolation review, round 7, 2026-10-28

The maintainer directed that each skill be treated in complete isolation, so the shipped entry drops the notes-skill archive default and the Agent Notes name, reframes `vendor/` and the two diff commands as examples, and describes the project declaration as the project's own standing instructions. PS4, PS12, PS13, PS28, PS40, R5, R8, R18 and the anchors are updated; the entry, its Chinese review draft and this record's pair are re-recorded.

Round 7 — delta review of the isolation changes, 2026-10-28. Both reviewers accepted the shipped isolation; the findings were record accuracy (A7-1..A7-3, B7-3) and two entry/prose corrections (B7-1, B7-2):

- Reviewer A (A7-1..A7-3): R5 said "one named example each" while the shipped rule names several examples; the record still said "declaration" where the shipped text now says "standing instructions" (PS27 and PS36 bases, B9, Domain, R4, and the related R14 wording); and the verification block was stale at ~4992 tokens against a ~4998-token gate. All three are fixed here and the record pair is re-recorded.
- Reviewer B (B7-1..B7-3): the entry used "standing instructions" at the intro but "declaration" in the coverage row and workflows 1-2 (now consistent); "generated output" appeared as a third-party example while generated files are derivative (now "a vendored checkout", and PS12 is aligned); and R18, the Isolation Settings row, the anchor and AC9 over-claimed that every concrete form is an example (now scoped: forms borrowed from another tool, skill or the package appear only as examples, while the skill's own placeholders, markers and provenance notice stay part of its contract, and workflow 8's Git forms remain examples). All three are fixed.

Round 8 — final confirmation of the round-7 fixes, 2026-10-28. Both reviewers accepted: A7-1..A7-3 and B7-1..B7-3 verify on commit `b48df9f`, with no new parity, coverage, isolation or prose inconsistency. Reviewer B's one note — that the round-7 summary called every finding record-only while B7-1 and B7-2 changed the shipped entry and its pair — is corrected here. The entry, its Chinese review draft and the record pair were re-recorded, and the human review followed.

Landing, 2026-10-28: the human review accepted the forged skill. The work directory was published to `skills/dsh-spec-prose-standard/` (removing the Chinese review drafts), the installed copies were refreshed, the two superseded installed skills `dsh-prose-standard` and `dsh-trim-cot-leakage` and their manifest entries were removed, the root `THIRD_PARTY_NOTICES.md` and the `AGENTS.md` skill sentence were updated, and this record moved from `proposed/` to `implemented/` with its Chinese counterpart and consistency record. The forge branch keeps the review commits; the baseline carries one squashed commit.

## Unverified items

- **U1 — Trigger activation rate.** No trigger evaluation was run: the work directory is not an installed skill, and installing it would break the request's no-refresh rule; the repository has no trigger-evaluation harness. The description follows the Agent Skills description guidance and the independent review checks its vocabulary, but its activation rate is unmeasured.
- **U2 — Adopting-project checks.** The skill names the project's own documentation, link, pairing and behavior checks instead of fixed commands. No adopter exists in this work, so those commands were not executed; the rule is judged, not mechanical.
- **U3 — Effectiveness on a target corpus.** The sources were distilled from one repository's corpus-wide audit; no adopter corpus was audited here, so the merged skill's recall and precision on a new corpus are unmeasured.
- **U4 — Chinese review drafts and the record's pairing.** The skill review drafts were written, paired and removed at publish, so no translation of the shipped skill ships; the record's own pair moved with it to `implemented/`. Translation idiom was left to the human review, which accepted the landing (R10, R15).
- **U5 — Per-repository exclusions.** A project may declare no exclusions and no documentation standard; the skill falls back to a stated report (R14) rather than inferring a policy, and that fallback was not exercised against a real project.

## Handover

Landed on `refactor/dsh-skills` as one squashed commit on 2026-10-28. The installed copies were refreshed, the superseded installed skills and their manifest entries were removed, the root `THIRD_PARTY_NOTICES.md` and the `AGENTS.md` skill sentence were updated, and this record moved to `implemented/` with its Chinese counterpart and consistency record.

Remaining maintainer decisions: whether `README.md` and `README.zh.md` gain a "The skill" row for this skill (the other landed skills are not listed there either), and whether to delete the local forge branch, which keeps the review commits.

Rollback: revert the squashed landing commit; no remote state is touched.

## Alternatives considered

**Ship the leakage audit as its own skill.** It lost because the request merges it, the audit applies the editorial standard's own complete-proposition rule, and a single-skill install would otherwise carry a dangling required-background pointer.

**Keep the upstream text verbatim and swap only paths.** It lost because the source is written into one repository's documentation tree, generated catalogs, locale dictionaries, note archive and named gates; the extraction rule requires re-binding each referent to the adopter's standing instructions or dissolving it, and a verbatim copy would ship another project's policy.

**Put the leakage rules in a third reference file.** It lost because the leakage classes are applied on every audit pass and are the part of the audit that is easy to skip; loading a second reference to learn the classes would make the audit miss them, and the merged entry shows a rule per class inside the five-thousand-token budget.

**Bundle a recall-battery script.** It lost because the batteries over-match by design and require semantic judgement on every hit; both sources state the skill is guidance, not a script, and a script would invent a mechanism the sources avoid.

**Keep the upstream exclusion paths as fixed paths.** It lost because a general adopter need not have `vendor/` or a notes archive at the source's path; the rules are re-bound to third-party and frozen trees with named defaults.

**Narrow the domain to documentation only.** It lost because durable text includes committed comments, instructions and visible strings; narrowing would drop the source's coverage and most leakage classes, which are about comments and records.

**Land into `skills/` now so the artifact is visible.** It lost because the request forbids publishing before review, and because a landed skill without a refreshed installed copy fails the repository's own invariant.

## Consequences

- The package ships one durable-text skill instead of two separately installed upstream skills: a project installs one skill and gets the editorial standard and the leakage audit together (R1).
- The landed skill names no other skill, no sibling default path and no repository-specific gate; an adopter's standing instructions and its own commands decide those mechanics (R5, R8, R18).
- The two superseded installed copies and their manifest entries are gone. Other installed upstream skills that linked to them keep those links in deployed state until they are refreshed from upstream; none of them is a deliverable.
- The description is domain-first and open-scope: it is shorter than the enumeration it replaced, so the trigger vocabulary is broader but less specific, and the activation rate remains unmeasured (U1).
- The entry uses 105 lines and about 4160 of the 5000-token budget; further growth has headroom, with the per-surface coverage detail in the third reference (R11).
- No translation of the shipped skill ships; the record's Chinese counterpart and consistency record travel with the note, and the note is the durable record of the forging (R10, R15).
- What was given up: the separately installable leakage skill, the repository-specific examples that made the upstream text concrete, and the class-level trigger vocabulary the earlier description carried.
- The review commits remain on the local forge branch only; the baseline history is one squashed commit, so the round-by-round evidence is reachable through this record and that branch rather than through the baseline history.
