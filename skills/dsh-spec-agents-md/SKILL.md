---
name: dsh-spec-agents-md
description: "Use when writing, reviewing, or updating an AGENTS.md file — the standing instructions a repository gives coding agents — including when migrating an existing agent-instruction file to that name, to decide which content belongs in it, which content becomes a pointer or link to its owning document, how inline instructions are written, and how scope and updates are settled. Not for writing README or documentation prose, not for general prompt engineering, not for another agent-instruction format's own content, and not for applying an existing AGENTS.md during a code review. 用于编写、评审或更新 AGENTS.md——仓库给编码 agent 的常驻指令，包括把已有的 agent 指令文件迁移为该名称：决定哪些内容应写入、哪些应抽成指向拥有该内容的文档的指针或链接、内联指令怎么写，以及适用范围与更新边界如何裁决。不用于撰写 README 或其他文档行文，不用于通用提示词工程，不用于其他 agent 指令格式的内容，也不用于在代码评审中执行既有 AGENTS.md。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
---

# AGENTS.md content

`AGENTS.md` is the dedicated, predictable place where a repository gives coding agents the context and instructions to work on it — a README for agents. It is standard Markdown with no required fields and no required headings; the agent parses the text. It is created at the repository root; the format is shared by many coding agents, and the file is written in project terms rather than one product's prompt syntax.

The file complements the README and the documentation instead of replacing or repeating them. The README keeps quick starts, the project description and contribution guidelines for human readers; the AGENTS.md carries the extra, sometimes detailed context an agent needs — build steps, tests, conventions — including material that would clutter the README or serve no human contributor.

No section is prescribed: the format's popular sections — project overview, build and test commands, code style guidelines, testing instructions, security considerations — are choices, not a schema, and the file's headings follow its content.

## What belongs

A statement belongs when it is about this project and it changes what an agent does or keeps the agent from a wrong assumption. The format's guidance — what a new teammate would be told about working here — is the starting point; applied to an agent's work, it covers:

- build, test, lint, run, release and deployment commands, with the directory and tool context they need;
- toolchain, environment and dependency-setup facts, including what is unavailable;
- code, test, review, commit-message and pull-request conventions;
- security constraints, large datasets, and pitfalls that surprise newcomers;
- a minimal project overview where the repository's shape is not evident from the tree.

It does not belong when:

- only a person needs it — a quick start, a product description, contribution guidelines — and the agent does not act on it; that material stays in the README or documentation, linked only when an agent must read it;
- it is generic agent advice with no project fact in it;
- the agent can see it in the code it reads or edits, or in the command's own output, so the line adds a rule the agent would already follow;
- another document owns it: the AGENTS.md states the rule the agent must follow and links the owner instead of copying the owner's text;
- it is a volatile value or a secret — a current release number, a credential, private data; a stable constraint such as a required runtime version still belongs;
- it is history or rationale: the file states the current rule and links the document that owns the reasoning;

## Inline, or a pointer

Keep inline the facts and instructions an agent needs before it can choose its next action: the commands that define done, the conventions that decide how code is written, the safety and authorization constraints of the work. An inline instruction is short enough to read with the rest of the file and complete enough that the agent can act correctly without following a link.

Use a pointer or a link for content an agent needs only for a particular kind of task, or content whose owning document already serves a reader the AGENTS.md cannot replace: setup walkthroughs, architecture rationale, API references, long procedures, examples, contribution policy, release notes. A pointer also keeps a volatile value reachable without copying it.

A pointer states three things: the target, what the target contains, and the condition under which the agent reads it. The rule the agent must follow stays inline; a bare "see the docs" is not an instruction, and a link does not excuse the file from stating the rule. For example: "Release steps: read `docs/releasing.md` when cutting a release; run its checks from the repository root." A fact that both a person and an agent need has one home: the AGENTS.md states the agent-operational form and links the human document rather than copying it, so the two cannot drift apart.

A relative link resolves from the AGENTS.md file's directory to a document that exists at the repository's current state; an external URL names a stable resource. A link that no longer resolves is a defect of the same class as a stale command.

When detail leaves the file and no document owns it, it lives where the project's declaration says; without a declaration, in `.agents/dsh-spec-agents-md/` beside the AGENTS.md that links it, created on first use. Only agent-facing detail that no human document owns goes there; anything a person must read belongs in the documentation the person reads. The extracted files are repository content, committed with the AGENTS.md that links them; the pointer contract and the update boundary apply to them unchanged.

## The scope of a file

The root file carries repository-wide rules, and a nested AGENTS.md inside a package or subproject carries the rules for the files under it. Agents read the nearest file in the directory tree; the closest AGENTS.md to the edited file wins over a conflicting ancestor; explicit user chat prompts override everything. The format states no loading model beyond that sentence, so the placement rules below take "the closest file wins" as the only guarantee.

- A rule is written in the file whose scope it governs: a rule that holds only under a directory belongs in that directory's file, not in the root with a condition.
- A nested file carries what its subtree adds or changes. A rule the subtree cannot work without is stated there even when the root also states it, because the format does not promise that an ancestor is read alongside the nested file; a rule that does not affect the subtree's own commands, conventions or constraints stays in the root.
- A nested file exists for a boundary with its own facts — its own commands, conventions or constraints — not for splitting one repository's instructions by heading.
- A contradiction between files is a placement defect even though the reader resolves it by proximity; proximity is not a licence to keep conflicting instructions.
- The root file is complete for the whole repository: an agent that reads only the root, or that works outside every nested scope, must not lose a repository-wide rule.
- The file states project conventions; it cannot outrank the operator's explicit instruction, so a rule is not written as a demand to ignore what the user asks.
- The format's migration answer renames an existing agent-instruction file — AGENT.md in its example — to AGENTS.md and keeps a symlink under the old name for tools that still read it.

## Writing the instruction

An inline instruction names the exact command, path or convention and the directory or condition it applies from; it states the files or situations it governs so the agent can tell when it applies; and where verification is part of the rule, it names the project's own check that says the work is done.

A heading names the class of work it contains, and a heading with no content is removed rather than filled.

The wording follows the project's prose requirements (when available, consider using the `dsh-spec-prose-standard` skill); the way instructions are shaped and discovered follows the project's prompt requirements (when available, consider using the `dsh-spec-agent-experience` skill).

## Keeping it current

The format calls AGENTS.md living documentation. The change that makes a line false changes the line in the same change: a renamed script, a moved directory, a changed convention, a new package boundary, an updated toolchain. The agent attempts to run the programmatic checks the file lists and to fix failures before finishing, so a stale command wastes a run and can produce a wrong conclusion; a line that no longer holds is removed, not marked historical. When a subproject appears, the rules that now govern only that subtree move into its nested file; when detail outgrows the file, it moves to its owning document and the rule stays inline with a pointer.

## Deciding a draft

A draft is accepted when:

- every line passes the belonging test, and no line is generic agent advice;
- every rule is in the file whose scope it governs; the root file is complete for the whole repository; no two files contradict each other as a placement shortcut;
- every pointer states its target, what the target contains and when to read it; its target exists at the current state, and the rule around it is complete without the link;
- no fact is copied from a document that owns it, and no human-only content is duplicated from the README or documentation;
- every command is executable as written from the directory the file gives, and every programmatic check it names is one the project actually runs;
- no secret or volatile value is present, and no stale historical statement or copied rationale remains;
- every line that the current change makes false has been updated and every rule that no longer holds has been removed;
- the headings serve their content and no section is empty.

## Source

The format and its content guidance are published at [https://agents.md](https://agents.md); this skill governs content within that format.
