---
name: dsh-spec-pr-description
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
description: "Use when creating or updating a change-request description in any project — pull request, merge request, patch set, or change list — or after a handled review round. Covers the four content blocks, AI Usage, test evidence and disclosures. Not for commit messages, release notes, code-review findings, or the code itself. 用于创建或更新任何项目中的变更请求描述（pull request、merge request、patch set 或 change list），或在处理完评审之后。涵盖四块内容、AI Usage、测试证据与披露义务，遵循项目约定。不用于提交信息、发布说明、代码审查发现或代码改动本身。"
---

# Writing change-request descriptions

A change request's description states why the change exists, what it changes, what proves it, and how much the AI took part. This skill defines what every description contains, how to write it, and when to update it. The four content blocks and the obligations below apply in every project; a project's conventions supply the tracker, template, language, tools, and the form, values, place and examples of disclosures, and they never remove an obligation. The project supplies them through its standing instructions (`AGENTS.md` or the file it cites), `CONTRIBUTING.md` and the change-request template; the standing instructions outrank the contributing guide, which outranks the template. A project that declares no conventions of its own can adopt the working defaults in [references/default-conventions.md](references/default-conventions.md).

## Description structure

The description states four content blocks: why the change exists, what it changes, what proves it, and how much the AI took part. The default structure uses four second-level headings in this order — `## Motivation`, `## Changes`, `## Testing`, `## AI Usage` — with the default labels `Interface changes`, `Behavior changes`, `Test design`, `Test entries`, the disclosure labels and `Proof`, written in English. A project's template or conventions may replace, rename or regroup the headings and labels; the description still states the four content blocks and one AI Usage block under the project's structure. With no declared structure, the default applies. The AI Usage block keeps its `ai-declaration` markers and its table under any structure.

The prose and table headers are written in the description's language: the language the project's existing change descriptions use; when none exist, the project's documentation language; otherwise the language of the request that asked for the description. The prose follows the project's declared prose standard (when available, consider using the `dsh-spec-prose-standard` skill).

Each change request in a stack has its own description, covering only its layer against its base.

### Motivation

- State the problem in one sentence.
- Reference the same-project tracked issue when one tracks the change; never invent a reference. Use the project's declared reference syntax; when the project declares no reference syntax, use the tracker's conventional form — for a GitHub tracker, `Fixes #N`, `Closes #N` or `Resolves #N` when the change resolves the issue and `Refs #N` when it gives context — or link the issue and name the tracker.
- A change-request number is not an issue reference, and a reference hidden in an HTML comment, a code fence or inline code does not count.

### Changes

- **Interface changes**: summarize changes to commands, flags, configuration keys, environment variables, public APIs and exports, extension or plugin registration values, protocols, and persisted formats; write `None` when there are none.
- **Behavior changes**: summarize results that users, models, developers, or the system can observe, including defaults, performance, timing, and output; write `None` when there are none. Changes to documentation and agent instructions are behavior changes for the readers they guide.
- State only behavior that the diff guarantees and the tests cover.

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

Every description carries this section, recording how much the AI took part in each stage of the change and who made the decisions.

The section has five stages in a fixed order (`breakdown`, `design`, `testing`, `implementation`, `review`), five levels ordered by AI involvement (`hint`, `assist`, `pair`, `copilot`, `auto`), and `n/a` for a stage that does not exist or has not happened. Each row records the level, the AI involvement as a multiple of 5% within that level's range, and the decisions behind the grade. The AI-DECLARATION block pins specification version 0.1.2; its badge shows the level with the most AI involvement among the rows, ignoring `n/a`.

The section is written at creation and updated whenever the description changes. The review row records only handled review comments: until a round has been handled it reads `n/a` with a statement that none have been handled. A stage's level is updated when it changes, and the badge URL and declaration line follow the highest stage level. An existing AI-DECLARATION block is replaced in place between its `ai-declaration:start` and `ai-declaration:end` markers, so exactly one block remains.

Each decision record states who made which decisions in one or two sentences, at most 80 CJK characters or 40 words, as settled fact and without hedges such as "not seen in the session" or "pending author confirmation": name one or two representative decisions and give only a count for the rest; refer to people as the author or a reviewer, never by username; leave out judgments, session times, session ids, direct quotes, and the running or handling of checks and CI (local skips, hooks, reruns, unrelated failures).

Read [references/ai-usage.md](references/ai-usage.md) before writing or updating this section. It carries the level and stage definitions, the grading rules, the badge URLs, the exact declaration block and table format, the language adaptation, the update-timing detail, the specification's scope, and a filled example.

## Creating and updating the description

Write the complete description when the change request is created, even when it is created outside a template: prepare the body in a path the project does not commit (the project's ignored path, otherwise a temporary directory) and create the request through the project's tool — the hosting service's own surface, or, for a GitHub project, `gh pr create --body-file <file>`, `gh pr edit <number> --body-file <file>`, and `--attach` when the description embeds media, as the example forms. On an update, save the existing description first (for a GitHub project, `gh pr view <number> --json body --jq .body` is the example form). Change only the sections that need it: keep content and media the author wrote, replace only the contents of an existing AI-DECLARATION block, and remove statements that no longer match the code. The description carries exactly one AI Usage section: when the description still has an AI section heading from the project's earlier format, that heading, its level line and its rows are replaced by the AI Usage section; never keep both.

Before the description is considered written, read it back — the required validation for the structural items this skill fixes:

- the description states the four content blocks — why (with its issue reference when one exists), what, the test design and entries, and the AI Usage block — under the default headings in order or under the project's structure;
- exactly one AI Usage block exists — one section carrying the AI-DECLARATION block, under the default or a project heading;
- the `ai-declaration:start` and `ai-declaration:end` marker pair is present;
- the AI Usage table has one row per stage in the fixed order, keyed by the English stage identifiers;
- every level is one of `hint`, `assist`, `pair`, `copilot`, `auto`, `n/a`;
- the badge level equals the highest stage level, ignoring `n/a`;
- the AI-DECLARATION block matches `references/ai-usage.md` §Section format: the badge URL matches its level, the declaration line's level equals the badge, the version is 0.1.2, and a non-English description keeps the stage and level identifiers in English with a rendering in the description's language;
- AI Usage matches the current code and review state, and no superseded section remains.

Update the description when it no longer matches the change and after a handled review round; a handled review round ends when its fixes are published and its comments are answered. Rewrite the affected sections so they state the work as it now stands: the description is not a change history.

## Boundaries

This skill writes and updates a change-request description. It does not write the code change, the commit messages, the release note, or the code-review findings; the rules that own those artifacts apply to them. The description's claims are limited by what the diff and the tests establish.
