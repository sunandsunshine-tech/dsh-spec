# Agent Note: Human language follows the current user's preference

Status: implemented

English | [中文](2026-11-27-human-language-follows-current-user-preference.zh.md)

## Problem

The subject rule separated the conventional `type(scope)` tokens from the human summary but did not say who chooses the language of that summary or other Git and GitHub prose. Repository history, account ownership, and the latest pull-request sequence are not evidence of the current user's preference, so using them to choose a language would turn incidental context into policy.

## Decision

Human-readable Git and GitHub prose may be Chinese or English. Use the current user's preferred language for the human part of a commit subject, the commit-message body, and pull-request titles and bodies.

Keep `type(scope)`, fixed pull-request title tokens and structure headings, code identifiers, commands, APIs, paths, and machine-readable fields in their required repository or English forms. Tooling and reviewers rely on those forms regardless of the prose language.

Account ownership does not establish language preference. The PR author, issue author, historical ratios, recent pull requests, and a precedence ladder do not decide the current user's language; the current user's preference does.

[Squash subjects follow the non-merge commit count](2026-11-26-squash-subjects-follow-the-non-merge-commit-count.md) remains authoritative for subject provenance, tracker-suffix handling, and DCO trailers. This record replaces that note's language conclusion with the current-user preference while leaving its subject and trailer rules current.

## Alternatives considered

**Require Chinese prose.** It would make one repository-era practice mandatory and remove the current user's ability to choose English.

**Require English prose.** It would reject an equally valid user preference and impose English beyond the machine-readable forms that need it.

**Infer the language from account ownership or history.** A PR author, issue author, previous commit, or recent pull-request sequence does not establish what the current user prefers.

**Use a precedence ladder over issue, domain, and recent changes.** The extra evidence cannot replace the current user's choice and makes a simple preference look like a language-detection algorithm.

**Translate every fixed field and heading.** Machine-readable fields and shared structure need stable forms for tooling and review, so only human-readable prose follows the user's preference.

## Consequences

- Contributors can use Chinese or English for human-readable Git and GitHub prose according to the current user's preference.
- Conventional tokens, fixed structure headings, code forms, paths, and machine-readable fields remain stable across languages.
- Account ownership and historical patterns are not treated as evidence of language preference.
- No automated gate judges the human language.
