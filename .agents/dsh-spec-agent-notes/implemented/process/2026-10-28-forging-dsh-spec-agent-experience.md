# Agent Note: Forging dsh-spec-agent-experience for prompt writing

Status: implemented

English | [中文](2026-10-28-forging-dsh-spec-agent-experience.zh.md)

## Problem

The package's `dsh-spec-agent-experience` entry was a create-mode port: its `SKILL.md` carried the upstream `agent-experience` text verbatim and differed only in frontmatter. The request that produced this change replaced it with a forging for prompt writing: the skill was to be derived from the upstream skill alone, with the prompt as the object, and the old version served only as the replacement target. Two facts made a new forging necessary rather than cosmetic. The upstream body never names the prompt as the object it governs; its description names model-facing tool definitions and skill design, and its rules speak of what "the model" sees, so a prompt writer had no trigger vocabulary that named the act and no line of the body bound the six principles to the artifact being written. And the request narrowed the domain to prompt writing — any text primarily provided for an agent to read — while keeping the upstream mechanism, so the port's decision to add nothing was replaced by an adaptation decision.

The old version and its record were not design sources; the upstream file was the source, and the request supplied the audience, the domain, the delivery form and the stop conditions. [The first forging record](../../archived/process/2026-10-23-forging-dsh-spec-agent-experience.md) is archived with this change.

## Decision

The package ships `dsh-spec-agent-experience` as a forge from the upstream `agent-experience` skill for prompt writing. The landed `skills/dsh-spec-agent-experience/` holds:

- `SKILL.md`: a title `# Writing prompts`; the six context principles with the prompt as the object (S3–S6 adapted in wording, S7 and S8 carried as written); `## Tool definitions` with its five rules carried as written, one typographic apostrophe normalized; and a description adapted to the request — English lead with the writing act and the prompt artifacts, the upstream trigger surface kept, "designing skills" narrowed to "a skill's instructions", Chinese trigger language appended.
- `THIRD_PARTY_NOTICES`: the skill text's provenance declaration — upstream repository, pinned revision, upstream path, relation, and the upstream and repository MIT notices — named by the frontmatter `license` field.
- No script, no reference file, and no provenance line in the model-facing body.

The old create-mode port's content was replaced, `pnpm run skill:refresh` mirrored the skill into the installed copy, the upstream-named installed copy `dsh-agent-experience` was removed with its legacy manager-manifest entry, and the first record moved to the frozen archive. The Chinese review draft and its pairing record were paired at the stop and removed by `publish`; the delivery-side language switcher was removed before publishing.

### Intent

| Field | Value |
|---|---|
| Name | `dsh-spec-agent-experience` (fixed by the request; matches the directory name) |
| Goal | A skill an agent applies when it writes or changes a prompt, so the model-facing information is discoverable and spends context efficiently |
| Boundary | Writing or revising a prompt: a system prompt, a tool definition, a skill's instructions, context-loading instructions, or the steps of a multi-step workflow. Out of scope: forging a skill (the forge owns it), writing a decision record (the notes skill owns it), installing, loading or using a skill |
| Audience and domain | Prompt writers; any text primarily provided for an agent to read — prompt and context engineering |
| Languages | Delivery English. Review language and additional trigger language Chinese |
| Baseline | Branch `forge/dsh-spec-agent-experience` from `refactor/dsh-skills` at `609514c`, in a linked worktree; the main worktree stayed on `refactor/dsh-skills` |

### Forging settings

| Setting | Value |
|---|---|
| Mode | From a source, replacing the landed same-name skill; the old skill was the replacement target only |
| Source | The upstream `SKILL.md` named below; its constraints are S1–S14 |
| Work directory / landing | `.agents/dsh-spec-skill-forge/dsh-spec-agent-experience/` (removed by publish) / `skills/dsh-spec-agent-experience/` |
| Review drafts | Declared suffixes `.zh.md` and `.i18n.yaml`; written and paired only at the stop, then removed by `publish` |
| Record | This note, kept current with what shipped |
| Rollback | Revert the squash commit on `refactor/dsh-skills`; the old port, its installed copy and the first note return to the tree with the revert |

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
| R1 | Prompt writing here means writing or changing any text primarily provided for an agent to read — prompt and context engineering. The list is the set of examples, not a closed boundary: a system prompt, a tool definition, a skill's instructions, context-loading instructions, or a workflow's steps. Tool definitions keep their own section because a tool definition is a prompt artifact with its own rules | The request owner's clarification and the upstream description's artifact list | Narrowing the description |
| R2 | No script is bundled | No source constraint is decided by a command; S14 needs the client's token count, not a heuristic; the forge skill's script conversion test is not met, and the absence is a recorded ruling rather than a stop | Adding a script only with a real tokenizer interface |
| R3 | No reference file is shipped | The body is one screen; a reference would defer nothing. Progressive disclosure is for content the agent does not need on every run | Splitting content when the body outgrows one screen |
| R4 | The body opens with the title `# Writing prompts` | The prompt is the object the request names; the loaded text should name it before the rules; upstream's lack of a heading is a layout fact, not a rule | Removing the heading |
| R5 | The description carries no explicit exclusion clause | The upstream description states none; the artifact and the act scope the trigger. "A skill's instructions" can overlap the forge skill's trigger, which the first forging record already noted; the overlap is accepted rather than resolved by an exclusion mechanism the source does not have | Adding one if trigger eval shows a false positive |
| R6 | The Chinese trigger language is appended to the delivery-language description | The repository's skill descriptions append the review language; the forge skill's delivery/review language rule; the description stays within the 1024-character limit | Trimming it if the description grows past the limit |
| R7 | The note's own translation and pairing record were written at landing, after the final human review | The request deferred note pairing to that review; the repository's active notes are all paired, and the landing change makes this unit complete | Removing the pair if the project stops translating notes |
| R8 | The carried text's provenance is declared at the skill's edge, not in its body. The frontmatter `license` field names the skill-root `THIRD_PARTY_NOTICES`; that file states the upstream repository, pinned revision, upstream path and relation, and reproduces the upstream and repository MIT notices. No provenance line enters the model-facing body | A skill body is what the agent loads, so an in-body line would change the skill. The Agent Skills specification's optional `license` field is the skill-level place for a licence name or a reference to a bundled file, and a bundled notice is the only form that travels with an installed skill copy. The repository notice now states this placement, and the repository's own forge skill already carries a skill-root `THIRD_PARTY_NOTICES` for its bundled packages | Changing the placement (for example the licence field only, or an in-body line) |
| R9 | The upstream trigger "designing skills" is carried as "a skill's instructions" | Skill creation is the forge's boundary; what this skill governs is the instruction text such a design leaves the agent. The rest of the upstream trigger surface (the tool-definition detail, context-loading instructions and the steps of a multi-step workflow) is kept | Restoring "designing skills" |

### Provenance research

R8's placement was settled after the stop at the request owner's direction. The evidence, read on 2026-10-28:

- The [Agent Skills specification](https://agentskills.io/specification.md) makes `license` an optional frontmatter field: a licence name or a reference to a bundled licence file.
- The repository's `THIRD_PARTY_NOTICES.md` names the upstream repository and pinned revision, and its in-file header sentence describes the files carried over from the upstream source tree; 17 files under `scripts/dsh-spec-manager/scripts/` carry an SPDX line and 16 also state their upstream origin. No Markdown under `skills/` or `.agents/skills/` carried such a header before this change.
- The forge skill's own [THIRD_PARTY_NOTICES](../../../skills/dsh-spec-skill-forge/THIRD_PARTY_NOTICES) is the repository's existing placement for a skill's third-party material: a file beside the skill, not content in it.
- The upstream checkout carries one MIT `LICENSE` and one `THIRD_PARTY_NOTICES.md` at its repository root and no per-skill licence or notice, because its skills are first-party there.
- The upstream and repository MIT licences require the copyright and permission notice to be included in copies; an installed skill copy is the skill directory, so a repository-level notice does not reach it.
- The request owner authorized completing the repository-level `THIRD_PARTY_NOTICES.md` handling. That notice now distinguishes a carried source file (header next to its SPDX line) from a carried or adapted skill text (frontmatter `license` naming a skill-root `THIRD_PARTY_NOTICES`), names both adapted skills' declarations, and states that the forge skill carries a skill-root notice for its bundled packages. The notes skill's declaration followed the same way after this landing, recorded in [its forging record](2026-10-27-forging-dsh-spec-agent-notes.md). The forge skill's text is this repository's own work — its forging records name the Agent Skills specification and this repository's earlier skill, not upstream text — so it needs no carried-text declaration.

Conclusion: a declaration is required for this adapted text, and the non-invasive, spec-aligned placement is the `license` field plus a skill-root notice. The frontmatter field changes no loaded body; the notice file is never read as instructions. The repository-level notice states the rule and the remaining migration.

### Verification

| # | Requirement | Anchor | Evidence |
|---|---|---|---|
| 1 | The landed skill conforms to the Agent Skills specification: closed frontmatter set, name matches the directory, description within its limit, links resolve, budget | Mechanical | Gate on the landed directory → `13 check(s), 0 failed`; 22 lines, ~569 tokens; description 422 characters; license 59 characters |
| 2 | Every source constraint S1–S14 has one disposition and one home | Judged; the disposition table is the named reference | One conclusion per row in § Source constraints and dispositions |
| 3a | The landed body carries each of the eleven upstream rule lead-ins | Mechanical | Lead-in check → `11/11 rule lead-ins present` |
| 3b | The seven verbatim rules (S7, S8, S10–S14) are the upstream rule text, with the typographic apostrophe normalized | Mechanical | Verbatim diff against upstream → no output, exit 0 |
| 3c | The four adapted rules (S3–S6) keep the upstream decision | Judged; the upstream file is the named reference | One conclusion per rule: S3 keeps purpose, actions and constraints first; S4 keeps a description and retrieval path for every deferred resource; S5 keeps the constraint ahead of the action; S6 keeps identifiers and paths while the prompt asks for the result |
| 4 | The description leads with the delivery language, appends the Chinese trigger language, names the writing act and the artifact, and keeps the upstream trigger surface with the R9 narrowing | Judged; specification § description, the forge skill's review language rule, S2 | One conclusion: the landed description leads in English, appends the Chinese clause, names the writing act and the prompt artifact and keeps the upstream trigger surface |
| 5 | The skill is applicable to prompt writing: the title, the description and the four adapted principles name the prompt as the object; S7 and S8 stay domain-neutral; no task outside the boundary is claimed | Judged; the request's audience and domain | One conclusion per element: the title names the writing act; the description names the prompt and its artifacts; S3–S6 each state its rule of the prompt; S7 and S8 carry domain-neutral rules and name no prompt referent; the boundary excludes skill forging, decision records and installation, and the skill claims none of them |
| 6 | The skill ships no script and no reference mechanism | Mechanical | Gate lines `script coverage` and `reference mentions` report none; the landed directory lists `SKILL.md` and `THIRD_PARTY_NOTICES` |
| 7 | The review draft was paired at the stop and the project pairing gate reported it current | Mechanical | At the stop: forge `pair` reported `SKILL.zh.md` and `SKILL.i18n.yaml` → `SKILL.md` (2 actions, 0 failed) and `check translation-pair: ok`; `publish` then removed both |
| 8 | The notes tree conforms to its contract, with the archived unit sealed | Mechanical | Active check → `31 note(s) and 62 companion(s) checked`; archive check → 15 frozen artifacts checked, 3 new artifacts sealed |
| 9 | The repository suite, formatting and DCO pass | Mechanical | `pnpm test` → 206 tests, 206 pass, 0 fail; `pnpm run format:check` → all matched files use the correct format; every branch commit carries a matching Signed-off-by, and the landing commit repeats the same trailer |
| 10 | The landing replaced the old port, mirrored the installed copy, and archived the first record | Mechanical | `pnpm run skill:refresh` mirrored 2 files; `diff -r` between `skills/` and `.agents/skills/` is empty; the first record and its companions are in `archived/process/` and sealed |
| 11 | The description triggers on real prompt-writing requests and stays quiet on adjacent tasks | Unverified | No agent harness or trigger eval was run; the request owner confirmed the check is inherently non-mechanical here, and the human review decides. The method is the eval loop in the optimizing-descriptions page |
| 12 | The principles improve the prompt a writer produces | Unverified | No clean-context evaluation ran; the request owner confirmed the effect cannot be mechanically verified here, and the refine-with-real-execution loop on the best-practices page needs an eval harness and a model |
| 13 | The carried text's provenance is declared without entering the model-facing body, and the repository notice states where that declaration lives | Judged; the Agent Skills specification's `license` field, the repository's `THIRD_PARTY_NOTICES.md` and the forge skill's skill-root notice are the named references | One conclusion: the frontmatter `license` names the skill-root `THIRD_PARTY_NOTICES`, which states upstream repository, pinned revision, upstream path and relation and reproduces the upstream and repository MIT notices; `SKILL.md` carries no provenance line; the repository notice's DeepSeek Harness section states the skill-text placement for both adapted skills |

Verification commands used at landing:

```bash
node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-agent-experience
node -e 'const fs = require("node:fs"); const leads = ["Start with minimal context", "Make discovery explicit", "Keep critical constraints visible", "Prefer bounded outputs", "Use locality", "Evaluate total work", "Delete obvious constraints", "Describe behavior, not implementation", "Put parameter rules on the parameter", "Say each fact once", "Measure the change"]; const text = fs.readFileSync("skills/dsh-spec-agent-experience/SKILL.md", "utf8"); const missing = leads.filter((lead) => !text.includes("**" + lead)); console.log(missing.length === 0 ? leads.length + "/" + leads.length + " rule lead-ins present" : "missing: " + missing.join("; ")); process.exit(missing.length === 0 ? 0 : 1)'
diff <(sed -n '10,11p;15,19p' submodules/dsh/packages/preset/agent-preset/skills/agent-experience/SKILL.md | sed "s/’/'/") <(grep -E '^- \*\*(Use locality|Evaluate total work|Delete obvious constraints|Describe behavior, not implementation|Put parameter rules on the parameter|Say each fact once|Measure the change)' skills/dsh-spec-agent-experience/SKILL.md)
node skills/dsh-spec-agent-notes/scripts/notes.mjs check --companion .zh.md --companion .i18n.yaml
node skills/dsh-spec-agent-notes/scripts/notes.mjs archive --companion .zh.md --companion .i18n.yaml
pnpm test
pnpm run format:check
```

#### Verifying the gate parameter

The gate runs with its defaults: current specification limits (name 64, description 1024, compatibility 500, body under 500 lines and 5,000 tokens). No option was overridden.

### Reviews

A read-only design auditor with no part in the work reviewed the design at commit `7c58fef` and returned **needs revision** (two majors, six minors); the revision at `9dae252` returned **accept with minors**, and the minors were applied at `16b1e05` before the candidate was written. The candidate was written at `2656b7e`; two independent read-only reviewers then accepted it **with minors**, applied at `bdc0d31`, and both confirmed the fixes closed. The request owner then directed two follow-ups after the stop — the carried text's provenance declaration and the repository-level notice handling — and later the same declaration for the notes skill; all are recorded above, and a read-only reviewer checked each amendment. The request owner's final review accepted the result and authorized landing and a squash merge into `refactor/dsh-skills`.

### Pages read

| Page | Date | What it supplied |
|---|---|---|
| [Agent Skills index](https://agentskills.io/llms.txt) | 2026-10-28 | The linked page set; the specification and best-practices pages the forge skill requires |
| [Specification](https://agentskills.io/specification.md) | 2026-10-28 | Required frontmatter and its constraints, body freedom, progressive disclosure, file references, the optional `license` field |
| [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices.md) | 2026-10-28 | Spend context wisely, coherent unit, moderate detail, progressive disclosure, defaults, calibration |
| [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions.md) | 2026-10-28 | The description carries the whole trigger burden; imperative phrasing; trigger eval method |

The index links further pages for the quickstart, client implementation, scripts and evaluating output. They were not read on demand: the skill ships no script, implements no client and runs no eval this note claims. The offline fallback was not used because every required page was readable.

## Deferred

- The baseline branch has not been pushed. The squash merge is local; the review handover and the push are the maintainer's next acts.
- The forging worktree and its branch remain local after the squash merge; removing them is housekeeping.

## Alternatives considered

**Keep the port and change only the description.** It loses because the request replaced the old skill and supplied prompt writing as the domain; a description-only change leaves the body saying nothing about prompts and would not be a forging.

**Carry the upstream body verbatim with no title and no wording adaptation.** It loses because the body would keep the prompt implicit while the request's domain is prompt writing; the four adapted principles state the same rules of the artifact being written. The cost of the adaptation is recorded in the disposition table, and seven rules are still carried as written.

**Add a reference file with prompt-writing examples or a checklist.** It loses because the body is one screen and examples would create an open-ended calibration surface; the forge's record would have to carry content the source does not have, and the request asks for adaptation, not a new mechanism.

**Bundle a prompt-token measuring script.** It loses because no tokenizer is available to the skill, and a character heuristic would produce a different number from the one S14 tells the writer to compare; a precise script is not possible without the client's token accounting.

**Ship prompt-triggering evals under `evals/`.** They lose because this work has no agent harness run to produce a real trigger rate, and a committed eval set that never ran would be an unverified claim.

**Merge the skill into the forge or the notes skill.** The three own different decisions: the forge produces skill directories, the notes skill owns decision records, and this skill states how a prompt is written. Merging would blur the boundaries the repository already declares.

**Put the provenance in an HTML comment inside `SKILL.md`.** It loses because the body is what the model loads and the request owner requires the skill itself to be unaffected; a body comment is also not the specification's licence surface.

**Rely on the repository-level `THIRD_PARTY_NOTICES.md` alone.** It loses because an installed skill copy is the skill directory; a repository-level notice does not travel with it, and the MIT notice must be included in copies.

**Use only the frontmatter `license` field.** It loses because the attribution text and the two full MIT notices need a file; the field can only name one.

**Ship a plain `LICENSE` file instead of a notice.** It loses because a licence file states terms but not which upstream revision and path this copy came from, and it would not name the adaptation; the notice file can carry both notices and the provenance facts.

## Consequences

- The package ships a prompt-writing skill that keeps the upstream mechanism: the six context principles and the five tool-definition rules, with the prompt named as the object, prompt-writing triggers and Chinese trigger language.
- The old create-mode port's content is replaced, the installed copy mirrors the landed skill, and the first forging record is archived and sealed with its companions. The repository-level `THIRD_PARTY_NOTICES.md` change (the skill-text placement rule) rides in the same landing commit.
- What the skill gives up is checkability: the gate establishes specification conformance and the mechanical fidelity checks, but trigger accuracy and prompt quality are unverified (anchors 11 and 12). The skill stays close to upstream by design; the request asked for adaptation, not a rewrite.
- The provenance declaration now covers both skills whose text is adapted from upstream — `dsh-spec-agent-experience` and `dsh-spec-agent-notes`; the forge skill's text is this repository's own work, and its notice covers its bundled packages.
- Rollback: the landing is one squash commit on `refactor/dsh-skills`; reverting it restores the old port, its installed copy, the unarchived first record and the previous repository notice wording, and returns this note to the tree as it was before landing.
