# Agent Note: Forging dsh-spec-agent-experience for prompt writing

Status: implemented

English | [中文](2026-10-28-forging-dsh-spec-agent-experience.zh.md)

## Problem

A create-mode port of the upstream `agent-experience` text would carry that text verbatim and differ only in frontmatter; it is the wrong shape for prompt writing. The skill is forged from the upstream skill alone, with the prompt as the object. Two facts make a forging necessary rather than a cosmetic change. The upstream body never names the prompt as the object it governs; its description names model-facing tool definitions and skill design, and its rules speak of what "the model" sees, so a prompt writer has no trigger vocabulary that names the act and no line of the body binds the six principles to the artifact being written. And the domain is prompt writing — any text primarily provided for an agent to read — while the upstream mechanism is kept, so the port's decision to add nothing gives way to an adaptation decision.

The earlier version and its record are not design sources; the upstream file is the source, and the request supplies the audience, the domain, the delivery form and the stop conditions. [The first forging record](../../archived/process/2026-10-23-forging-dsh-spec-agent-experience.md) is archived.

## Decision

The package ships `dsh-spec-agent-experience` as a forge from the upstream `agent-experience` skill for prompt writing. The skill directory `skills/dsh-spec-agent-experience/` holds:

- `SKILL.md`: a title `# Writing prompts`; the six context principles with the prompt as the object (S3–S6 adapted in wording, S7 and S8 carried as written); `## Tool definitions` with its five rules carried as written, one typographic apostrophe normalized; and a description adapted to the request — English lead with the writing act and the prompt artifacts, the upstream trigger surface kept, "designing skills" narrowed to "a skill's instructions", Chinese trigger language appended.
- `THIRD_PARTY_NOTICES`: the skill text's provenance declaration — upstream repository, pinned revision, upstream path, relation, and the upstream and repository MIT notices — named by the frontmatter `license` field.
- No script, no reference file, and no provenance line in the model-facing body.

The body puts two stances before the six rules: shape context, not control; make context judgeable. The six rules are applications of those stances; the upstream constraints and their dispositions are unchanged.

The installed copy at `.agents/skills/dsh-spec-agent-experience/` mirrors the skill; the upstream-named installed copy `dsh-agent-experience` is gone, and the first record is frozen in the archive. The sources are English-only, and this record carries its Chinese pair.

- Delivery: English, with the review and additional trigger language Chinese; the declared review-draft suffixes `.zh.md` and `.i18n.yaml` are written and paired only at the stop (R6, R7).
- The adapted text's source is the upstream `agent-experience` `SKILL.md` at `packages/preset/agent-preset/skills/agent-experience/SKILL.md` in the pinned `submodules/dsh` (`dsh-v0.2.2-alpha.2`, `f3803c96974ad4a94195fb97e5c637e9c2a3afe3`); the skill-root `THIRD_PARTY_NOTICES` records the provenance for installed copies (R8).

### Intent

| Field | Value |
|---|---|
| Name | `dsh-spec-agent-experience` (fixed by the request; matches the directory name) |
| Goal | A skill an agent applies when it writes or changes a prompt, so the model-facing information is discoverable and spends context efficiently |
| Boundary | Writing or revising a prompt: a system prompt, a tool definition, a skill's instructions, context-loading instructions, or the steps of a multi-step workflow. Out of scope: forging a skill (the forge owns it), writing a decision record (the notes skill owns it), installing, loading or using a skill |
| Audience and domain | Prompt writers; any text primarily provided for an agent to read — prompt and context engineering |
| Languages | Delivery English. Review language and additional trigger language Chinese |

### Source constraints

Every requirement, prohibition, condition or fixed choice in the upstream file is a source constraint:

| Id | Location | Constraint |
|---|---|---|
| S1 | L2 | The skill name is `agent-experience`; a target skill takes its own name |
| S2 | L3 | The description names the artifact (a model-facing tool definition: name, description, parameter schema, system-prompt section) and the adjacent design tasks (skills, context loading, multi-step workflows), and states the purpose: make information discoverable and use context efficiently |
| S3 | L6 | Start with minimal context: expose purpose, available actions and constraints first; load detailed instructions when needed |
| S4 | L7 | Make discovery explicit: every deferred resource needs a clear description and a reliable way to retrieve it |
| S5 | L8 | Keep critical constraints visible: permissions, destructive effects and required validation appear before the relevant action |
| S6 | L9 | Prefer bounded outputs: concise results with identifiers or paths for retrieving details; do not dump entire logs or documents |
| S7 | L10 | Use locality: include a bounded amount of likely needed adjacent context with an operation's result, for example a thread reply with a few preceding messages; mark omissions and truncation; provide a way to retrieve more |
| S8 | L11 | Evaluate total work: saving context is useful only if it does not cause more searches, repeated reads or mistakes |
| S9 | L13 | A `## Tool definitions` section holds the rules that apply to a tool definition |
| S10 | L15 | Delete obvious constraints: omit rules the model learns from the call result, such as a missing file failing to read or a failed send not being delivered |
| S11 | L16 | Describe behavior, not implementation: state what the tool does and returns; omit internal mechanisms, output markers the model sees in results, and enforcement details |
| S12 | L17 | Put parameter rules on the parameter: defaults, ranges, pairing and when-to-set rules belong in that parameter's description or schema; a description that varies with configuration usually means the varying part belongs to a parameter |
| S13 | L18 | Say each fact once: no tool definition repeated in its system-prompt section, no parameter description repeated in the tool description, no tool's rules repeated in another tool |
| S14 | L19 | Measure the change: compare first-turn prompt tokens before and after a tool-definition change |

### Design

One `SKILL.md`, with no `references/` and no `scripts/`. The body opens with a title, `# Writing prompts`, that names the domain at the start of the loaded text; the upstream body has no heading, so this is a layout addition, not a rule. The six context principles follow, with the prompt as the object: S3, S4, S5 and S6 are adapted in wording only (the purpose, the deferred resource, the constrained action and the requested result are stated of the prompt); S7, S8 and the five tool-definition rules are carried as written, except that the typographic apostrophe in the upstream "operation’s" is normalized to ASCII. `## Tool definitions` keeps its five rules: a tool definition is one kind of prompt, and the upstream rules are already about that prompt artifact. The description leads with the writing act and the prompt artifact, keeps the upstream trigger surface — the tool-definition detail, context-loading instructions and the steps of a multi-step workflow — and narrows "designing skills" to "a skill's instructions", because skill creation is the forge's boundary; the Chinese trigger language is appended.

Beside `SKILL.md` the skill directory carries a `THIRD_PARTY_NOTICES` file: it states the upstream repository, pinned revision, upstream path and relation, and reproduces the upstream and repository MIT notices; the frontmatter `license` field names it. The file is not part of the loaded instructions and no provenance line enters the model-facing body, so attribution is declared without changing the skill.

Three things the source does not have are deliberately not added: a reference file (the body is one screen; progressive disclosure would add a file and a retrieval rule with nothing to defer), a script (no source constraint is decided by a command; S14 needs the client's token accounting, and a bundled heuristic would be a new mechanism and a false measure), and an explicit exclusion sentence in the description (the artifact and the act scope the trigger; the upstream file states no exclusion). Their absence is recorded under Rulings, not hidden.

### Source constraints and dispositions

| Id | Disposition | Target home | Basis |
|---|---|---|---|
| S1 | Adapt | `frontmatter.name` = `dsh-spec-agent-experience` | The request fixes the target name; the directory name must match it |
| S2 | Adapt | `frontmatter.description` | The request's prompt-writing domain; the upstream trigger surface is kept — the tool-definition detail (name, description, parameter schema, system-prompt section), context loading (carried as context-loading instructions) and the steps of a multi-step workflow — while "designing skills" becomes "a skill's instructions" (R9); Chinese trigger language is appended |
| S3 | Adapt | Body, first principle | The prompt is the object; purpose, available actions and constraints stay first, and detailed instructions are deferred until the task needs them |
| S4 | Adapt | Body, second principle | The deferred resource is what the prompt defers; the rule's sense is unchanged |
| S5 | Adapt | Body, third principle | The prompt puts the constraint before the action it governs; wording only |
| S6 | Adapt | Body, fourth principle | The prompt asks for the result rather than returning it; identifiers, paths and the no-dump rule stay |
| S7 | Keep | Body, fifth principle | The rule speaks of an operation's result and a thread reply; its wording does not name the prompt, and it is kept as written rather than adapting its example. The typographic apostrophe is normalized to ASCII |
| S8 | Keep | Body, sixth principle | Domain-neutral; carried as written |
| S9 | Keep | Section heading `## Tool definitions` | A tool definition is one kind of prompt; the heading names the artifact the five rules govern |
| S10 | Keep | Tool definitions, first rule | Upstream wording and sense hold |
| S11 | Keep | Tool definitions, second rule | Upstream wording and sense hold |
| S12 | Keep | Tool definitions, third rule | Upstream wording and sense hold |
| S13 | Keep | Tool definitions, fourth rule | Upstream wording and sense hold |
| S14 | Keep | Tool definitions, fifth rule | Upstream wording and sense hold; the measurement depends on the client's token accounting, so the skill states the comparison rather than bundling a measure |

Coverage: S1–S14 each have one disposition row and one home; no constraint is left without one, and no disposition repeats or conflicts. The additions the request and the repository's language rule force are recorded under Rulings R4 (the title), R6 (the Chinese trigger language) and R9 (the "designing skills" narrowing).

### Rulings

| Id | Ruling | Basis | Reversible by |
|---|---|---|---|
| R1 | Prompt writing here means writing or changing any text primarily provided for an agent to read — prompt and context engineering. The list is the set of examples, not a closed boundary: a system prompt, a tool definition, a skill's instructions, context-loading instructions, or a workflow's steps. Tool definitions keep their own section because a tool definition is a prompt artifact with its own rules | The request and the upstream description's artifact list | Narrowing the description |
| R2 | No script is bundled | No source constraint is decided by a command; S14 needs the client's token count, not a heuristic; the forge skill's script conversion test is not met, and the absence is a recorded ruling rather than a stop | Adding a script only with a real tokenizer interface |
| R3 | No reference file is shipped | The body is one screen; a reference would defer nothing. Progressive disclosure is for content the agent does not need on every run | Splitting content when the body outgrows one screen |
| R4 | The body opens with the title `# Writing prompts` | The prompt is the object the request names; the loaded text should name it before the rules; upstream's lack of a heading is a layout fact, not a rule | Removing the heading |
| R5 | The description carries no explicit exclusion clause | The upstream description states none; the artifact and the act scope the trigger. "A skill's instructions" can overlap the forge skill's trigger, which the first forging record already noted; the overlap is accepted rather than resolved by an exclusion mechanism the source does not have | Adding one if trigger eval shows a false positive |
| R6 | The Chinese trigger language is appended to the delivery-language description | The repository's skill descriptions append the review language; the forge skill's delivery/review language rule; the description stays within the 1024-character limit | Trimming it if the description grows past the limit |
| R7 | The note's own translation and pairing record are written at landing | The request defers note pairing to the final review; the repository's active notes are all paired, and landing completes this unit | Removing the pair if the project stops translating notes |
| R8 | The carried text's provenance is declared at the skill's edge, not in its body. The frontmatter `license` field names the skill-root `THIRD_PARTY_NOTICES`; that file states the upstream repository, pinned revision, upstream path and relation, and reproduces the upstream and repository MIT notices. No provenance line enters the model-facing body | A skill body is what the agent loads, so an in-body line would change the skill. The Agent Skills specification's optional `license` field is the skill-level place for a licence name or a reference to a bundled file, and a bundled notice is the only form that travels with an installed skill copy. The repository notice states this placement, and the repository's own forge skill already carries a skill-root `THIRD_PARTY_NOTICES` for its bundled packages | Changing the placement (for example the licence field only, or an in-body line) |
| R9 | The upstream trigger "designing skills" is carried as "a skill's instructions" | Skill creation is the forge's boundary; what this skill governs is the instruction text such a design leaves the agent. The rest of the upstream trigger surface (the tool-definition detail, context-loading instructions and the steps of a multi-step workflow) is kept | Restoring "designing skills" |

## Alternatives considered

**Keep the port and change only the description.** It loses because the domain is prompt writing; a description-only change leaves the body saying nothing about prompts and is not a forging.

**Carry the upstream body verbatim with no title and no wording adaptation.** It loses because the body would keep the prompt implicit while the request's domain is prompt writing; the four adapted principles state the same rules of the artifact being written. The cost of the adaptation is recorded in the disposition table, and seven rules are still carried as written.

**Add a reference file with prompt-writing examples or a checklist.** It loses because the body is one screen and examples would create an open-ended calibration surface; the forge's record would have to carry content the source does not have, and the request requires adaptation, not a new mechanism.

**Bundle a prompt-token measuring script.** It loses because no tokenizer is available to the skill, and a character heuristic would produce a different number from the one S14 tells the writer to compare; a precise script is not possible without the client's token accounting.

**Ship prompt-triggering evals under `evals/`.** They lose because this work has no agent harness run to produce a real trigger rate, and a committed eval set that never ran would be an unverified claim.

**Merge the skill into the forge or the notes skill.** The three own different decisions: the forge produces skill directories, the notes skill owns decision records, and this skill states how a prompt is written. Merging would blur the boundaries the repository already declares.

**Put the provenance in an HTML comment inside `SKILL.md`.** It loses because the body is what the model loads and the request requires the skill itself to be unaffected; a body comment is also not the specification's licence surface.

**Rely on the repository-level `THIRD_PARTY_NOTICES.md` alone.** It loses because an installed skill copy is the skill directory; a repository-level notice does not travel with it, and the MIT notice must be included in copies.

**Use only the frontmatter `license` field.** It loses because the attribution text and the two full MIT notices need a file; the field can only name one.

**Ship a plain `LICENSE` file instead of a notice.** It loses because a licence file states terms but not which upstream revision and path this copy came from, and it would not name the adaptation; the notice file can carry both notices and the provenance facts.

## Consequences

- The package ships a prompt-writing skill that keeps the upstream mechanism: the six context principles and the five tool-definition rules, with the prompt named as the object, prompt-writing triggers and Chinese trigger language.
- The installed copy mirrors the skill, and the first forging record is archived and sealed with its companions. The repository-level `THIRD_PARTY_NOTICES.md` states the skill-text placement rule.
- What the skill gives up is checkability: the gate establishes specification conformance and the mechanical fidelity checks, but trigger accuracy and prompt quality are unverified. The skill stays close to upstream by design; the request requires adaptation, not a rewrite.
- The provenance declaration covers both skills whose text is adapted from upstream — `dsh-spec-agent-experience` and `dsh-spec-agent-notes`; the forge skill's text is this repository's own work, and its notice covers its bundled packages.
- Rollback: revert the landing commit on `refactor/dsh-skills`; it restores the old port, its installed copy, the unarchived first record and the previous repository notice wording.
