---
name: dsh-spec-pr-description
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
description: "Create or update a change-request description in any project — pull request, merge request, patch set, or change list — or after a handled review round. Covers four content blocks, module responsibilities and dependency edges, AI Usage, test evidence and disclosures. Not for commit messages, release notes, code-review findings, or the code itself. 用于创建或更新任何项目中的变更请求描述（pull request、merge request、patch set 或 change list），或处理完一轮评审之后使用。涵盖四块内容、模块职责与依赖边、AI Usage、测试证据与披露义务。不用于提交信息、发布说明、代码审查发现或代码改动本身。"
---

# Writing change-request descriptions

A change request's description states why the change exists, what it changes, what proves it, and how much the AI took part. This skill defines those obligations, how to write them and when to update them. A project's conventions supply the tracker, template, language, tools, and the form, values, place and examples of disclosures, but never remove an obligation. The project supplies them through its standing instructions (`AGENTS.md` or the file it cites), `CONTRIBUTING.md` and the change-request template; the standing instructions outrank the contributing guide, which outranks the template. A project that declares no conventions of its own can adopt the working defaults in [references/default-conventions.md](references/default-conventions.md).

## Defaults

Apply this skill's use-site default only when neither the request nor existing project instructions choose one. Treat existing instructions as authoritative read-only input; do not ask for, create, modify, or copy instructions merely to select a default.

## Description structure

The default structure uses four second-level headings in this order — `## Motivation`, `## Changes`, `## Testing`, `## AI Usage` — with the default labels `Interface changes`, `Behavior changes`, `Module responsibilities and dependencies`, `Test design`, `Test entries`, the disclosure labels and `Proof`, written in English. A project's template or conventions may replace, rename or regroup the headings and labels; the description still states the four content blocks and one AI Usage section under the project's structure. With no declared structure, the default applies. The AI Usage section keeps its AI-DECLARATION block and its table under any structure.

The prose and table headers are written in the description's language: the language the project's existing change descriptions use; when none exist, the project's documentation language; otherwise the language of the request that asked for the description. The prose follows the project's declared prose standard (when available, consider using the `dsh-spec-prose-standard` skill).

Each change request in a stack has its own description, covering only its layer against its base.

### Motivation

- State the problem in one sentence.
- Reference at least one same-project tracked issue when the project has an issue tracker and an issue tracks the change; never invent a reference. If the tracker exists but no issue tracks the change yet, state that no matching issue exists and give the tracker search or status that makes the absence checkable. If the project has no issue tracker, state that no tracker applies. A project's conventions choose the reference syntax, but they cannot turn an existing tracked issue into an optional reference.
- Use the project's declared issue-reference syntax; when the project declares none, use the tracker's conventional form — for a GitHub tracker, `Fixes #N`, `Closes #N` or `Resolves #N` when the change resolves the issue and `Refs #N` when it gives context — or link the issue and name the tracker.
- A change-request number is not an issue reference, and a reference hidden in an HTML comment, a code fence or inline code does not count.

### Changes

- **Interface changes**: summarize changes to commands, flags, configuration keys, environment variables, public APIs and exports, extension or plugin registration values, protocols, and persisted formats; write `None` when there are none.
- **Behavior changes**: summarize results that users, models, developers, or the system can observe, including defaults, performance, timing, and output; write `None` when there are none. Changes to documentation and agent instructions are behavior changes for the readers they guide.
- **Module responsibilities and dependencies**: when the change adds or removes a package, module, workspace boundary, runtime dependency, or unit responsibility, apply [Module responsibilities and dependencies](#module-responsibilities-and-dependencies); write `None` when none moves.
- State only behavior that the diff guarantees and the tests cover.

#### Module responsibilities and dependencies

Derive the edge set from the base-to-head manifest diff, never from memory. Read the adopting project's declared runtime-dependency manifests and optional or peer-like edge declarations; when conventions declare no equivalent, use the files that build or launch each unit. Name every added or removed runtime dependency as `A → B` for “A depends on B”; keep development-only, test-fixture, template, and third-party edges out, and keep composition roots in a separate item because mounting a unit is not a runtime call. For each added edge `A → B`, verify that B's runtime dependencies do not name A, then state that no reverse edge exists or list each one.

A responsibility table uses one row per changed or depended-on unit: the unit, its responsibility in one sentence, and whether this change adds, removes, changes, or leaves it in place. A reviewer uses the table to judge that each affected unit has one coherent responsibility and that each added edge is required by that responsibility. A package that only supplies a dependency needs a row only when its responsibility explains why the edge is necessary. Call flow is a short bounded path, not an implementation walkthrough; include it only when the change adds or changes a cross-package call.

### Testing

Testing starts with the test design, followed by the test entries.

**Test design**: for each item in Changes, name the covering tests and why the coverage is complete. Present that argument in the form that fits the change type:

| Change type | What the test design shows |
|---|---|
| Behavior change | A behavior matrix of scenario × behavior before × behavior after × covering test, showing which scenarios failed or differed before the change |
| Performance change | Before and after values per stage or scenario, with the measurement conditions: machine, run count, and how the value is taken |
| Refactoring or migration without behavior change | How the unchanged behavior is shown: byte-for-byte comparison, unchanged snapshots, or old-versus-new comparison tests |
| Documentation only | How the content is checked: links, paired-language consistency, example compilation, or similar |

When the change mixes types, give one form for each type present. Items that Changes lists as `None` need no test design. When the project declares how to select the checks a change owes, follow it (when available, consider using the `dsh-spec-pre-push-checks` skill).

**Test entries**:

- Add one entry per test method; state the command or steps visibly, and the behavior it covers.
- List only tests that have run, with their results; add later runs when the description is updated. State whether the evidence comes from a local run or from CI.
- Put reviewable evidence, such as test output, screenshots, recordings, or logs, in that entry's proof block (the default label is `Proof`, written `<details><summary>Proof</summary>`); when the full output is long, the block may hold the command, the counts, and a result summary.

### Change-specific disclosures

Disclose each decision a reviewer needs to assess but cannot derive from the diff and the tests: state the decision, why it was made, and the evidence or values that let a reviewer check it. Write the disclosure in the section the decision concerns, after a bold label that names it, and never as a new heading. The project's conventions set the form, the values, the place and the examples of a disclosure; they never decide whether a disclosure is owed.

Typical decisions that carry a disclosure, and what it states:

- A change to behavior an existing test describes: why the behavior changed.
- A raised documented word or size budget, or another established limit: the old and new values and why the raise is needed.
- A change to product-user-visible behavior: the evidence that demonstrates it — a recording, screenshots, or the artifact the project's rule names — with the disclosures that rule requires beside it; when no rule names one, state what evidence demonstrates the behavior.
- A new translation term the project's terminology lacks: the source of the rendering, or a proposed rendering at the project's pending-terms place; when the project declares none, state that the rendering is proposed.

The four are typical cases, not a closed list: a project may add its own categories, and a decision outside them is disclosed when a reviewer cannot assess it without the disclosure. When no decision needs a disclosure, write none.

### AI Usage

Every description carries exactly one AI Usage section, recording how much the AI took part in each stage and who made the decisions. Write it when the description is created and update it whenever the description changes. Each change request in a stack records only its own work against its base; do not copy another layer's AI Usage rows.

Read [references/ai-usage.md](references/ai-usage.md) before writing or updating the section, then apply its checklist during the final read-back. That reference owns the stages, levels, grading, decision records, badge, AI-DECLARATION block, table format, language adaptation, replacement and review-update rules, and validation. Replace any earlier AI Usage section or AI-role section with this one; never keep both.

## Creating and updating the description

Write the complete description when the change request is created, even when it is created outside a template: prepare the body in a path the project does not commit (the project's ignored path, otherwise a temporary directory) and create the request through the project's tool — the hosting service's own surface, or, for a GitHub project, `gh pr create --body-file <file>`, `gh pr edit <number> --body-file <file>`, and `--attach` when the description embeds media, as the example forms. On an update, save the existing description first (for a GitHub project, `gh pr view <number> --json body --jq .body` is the example form). Change only the sections that need it: keep content and media the author wrote, replace an existing AI-DECLARATION block in place while updating every affected AI Usage row, and remove statements that no longer match the code.

Before the description is considered written, read it back and verify:

- the description states the four content blocks — why (with a tracked-issue reference or the explicit no-tracker or no-matching-issue exception), what, the test design and entries, and the AI Usage section — under the default headings in order or under the project's structure;
- every reported package responsibility and dependency edge matches the current manifests and call sites;
- exactly one AI Usage section exists and no superseded section remains;
- the AI Usage section satisfies [references/ai-usage.md](references/ai-usage.md) §Read-back validation and reflects the current code and review state;

Update the description when it no longer matches the change and after a handled review round; a handled review round ends when its fixes are published and its comments are answered. Rewrite the affected sections so they state the work as it now stands: the description is not a change history.

## Boundaries

This skill writes and updates a change-request description. It does not write the code change, the commit messages, the release note, or the code-review findings; the rules that own those artifacts apply to them. The description's claims are limited by what the diff and the tests establish.
