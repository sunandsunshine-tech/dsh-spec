# Agent Note: Forging dsh-spec-error-handling from the upstream error-handling skill

Status: implemented

English | [中文](2026-10-28-forging-dsh-spec-error-handling.zh.md)

## Problem

The set extracts DeepSeek Harness's development pattern as skills, and one part of that pattern has no skill behind it: how a system declares a failure, assigns a stable machine identity, decides who owns recovery, and makes the outcome visible to the person it affects. Upstream `dsh` carries that part in `.agents/skills/dsh-error-handling/SKILL.md` and its error-code reference. Its title names the harness; its examples cite that repository's error base, registry fields, errno mapping, and `assertNever` helper; its convention rule says to reuse "package error conventions"; and its report rule assumes the product's runtime. The set needs the mechanism without the product's types, fields, paths, or reporting assumptions.

## Decision

`dsh-spec-error-handling` ships from `skills/dsh-spec-error-handling/`, and its installed copy at `.agents/skills/dsh-spec-error-handling/` mirrors it byte for byte. The skill is a `SKILL.md` and `references/error-contracts.md` for software-engineering projects of any kind: applications, libraries, command-line tools, services, embedded systems, and batch systems. The body carries six units: typed structured failures; handling, recovery or stopping; silent failure handlers; localized visible reports; compatibility and verification; and foundations. The reference owns field roles, family and code selection, standard conditions, foreign-error conversion, compatibility, and the test checklist.

The skill ships no script. Whether a failure has an owning family, a containment rule, a truthful reason for silent handling, and an actionable report are design judgments. The skill has no environment requirements and therefore no `compatibility` field.

- Delivery language is English; the review language is Chinese, and additional Chinese trigger language is appended to the description because the review language differs from delivery.

### Source and revision

Source revision: `dsh-v0.2.2-rc.5` (`9c2670d3bce5275e0d1610272958121af87787bb`), read on 2026-11-20.

- `.agents/skills/dsh-error-handling/SKILL.md`
- `.agents/skills/dsh-error-handling/references/error-codes.md`

Silent failure handling was read from `deepseek-ai/deepseek-harness` commit `603ed7e7d0da17d3290e44d5b3b999a636840a2d` on 2026-11-20. The repository pin is owned by [the baseline issue](https://github.com/sunandsunshine-tech/dsh-spec/issues/104); this record owns the source revisions from which the text was adapted.

Agent Skills pages read on 2026-11-20:

- [documentation index](https://agentskills.io/llms.txt)
- [best practices for skill creators](https://agentskills.io/skill-creation/best-practices.md)
- [optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions.md)
- [evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills.md)

Adopter declaration: `AGENTS.md` — its standing orders, boundaries and conventions.

Read for the repository's procedure and record format, not as design sources: `CONTRIBUTING.md` (commit convention, DCO, bilingual pairs), `skills/dsh-spec-agent-notes/references/notes-contract.md` (this record's format), `skills/dsh-spec-skill-forge/SKILL.md` (the forging procedure), the repository's skills and earlier records (format and precedent only; none of their wording is carried into the skill), and the `dsh-spec-agent-experience` skill for the repository's precedent on a ported skill's shape and provenance treatment.

Not read as design sources: skills outside this repository's tree and the installed copies under `.agents/skills/`.

### Adapted target text

The six adapted units, exactly as the skill carries them, against the upstream sentence each replaces:

| Unit | Upstream | Target text |
|---|---|---|
| N11a | `## Catch, recover, or stop` | `## Handle, recover, or stop` |
| N12 | For each failure, define handling and reporting owners, containment, and guarantees in the owning API documentation: valid invariants, absent/partial/committed/unknown effects, and cleanup responsibility. | For each failure, define handling and reporting owners, containment, and guarantees in the owning API's documentation or the project's equivalent record of the API's contract: valid invariants, absent/partial/committed/unknown effects, and cleanup responsibility. |
| N15 | Catching limits exception propagation, not mutations. | Handling a failure limits how far it propagates, not the mutations already made. |
| N21 | Localize through the receiving application's locale mechanism where one exists; other diagnostics use their existing output language. | Localize through the locale mechanism of the surface that shows the text, where one exists; other diagnostics use their existing output language. |
| N23 | Untrusted state or unknown outcomes must be visible through UI or default-enabled, accessible logs: report the impact, uncertainty, system disposition, and safe next step. | Untrusted state or unknown outcomes must be visible through the surface the affected user or system actually uses — a UI, command output, default-enabled accessible logs, or the error the caller receives: report the impact, uncertainty, system disposition, and safe next step. |
| N27 | Verify resulting state and visible outcomes, not merely that an exception was caught. | Verify the resulting state and visible outcomes, not merely that the failure was intercepted. |

### Expanded source additions

The later upstream additions are adapted as follows.

| Unit | Upstream | Target text |
|---|---|---|
| E1 | An error that carries a machine code extends `HarnessError`. | A family that carries machine-readable identity uses the project's existing discriminant mechanism; without one, a new failure gains a stable machine-readable discriminant and literal values. |
| E2 | Prefer one error class per owning package or domain over one class per failure. | Prefer one family per owning package or domain over one type per failure. |
| E3 | `name` is the class name and `code` is a stable `UPPER_SNAKE_CASE` string. | Identity and literal values follow project conventions; absent a convention, choose a string code, numeric status or exit status, tagged variant, or documented combination and record its complete supported set. |
| E4 | A code names the failure class consumers act on, not the call site. | The target keeps this rule verbatim apart from terminology. |
| E5 | Convert Node, SDK, protocol, native, worker, and cross-realm errors at the owning package with the original cause. | Convert operating-system, SDK, protocol, native, worker, and cross-realm failures at the owning domain with the original cause where supported, or equivalent structured detail or diagnostics otherwise. |
| E6 | A process or worker boundary transports `name` and `code` and reconstructs the error. | A process, worker, or wire boundary transports the portable machine identity and reconstructs an equivalent owning failure; an identical runtime class is not required. |
| E7 | An empty catch may discard only one expected statement and needs a named cause and reason. | A silent handler may cover one operation, must name the expected failure, and must state why valid state remains. |
| E8 | Some failures are safe while others must surface; throw the rest. | When only some failures are safe, select the expected discriminant and rethrow or surface the rest. |
| E9 | Existing `name` and `code` values persist in logs and analytics, so changes need an upgrade guide. | A persisted or externally consumed error identity is a compatibility promise and needs a migration record when changed. |
| E10 | Tests assert `error.info.name` and `error.info.code`, not only the message. | Tests assert the project's exact machine identity, the resulting state and, where a boundary exists, the reconstructed identity. |

### Presupposition audit

The first table covers the original source: the 31 disposition rows plus the three section headings that have no disposition row. A conclusion is **shared** (the assumption holds across the target scope), **vacuous** (the clause has no object where the assumption fails, so it is not false), **none** (the unit carries no runtime assumption, or a cited work's runtime does not bind the target), or **changed** (**adapted** or **re-bound**). A conditional unit whose assumption holds only where the feature exists is recorded **shared or vacuous**. A carried unit is kept only under shared, vacuous, shared-or-vacuous or none.

| # | Unit | Carried unit | Presupposition | Target scope | Conclusion |
|---|---|---|---|---|---|
| P1 | N1 | name `dsh-error-handling` | none beyond the source's own name | a skill name is project metadata | None; kept as a name change under N1 |
| P2 | N2 | description sentence | the trigger vocabulary names failure, recovery, retry, background work and user-visible reports | the terms name the topic, not a runtime obligation | None; kept — the description changes under N2 |
| P3 | N3 | H1 `DeepSeek Harness Error Handling` | the source product | the target's subject is error handling | None; kept as a referent change under N3 |
| P4 | N4 | intro | none — failures, owners and safety are model-neutral | any software project | Shared; kept |
| P5 | N5h | heading `## Typed, structured failures` | failures can be declared and structured | exception classes, result enums and error codes all provide a declared structure | Shared; kept |
| P6 | N5 | declared types, stable discriminants, handling-relevant details | a declared failure taxonomy with a stable discriminant | every failure model declares kinds (classes, codes, enums) and supports a stable discriminant | Shared; kept |
| P7 | N6 | package error conventions | a packaging unit owns error conventions | packages, modules and services are the common owning units | Changed (Re-bind under N6); the owning unit stays concrete |
| P8 | N7 | preserve causes | failures can carry their cause | cause chaining exists in some models and is approximated in others | Shared or vacuous; kept |
| P9 | N8 | machine identity vs display text | failures carry both an identity and a display text | where no display text exists the second half names nothing | Shared or vacuous; kept |
| P10 | N9 | never route handling by parsing messages | failure messages exist | where messages do not exist the clause is vacuous | Shared or vacuous; kept |
| P11 | N10 | `assertNever` example | the source-repository helper | the equivalent is an unreachable-branch or failed-invariant defect | Changed (Re-bind under N10) |
| P12 | N11 | containment must not turn defects into success | none | any failure model | Shared; kept |
| P13 | N11a | heading `## Catch, recover, or stop` | exceptions are the failure model | result values and error codes propagate failures without exceptions | Changed (Adapt under N11a); "Handle" is the umbrella, "recover" and "stop" are its outcomes, and the interception sense stays in N15 |
| P14 | N12 | owning API documentation | an API-documentation practice, and a record its consumers and implementers rely on | the contract may be recorded in API documentation or an equivalent project record | Changed (Adapt under N12); the equivalent record plays the API documentation's role, so the residual record premise is shared or vacuous |
| P15 | N13 | invariants, effect states, cleanup responsibility | effects can be in absent, partial, committed or unknown states | any stateful operation; where no effects exist the clause is vacuous | Shared or vacuous; kept |
| P16 | N14 | background work retains the obligations | background work exists | where it does not, the clause is vacuous, not false | Shared or vacuous; kept |
| P17 | N15 | catching limits exception propagation | exceptions | result-value and error-code models propagate failures without exceptions | Changed (Adapt under N15) |
| P18 | N16 | only the affected state's owner establishes continuation | affected state exists | where there is no state, the clause is vacuous | Shared or vacuous; kept |
| P19 | N17 | stop dependent work, discard state or instances, or escalate | dependent work and state or instances exist | where they do not, the clause is vacuous | Shared or vacuous; kept |
| P20 | N18 | logging alone is not recovery | logging exists | where it does not, the clause is vacuous | Shared or vacuous; kept |
| P21 | N19 | retries, budgets, supervision, observable degradation | retries and long-lived supervision exist | where they do not, the clause is vacuous; where they do, cancellation and observable degradation are the obligations | Shared or vacuous; kept |
| P22 | N20h | heading `## Localized, actionable, visible reports` | reports exist to carry these properties, and a locale mechanism may exist | every failure eventually surfaces somewhere; the localization property follows N21 | Shared or vacuous; kept |
| P23 | N20 | every final report has a summary, an affected operation and a next action | a report exists | the rule names its content, not a channel | Shared; kept |
| P24 | N21 | receiving application's locale mechanism | an application runtime with a locale mechanism, and a surface that shows the text | libraries and services may have no locale mechanism, or another surface owns one | Changed (Adapt under N21); shared where a locale mechanism exists, vacuous where none does |
| P25 | N22 | user-facing text | some text reaches a user | where no text reaches a user the clause is vacuous | Shared or vacuous; kept |
| P26 | N23 | UI or default-enabled logs | a product with a UI and default-enabled logs | libraries, command-line tools, services, embedded and batch systems each have a different surface | Changed (Adapt under N23); the error the caller receives carries the report where it is the only surface |
| P27 | N24 | persistent invalid state needs persistent visibility | the surface adapted under N23 | the rule adds persistence to that surface; where no such state exists it is vacuous | Shared or vacuous; kept — it inherits N23's surface |
| P28 | N25 | never claim success, rollback or safe retry without guarantees | the claimed outcome exists | where no rollback exists the clause is vacuous | Shared or vacuous; kept |
| P29 | N26 | reporting failures need an independent fallback | a reporting path exists | every failure report has a path; the rule asks for a second one | Shared; kept |
| P30 | N27 | not merely that an exception was caught | exceptions, and visible outcomes to verify | result-value and error-code models intercept failures without exceptions; where a failure has no visible outcome, the verification target is the resulting state | Changed (Adapt under N27); shared where visible outcomes exist, vacuous where the failure has no visible outcome |
| P31 | N28h | heading `## Foundations` | none | the section is literature | Shared; kept |
| P32 | N28 | Meyer: contracts and invariants | the literature's contract lineage | the citation grounds the mechanism; no rule requires adopting the runtime | None; kept — the literature does not bind the target |
| P33 | N29 | Sutter: exception safety guarantees | C++ exception semantics | the citation names the book's subject; no rule requires C++ exception semantics | None; kept — the literature does not bind the target |
| P34 | N30 | Armstrong: isolation and supervision | the Erlang process model | the citation grounds supervision; no rule requires the Erlang runtime | None; kept — the literature does not bind the target |

### Expanded presupposition audit

| # | Unit | Carried unit | Presupposition | Target scope | Conclusion |
|---|---|---|---|---|---|
| P35 | E1 | Coded failures extend a shared base error | the runtime has inheritance and one base error | some languages use values or plain objects | Changed: re-bound to the project's base error when one exists |
| P36 | E2 | One family per owning domain | the runtime has classes | domains and structured error families exist without classes | Changed: family and subtype vocabulary covers both |
| P37 | E3 | Stable name and code conventions | a declaration can carry machine-readable identity | every structured failure can carry a machine discriminant | Shared or vacuous; the target supplies a result-only fallback strategy |
| P38 | E4 | A code names the consumer action | the consumer can act on the condition | the same distinction is the purpose of a machine-readable code | Shared; kept |
| P39 | E5 | Convert foreign failures at the dependency owner | an external dependency boundary exists | no conversion is needed where the failure originates in the owning domain | Shared or vacuous |
| P40 | E6 | Preserve identity across a process, worker, or wire boundary | such a boundary exists | the rule imposes no requirement on projects without one; the receiving owner reconstructs an equivalent failure without requiring an identical runtime class | Shared or vacuous |
| P41 | E7 | Persistent or externally consumed identity is compatible | a consumer persists or observes the identity | projects without such consumers do not incur the migration requirement | Shared or vacuous |
| P42 | E8 | Tests assert machine identity and state | expected failures are tested | an untested failure path cannot claim this evidence | Shared where the test exists |
| P43 | E9 | Silent handling covers one expected operation and reason | the language or framework has a silent handler | an equivalent explicit discard rule carries the same judgment | Shared or vacuous |
| P44 | E10 | Detailed contract guidance is lazily loaded | the skill host supports references | the delivery format supports a one-level reference | Shared |

### Description

The skill's frontmatter description, exactly (484 characters, under the repository's 500-character catalog budget):

> Apply error-handling principles when designing, implementing, or reviewing failures in applications, libraries, command-line tools, and services: exceptions, result variants, status or exit codes, recovery, retries, background tasks, silent handlers, and user-visible error reports. Not for general code review, test design, performance tuning, or debugging unrelated to failure handling. 用于应用、库、命令行工具和服务中的错误处理：异常、结果变体、状态码或退出码、恢复、重试、后台任务、静默捕获与用户可见错误报告；不用于一般代码评审、测试设计、性能调优，或与失败处理无关的调试。

The English sentence is the delivery language. It names the adopting system shapes, failure representations, and adjacent tasks the skill covers, then excludes general code review, test design, performance tuning, and debugging unrelated to failure handling. The Chinese sentence is the additional trigger language.

### Constraint dispositions

Dispositions use the forge skill's values: **Keep** carries the original wording and sense with language and layout adjustments; **Adapt** instantiates a target value; **Re-bind** abstracts a vanished referent to its purpose and makes the target's equivalent concrete; **Dissolve** records that the referent is gone and what check takes over. Home `SK` = the `SKILL.md`.

| # | Source | Constraint | Disposition | Home | Basis |
|---|---|---|---|---|---|
| N1 | frontmatter `name` | The skill is named `dsh-error-handling`. | Adapt | `SK` frontmatter `name` | the target skill's name is `dsh-spec-error-handling` (P1) |
| N2 | frontmatter `description` | "Apply error-handling principles when designing or reviewing failures, recovery, retries, background tasks, and user-visible error reports." | Adapt | `SK` frontmatter `description` | the delivery side leads with English and appends the Chinese trigger language; "designing, implementing, or reviewing" names the target reader's moments, and the domain clause names software (P2) |
| N3 | H1 | The title is `DeepSeek Harness Error Handling`. | Adapt | `SK` H1 | the target's subject is error handling; the product the source names is not the target's subject (P3) |
| N4 | intro | Define failures, their owners, and what remains safe after failure. | Keep | `SK` intro | domain-neutral; failures, owners and safety are model-neutral (P4) |
| N5 | § Typed, structured failures | Expected failures need declared types, stable discriminants, and handling-relevant details. | Keep | `SK` § Typed, structured failures | every failure model declares kinds (classes, codes, enums) and supports a stable discriminant; "declared types" names the declaration, not a language family (P6) |
| N6 | § Typed, structured failures | Reuse package error conventions. | Re-bind | `SK` § Typed, structured failures | the fixed packaging unit is gone as a determinate referent; the equivalent means is the software unit that owns the failure — its package, module or service — and the target keeps that owning unit concrete (P7) |
| N7 | § Typed, structured failures | Preserve causes. | Keep | `SK` § Typed, structured failures | shared where a cause can be carried, vacuous where the model has no cause concept (P8) |
| N8 | § Typed, structured failures | Separate machine identity from display text. | Keep | `SK` § Typed, structured failures | shared or vacuous: where no display text exists the second half names nothing (P9) |
| N9 | § Typed, structured failures | Never route handling by parsing messages. | Keep | `SK` § Typed, structured failures | shared where messages exist, vacuous where they do not (P10) |
| N10 | § Typed, structured failures | Unexpected defects such as `assertNever` may remain plain `Error`. | Re-bind | `SK` § Typed, structured failures | `assertNever` is a source-repository helper; a general project reaches the same purpose with an unreachable-branch or failed-invariant defect, which the target names while keeping the permission that such a defect may remain a plain error (P11) |
| N11 | § Typed, structured failures | Containment must never turn unexpected defects into success. | Keep | `SK` § Typed, structured failures | domain-neutral; any failure model (P12) |
| N11a | `## Catch, recover, or stop` (heading) | The section is titled "Catch, recover, or stop". | Adapt | `SK` § Handle, recover, or stop | "catch" names the exception mechanism the source is written in; the target scope includes result values and other explicit failure models, so the heading names the umbrella and its outcomes without naming the mechanism. "Handle" is the umbrella; "recover" and "stop" are its two outcomes, and the interception sense stays in N15 (P13) |
| N12 | § Handle, recover, or stop | For each failure, define handling and reporting owners, containment, and guarantees in the owning API documentation. | Adapt | `SK` § Handle, recover, or stop | "owning API documentation" assumes an API-documentation practice the target scope does not share; the equivalent is the owning API's documentation or the project's equivalent record of the API's contract, and the ownership rule is unchanged (P14) |
| N13 | § Handle, recover, or stop | Guarantees cover valid invariants, absent/partial/committed/unknown effects, and cleanup responsibility. | Keep | `SK` § Handle, recover, or stop | shared where effects exist, vacuous where none do (P15) |
| N14 | § Handle, recover, or stop | Background work retains these obligations. | Keep | `SK` § Handle, recover, or stop | the clause is conditional on background work existing; where it does not, the sentence is vacuous, not false (P16) |
| N15 | § Handle, recover, or stop | Catching limits exception propagation, not mutations. | Adapt | `SK` § Handle, recover, or stop | "catching" and "exception" name the exception mechanism; the equivalent is that handling a failure limits how far it propagates, not the mutations already made, and the mutation limit is unchanged (P17) |
| N16 | § Handle, recover, or stop | Only the affected state's owner can establish safe continuation. | Keep | `SK` § Handle, recover, or stop | shared where affected state exists, vacuous where there is none (P18) |
| N17 | § Handle, recover, or stop | Otherwise stop dependent work, discard invalid state or instances, or escalate. | Keep | `SK` § Handle, recover, or stop | shared where dependent work or state exists, vacuous where neither does (P19) |
| N18 | § Handle, recover, or stop | Logging alone is not recovery. | Keep | `SK` § Handle, recover, or stop | shared where logging exists, vacuous where it does not (P20) |
| N19 | § Handle, recover, or stop | Retries require safe repetition, cancellation and an explicit owner; finite operations need budgets, while continuing supervision needs lifecycle ownership and observable degradation. | Keep | `SK` § Handle, recover, or stop | the clauses are conditional on retries and supervision existing; where they do not, the sentence is vacuous, not false (P21) |
| N20 | § Localized, actionable, visible reports | Every final report needs a readable summary, affected operation, and safe next action. | Keep | `SK` § Localized, actionable, visible reports | domain-neutral; the rule names the report's content, not a channel (P23) |
| N21 | § Localized, actionable, visible reports | Localize through the receiving application's locale mechanism where one exists; other diagnostics use their existing output language. | Adapt | `SK` § Localized, actionable, visible reports | "receiving application" assumes an application runtime; the equivalent is the locale mechanism of the surface that shows the text, where one exists, and the conditional and the diagnostics rule are kept (P24) |
| N22 | § Localized, actionable, visible reports | Keep sensitive internal details out of user-facing text. | Keep | `SK` § Localized, actionable, visible reports | "user-facing text" is generic across the surfaces N23 names, and vacuous where no text reaches a user (P25) |
| N23 | § Localized, actionable, visible reports | Untrusted state or unknown outcomes must be visible through UI or default-enabled, accessible logs, reporting the impact, uncertainty, system disposition, and safe next step. | Adapt | `SK` § Localized, actionable, visible reports | a UI and default-enabled logs are the source product's surfaces; the target names the surface the affected user or system actually uses, and the four required pieces of the report are unchanged (P26) |
| N24 | § Localized, actionable, visible reports | Persistent invalid state needs persistent visibility. | Keep | `SK` § Localized, actionable, visible reports | domain-neutral once the surface is the one N23 names; vacuous where no persistent invalid state exists (P27) |
| N25 | § Localized, actionable, visible reports | Never claim success, rollback, or safe retry without guarantees. | Keep | `SK` § Localized, actionable, visible reports | the clause is conditional on the claimed outcome existing; where rollback does not exist, it is vacuous, not false (P28) |
| N26 | § Localized, actionable, visible reports | Reporting failures need an independent fallback. | Keep | `SK` § Localized, actionable, visible reports | domain-neutral; the rule names the fallback, not a channel (P29) |
| N27 | § Localized, actionable, visible reports | Verify resulting state and visible outcomes, not merely that an exception was caught. | Adapt | `SK` § Localized, actionable, visible reports | "exception" is the source's failure model; the equivalent is verifying the resulting state and visible outcomes rather than that the failure was intercepted, and the verification duty is unchanged (P30) |
| N28 | § Foundations | Meyer's *Object-Oriented Software Construction* (1997): contracts and invariants. | Keep | `SK` § Foundations | software-engineering literature whose contract lineage grounds the mechanism; no rule requires adopting the runtime (P32) |
| N29 | § Foundations | Sutter's *Exceptional C++* (1999): exception safety guarantees. | Keep | `SK` § Foundations | software-engineering literature that names the book's subject; no rule requires C++ exception semantics (P33) |
| N30 | § Foundations | Armstrong's thesis (2003): isolation and supervision, with its link. | Keep | `SK` § Foundations | software-engineering literature that grounds supervision; the link is external, so it is not a relative-path dependency, and no rule requires the Erlang runtime (P34) |

### Expanded source dispositions

| # | Source | Constraint | Disposition | Home | Basis |
|---|---|---|---|---|---|
| E1 | rc.5 `SKILL.md` | A coded error extends the shared `HarnessError`. | Re-bind | `SK` § Typed, structured failures | the project's existing type, name, code, status, variant, exit status or documented combination is authoritative; no ecosystem-specific base, field name or fallback spelling is required |
| E2 | rc.5 `SKILL.md` | Prefer one class per domain over one class per failure. | Adapt | `SK` § Typed, structured failures | family and subtype retain the ownership distinction without assuming classes |
| E3 | rc.5 `SKILL.md` | Name is the class name; code is `UPPER_SNAKE_CASE` and declared beside the class. | Adapt | `SK` § Typed, structured failures | the project's convention wins; otherwise the target requires one stable machine-readable discriminator and a recorded supported set without prescribing a field or spelling |
| E4 | rc.5 `SKILL.md` | A code names the consumer action, not the call site. | Keep | `SK` § Typed, structured failures | domain-neutral |
| E5 | rc.5 `SKILL.md` | Convert foreign errors at the owning package with the original cause. | Adapt | `SK` § Typed, structured failures | the owning package becomes the package, module, service, or domain that owns the dependency; runtimes without cause chaining retain the original in structured detail or diagnostics |
| E6 | rc.5 `SKILL.md` | A process or worker transports `name` and `code` and reconstructs the class. | Re-bind | `SK` § Typed, structured failures | transport preserves the project's portable identity; the receiving owner reconstructs an equivalent owning failure, while `name` and `code` remain one field realization |
| E7 | rc.5 `references/error-codes.md` | Persisted or analytics-visible identity changes are compatibility events. | Keep | `SK` § Compatibility and verification | retry, UI, replay, analytics, and migration are already platform-neutral consumers |
| E8 | rc.5 `references/error-codes.md` | Tests assert `name` and `code` for every expected failure. | Adapt | `SK` § Compatibility and verification | the target asserts the project's exact machine identity, resulting state, and reconstructed boundary identity without requiring a particular field path |
| E9 | master `SKILL.md` | A silent catch covers one statement, names the expected failure, states a reason, and rethrows other failures. | Re-bind | `SK` § Silent failure handlers | the safety result is one operation, one expected discriminant, a truthful reason, and selective surfacing across languages |
| E10 | request and upstream reference | Detailed family, code, conversion, compatibility, and test guidance needs one owner. | Adapt | `references/error-contracts.md` | the detailed contract is contextual material; keeping it out of the entry preserves lazy loading and the main procedure’s focus |

### Target rulings

| # | Ruling | Why | Reversible by |
|---|---|---|---|
| R1 | The skill is a prose `SKILL.md` plus one load-on-demand contract reference; it ships no bundled script and no `compatibility` field. | The entry carries design judgment; the expanded source's naming tables, conversion table, compatibility rules, and checklist are detailed reference material. No source rule is decidable as a complete command. | Merge the reference into the entry, or add a script that decides a new mechanical contract. |
| R2 | The product name is dropped from the H1; the intro sentence and three of the four section headings and their order are carried as layout; the "Catch, recover, or stop" heading is adapted under N11a. | The source's product is not the target's subject; the only product-bearing identity text the source has is the H1. | Restore the product name, which re-imports the source's boundary. |
| R3 | The description names applications, libraries, command-line tools and services; exceptions, result variants and status or exit codes; implementing as well as designing and reviewing; the excluded adjacent tasks; and the Chinese trigger keywords. The exact text is quoted under § Description. | The model sees the description before it loads the body, so the trigger must name the system shapes and failure representations whose failures this skill governs. | Edit the description and rerun the skill-spec gate and trigger-sensitive model eval. |
| R4 | `assertNever` is re-bound to an unreachable-branch or failed-invariant defect; such a defect may remain a plain error and containment still never turns it into success. | The helper is a source-repository convention; a general project reaches the same purpose with its own exhaustiveness or assertion mechanism, and the rule is about the defect's kind, not the helper's name. | Restore the helper's name, which narrows the rule to one ecosystem. |
| R5 | "Package error conventions" becomes the error conventions of the package, module or service that owns the failure. | The concrete owning unit is what makes the rule reusable rather than a slogan; a general project's unit may be a package, a module or a service, and the rule names the unit that owns the failure. | Widen the unit to the project. |
| R6 | The Foundations section and its external link are carried unchanged. | The three works are software-engineering literature; the link is external and absolute, so the gate does not treat it as a local dependency. | Remove the section, which drops the source's rationale for the rules. |
| R7 | The skill declares provenance from outside the loaded text: its frontmatter `license` field names a skill-root `THIRD_PARTY_NOTICES`, and the root `THIRD_PARTY_NOTICES.md` lists it among the adapted skills. | The repository's adapted-skill convention requires the declaration for an installed copy; the notice carries the upstream path, revision, relation and both MIT notices, and the root notice registers the skill. | Remove the notice and the root registration. |
| R8 | The skill's Chinese review draft (`.zh.md`) and its pairing record (`.i18n.yaml`) exist only at the stop, are checked by the project pairing gate, and are removed by `publish`; this record carries its Chinese companion and consistency record. | The request confines translation pairing to the stop; the note pair is completed at the final review. | Remove the note companion and its consistency record. |
| R9 | This record ships in `implemented/process/` with the skill. | The notes contract moves a record from `proposed/` to `implemented/` when the decision ships. | Move it back to `proposed/process/` if the landing is reverted. |
| R10 | The target scope is software projects of any kind: applications, libraries, command-line tools, services, embedded and batch systems. The text assumes no UI, no default-enabled logs, no API-documentation practice, no application runtime, and no single failure model. | The request names software engineering as the domain; a rule that only holds for a product-shaped application is not applicable there, and the set exists to be installed into arbitrary projects. | Narrow the scope and state the surface assumptions in the description. |
| R11 | A source sentence is carried verbatim only when its runtime or product assumption holds in the target scope or its clause is vacuous where absent; otherwise it is adapted with role-based or conditional wording, and the conclusion is recorded as a row in § Presupposition audit and, where it changes, as an adaptation row in § Constraint dispositions. | A sentence that assumes a product runtime is not domain-neutral; verbatim fidelity is not generality. The audit makes each assumption explicit and checkable. | Rewrite a row or the policy. |
| R12 | The exception vocabulary becomes handling/failure vocabulary in the heading and the two sentences that name it (N11a, N15, N27); "failure" covers exceptions, result values and other explicit failure models. | The source is TypeScript, but the target scope includes languages whose failures are values; the ownership, containment and verification rules survive the vocabulary change. | Restore the exception words, which narrows the skill to one failure model. |
| R13 | Where the source names a reporting surface or a documentation practice, the target names the surface the affected user or system actually uses, and the contract record may be the owning API's documentation or the project's equivalent record (N12, N21, N23). | The target scope includes projects with no UI or default logs and with no API documentation; the rule keeps its required content and its conditional "where one exists". | Restore a fixed surface or documentation practice. |
| R14 | Issue #104 owns the repository extraction pin. This skill records the rc.5 source revision and commit `603ed7e7d0da17d3290e44d5b3b999a636840a2d`, which supplies the silent-handler rules. | Provenance must distinguish the release baseline from a later source read; describing both as the pin would be false. | Move the source revision back to the baseline only when a release tag contains it. |
| R15 | Product-specific error bases, registry fields, concrete error classes, errno names, and upgrade-guide paths dissolve into project-owned families, discriminants, details, causes, and migration records. A project without a convention chooses one stable machine-readable discriminator and records its supported set; no field name, code spelling, declaration form or vocabulary is prescribed. | The target must preserve an adopter's current error model while still retaining a result-only fallback for new failures. | Restore a concrete platform contract or mandatory string-code vocabulary and narrow the skill's stated scope. |
| R16 | Silent handling is a separate section because it owns a safety judgment that is easy to confuse with logging or recovery. | The upstream check exposes a recurring shape; the target needs the reason, discriminant, state consequence, and selective surfacing at one point of use. | Fold the section into general handling only if the distinction stops changing decisions. |
| R17 | The detailed code guide lives in `references/error-contracts.md`. | The guide is used only when defining or reviewing a machine-readable failure contract, so lazy loading avoids carrying its tables through every error-handling task. | Inline the guide when the entry can lose a proportionate amount of other context. |

### Requirement anchors

Every disposition row is the anchor for the requirement it carries. N1 is mechanical: the skill gate checks the name and directory match. N2-N30, N11a, and E1-E10 are judged against the source sentence. N30 retains an external literature link. The skill gate mechanically checks format, size, references, and link integrity. The development eval corpus records message-only failures, boundary-loss failures, silent multi-step handling, and preservation of an existing project discriminant.

The clean-context model evaluation under `tests/skill-evals/evidence/2026-11-20-pr113/` ran
`codex exec --ephemeral` for candidate, previous-skill and no-skill profiles. All five candidate
scenarios loaded the skill and passed all 20 assertions. Both baselines passed 18 of 20; each
discarded unexpected cleanup failures in the silent-handler scenario. One candidate run per
scenario is evidence of the tested behavior, not a claim that every phrasing or host profile has
equal effect.

The ten-query trigger corpus installed the candidate in an otherwise empty project and recorded
whether the run read `SKILL.md`. Five positive prompts triggered. Five near-miss prompts initially
produced four non-triggers and one performance-tuning false positive; adding performance tuning to
the description's exclusions made the rerun five of five non-triggers. The first run was not used
as final evidence for that query.

## Alternatives considered

**Carry the upstream file verbatim, changing only the name.** It lost because three of its referents do not exist in a general project — the product in the title, the `assertNever` helper, and the package conventions — and five of its sentences and one of its section headings assume the source product's runtime. A reader outside the source repository cannot act on them, and the set's adopter declaration requires a change to trace to the source or be recorded as a deliberate deviation; a copy that keeps the product's vocabulary does neither.

**Rewrite the rules from the mechanism in fresh wording.** It lost because the upstream text is already software-engineering guidance whose precision — the owner, containment, effect and visibility distinctions — is what the target needs to keep; a whole-body rewrite would discard that and require re-arguing fidelity for every sentence. Only the assumption-bearing units are adapted.

**Keep the carried text and add a scope paragraph.** It lost because the rule would stop being a rule for most of the target scope, and the boundary would have to redefine the reporting surfaces that the mechanism depends on; adapting the surfaces at the point of use keeps the rule intact for every project.

**Adapt every sentence that mentions a channel or a mechanism.** It lost because the target scope shares some of them: background work, retries, rollback and declared failure kinds are conditional or vacuous where absent, not wrong; adapting them would add words without changing the rule.

**Keep the expanded error contract in the entry.** It lost because family selection, code naming, standard conditions, conversion, and compatibility now form a detailed reference used only for error-contract work; the entry remains the shorter design procedure.

**Bundle a script that checks a design for error-handling sections.** It lost because no rule in the source is mechanically decidable: a command can grep for headings but cannot decide whether an owner, containment rule, guarantee or recovery path is correct. Such a script would invent a mechanism the source does not have.

**Keep `assertNever` as the example.** It lost because it names one ecosystem's helper; the rule is about the defect's kind and what containment must not do, and the target can state both without the helper's name.

**Name the section "Intercept, recover, or stop".** It lost because `handle` is the umbrella that covers interception and post-failure action across failure models, while the source's interception sense is stated explicitly in N15; `intercept` would name one step rather than the section's choice.

**Add implementation steps or a review checklist.** It lost because the source is a statement of principles, not a procedure; a step list would extend the mechanism beyond what the source states and give the reader a second contract to violate.

**Add a per-file provenance header to the skill.** It lost because the notice sentence that asks for a header is scoped to engine files with an SPDX identifier; the shipped declaration is the skill-root `THIRD_PARTY_NOTICES` named by the `license` field, which travels with an installed copy without entering the loaded text (R7).

## Consequences

- The set ships `dsh-spec-error-handling` from `skills/dsh-spec-error-handling/` with an identical installed copy; the deliverable is the entry, one contract reference, and the skill-root notice.
- The entry assumes no UI, default-enabled logs, API-documentation practice, application runtime, base error, or single failure model. The reference supplies result-only fallback requirements for a new failure when the project has no convention.
- The detailed contract has one reference owner; the entry links to it where family and code decisions need that detail.
- Costs: the reference adds a second runtime-loaded file for contract work; generalized wording is less concrete than product examples; one clean-context run per scenario covers the changed decisions but does not establish trigger precision across all prompts.
- Risks: over-generalization can lose the source's force; a sentence outside the audit can still carry an unrecorded assumption; an adaptation can drift; the description can compete with a code-review skill.
- **Executor adherence is judged, not measured.** Whether an agent applies the rules is judgment; no command decides it, so the skill's effect rests on the review.
- **Presupposition classification is a judgment.** Whether a sentence's runtime assumption is shared, vacuous or unshared is decided per sentence in § Presupposition audit, and review checks the classification against the target scope.
- **Mechanism parity is judged, not mechanically provable.** Fidelity to the upstream mechanism is checked against the source text by review.
- What was given up: verbatim fidelity on the adapted units, a product-specific base-error contract, and a per-file provenance header.
- Rollback: revert the skill revision, its installed copy, the eval corpus, and this record; the baseline pin remains owned by #104.
