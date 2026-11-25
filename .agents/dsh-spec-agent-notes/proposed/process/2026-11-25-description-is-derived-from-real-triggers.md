# Agent Note: Descriptions are derived from real triggers

Status: proposed

English | [中文](2026-11-25-description-is-derived-from-real-triggers.zh.md)

## Problem

A skill description is loaded before its body and is the only catalog text a model uses to decide whether to read the skill. Descriptions that list attractive keywords, repeat an open-ended template, or advertise behavior the body does not provide create false positives and hide the moments the skill actually serves.

## Proposal

A forged or reforged description is derived from four facts:

- the skill's actual role;
- the task moments and objects that should trigger it;
- the adjacent situations it excludes;
- the task families preserved from its upstream source.

The description preserves those source task families without copying upstream product names or unsupported promises. It does not use a fixed open-enumeration formula such as “covering A, B, C and more” to fill the catalog budget. The character limit is a constraint, not a target or a reason to add topics.

Trigger acceptance uses positive examples that should load the skill and near-miss examples that should not. The pair must distinguish the boundary, not merely prove that broad performance or review language causes selection.

Tracking: #132.

## Alternatives considered

**Optimize for the longest description under the catalog limit.** It exposes more words before loading, but added nouns often create false triggers without making the actual role clearer.

**Copy the upstream description with only the product name replaced.** It preserves source provenance, but carries product-specific framing and may claim triggers the generalized body no longer supports.

**Use one fixed template for every skill.** It makes review uniform, but forces unrelated skills into a keyword inventory and encourages catalog copy rather than a truthful role statement.

## Acceptance criteria

- The description states the role, positive trigger boundary and important exclusions in the body's own terms.
- Every retained source task family has a corresponding current capability or a disclosed reason for exclusion.
- No behavior is advertised unless the loaded skill supplies it.
- Positive and near-miss trigger evaluations are recorded for a changed description.
- The description remains within the repository's catalog budget with BMP characters only.

## Risks

- Small trigger sets can overfit one phrasing and miss another natural request.
- A composite skill can have a broad but honest role whose boundary is harder to state than a single-source port.
- Passing trigger evaluations prove selected examples, not universal routing accuracy; review still checks the wording against the body.
