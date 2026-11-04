# Agent Note: Forging records state current facts

Status: implemented

English | [中文](2026-11-02-forging-records-state-current-facts.zh.md)

## Problem

The forge wrote its record as a running account: the record contract listed settings, pages read, check runs and a review conclusion, and told the forger to record a conflict and its resolution. Records therefore carried round numbers, session facts and acceptance narration next to the design, and a later round added another layer instead of replacing the earlier one. The same design appeared in several phrasings, and a reader could not tell which statement still held. The notes contract already requires an implemented note to state the shipped decision and rewrite stale facts in place; the forge's own record rules did not.

## Decision

A forging record states the current design, not the forging's history. Its facts are the goal; the source revision read (repository, revision and read date); the settings in effect; the disposition table; each ruling; the current requirement anchors and verification evidence; the pages read and their dates; the unverified items with their reasons; the risks and the rollback point; and the publish authorization state.

Each round updates the facts the change alters and deletes the facts that no longer hold. The record never gains a round, a review exchange, a draft ordinal, a dated revision narrative or a before-and-after comparison; a replaced decision is written as the current decision, and the superseded fact is removed. Version control and the conversation hold the process. `skills/dsh-spec-skill-forge/SKILL.md` § Record and § Verification (**Complete**) carry the rule. The forge's own records lost their process narration in this change; the facts above are the target as each record is next updated, and a fact a record never carried is not invented.

## Alternatives considered

- **Keep the process log.** It would duplicate the change history that Git and commit messages already hold, and the second account would drift from the design.
- **Keep a separate process journal beside the record.** It would restore the second state store the forge's record rule excludes.
- **Rewrite only future records and leave the existing ones.** Implemented notes are current-state documents; the stale records would remain wrong and would be copied as precedent.

## Consequences

- A forging record reads as the design's present state, and every sentence can be relied on.
- The existing forging records lose their round, session and acceptance narration; their decisions, alternatives and evidence stay. Their `.zh.md` and `.i18n.yaml` companions are rewritten and re-recorded with the source.
- The rule is prose and judgement: no script decides whether a record states current facts; review enforces it.
