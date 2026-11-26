# Agent Note: Descriptions are derived from real triggers

Status: implemented

English | [中文](2026-11-25-description-is-derived-from-real-triggers.zh.md)

## Problem

A skill description is loaded before its body and is the only catalog text a model uses to decide whether to read the skill. Descriptions that list attractive keywords, repeat an open-ended template, or advertise behavior the body does not provide create false positives and hide the moments the skill actually serves.

## Decision

The Forge derives and evaluates a description as the catalog projection of four facts:

- the skill's actual role;
- the task moments and objects that should trigger it;
- the adjacent situations it excludes;
- the task families preserved from its upstream source.

For each source task family, the description preserves a current capability or records why the family is excluded. It advertises only behavior the loaded skill supplies and does not copy upstream product names. It states role, positive trigger moments and important exclusions in the body's terms, while execution procedure and detailed mechanism stay in the body or its references. No fixed sentence formula is required. The character limit is a constraint, not a target or a reason to add topics.

A changed description carries positive examples that should load the skill and near-miss examples that should not. The pair must distinguish the boundary, not merely prove that broad domain language causes selection. When role, activation, or exclusions change, the description, body boundary and trigger set are evaluated together.

The Forge entry states this requirement in its intent, verification and evaluation coverage. The behavior scenario `description-derived-from-role-triggers-and-exclusions` in `tests/skill-evals/dsh-spec-skill-forge/evals/evals.json` makes the Forge align a release-audit description and body boundary while preserving the procedure. Its trigger corpus, `tests/skill-evals/dsh-spec-skill-forge/trigger-evals.json`, contains six positive and six near-miss requests covering explicit and implicit skill authoring against installation, use, prompt editing, an API description, runtime code and a tool definition.

Current trigger corpora also include `tests/skill-evals/dsh-spec-ci-test-reliability/trigger-evals.json`, `tests/skill-evals/dsh-spec-client-ui-ux/trigger-evals.json`, `tests/skill-evals/dsh-spec-error-handling/trigger-evals.json`, `tests/skill-evals/dsh-spec-find-simplifications/trigger-evals.json`, `tests/skill-evals/dsh-spec-performance-investigation/trigger-evals.json`, `tests/skill-evals/dsh-spec-pr-description/trigger-evals.json`, `tests/skill-evals/dsh-spec-record-browser-gif/trigger-evals.json` and `tests/skill-evals/dsh-spec-translate-docs/trigger-evals.json`. `tests/skill-scenarios.test.ts` validates corpus shape, current trigger surfaces, the behavior scenario and its retained model evidence. Description quality remains a review judgment rather than a regex semantic gate.

Tracking: #160 (design: #132).

## Alternatives considered

**Optimize for the longest description under the catalog limit.** It exposes more words before loading, but added nouns often create false triggers without making the actual role clearer.

**Copy the upstream description with only the product name replaced.** It preserves source provenance, but carries product-specific framing and may claim triggers the generalized body no longer supports.

**Use one fixed template for every skill.** It makes review uniform, but forces unrelated skills into a keyword inventory and encourages catalog copy rather than a truthful role statement.

## Consequences

- Catalog selection is based on a truthful role and boundary; execution detail remains available after the body loads.
- Source task families are either supported or explicitly excluded, so a generalized skill does not inherit an upstream claim it cannot satisfy.
- The Forge entry and trigger corpus make description changes evaluate selection. The current matrix is 6/6 positives and 6/6 near misses (12/12), and the five-assertion behavior run is retained in `tests/skill-evals/evidence/2026-11-25-pr154/dsh-spec-skill-forge/`.
- The repository's catalog budget remains a ceiling. The Forge description is 363 BMP characters, leaving room for later corrections rather than encouraging an inventory.
- `dsh-spec-skill-forge` checks only specification mechanics and budget. Semantic quality is judged from the source, the body and positive/near-miss examples.
- Costs and limits: small trigger sets can overfit one phrasing, a composite skill can have a broad but honest role, and passing selected examples does not prove universal routing accuracy.
- Verification: `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-skill-forge --description-max 500`, `node --test --test-name-pattern='forge' tests/skill-scenarios.test.ts`, the notes check and the translation pairing check pin the current artifacts. The model run used `tests/skill-evals/run-model-eval.mjs`; the separate trigger probes retained each final `SELECT:` marker and the 12-row matrix.
