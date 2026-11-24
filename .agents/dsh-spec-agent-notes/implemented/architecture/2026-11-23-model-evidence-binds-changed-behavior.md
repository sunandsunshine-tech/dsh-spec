# Agent Note: Model evidence binds the behavior it exercises

Status: implemented

English | [中文](2026-11-23-model-evidence-binds-changed-behavior.zh.md)

## Problem

A model scenario proves behavior for the exact skill text used in that run. Treating every historical scenario as a claim about the current complete skill makes an unrelated wording edit invalidate the whole evidence corpus. Trigger selection has a narrower input than behavior: the catalog supplies a skill's name and description before the model reads the body.

Requiring every historical run to match the current body also hides the actual coverage question. A trigger scenario tests selection, while a behavior scenario tests one named decision. Neither becomes current merely because the other passed or the file has changed.

## Decision

Trigger evidence binds `skills/<name>/SKILL.md#name-description`, computed from the frontmatter name and description. A body edit does not invalidate trigger selection evidence. A name or description edit requires the corresponding trigger corpus to run again.

Behavior evidence records the complete installed skill hash as the bytes staged for the run and names the scenario, and therefore the behavior, that the run exercised. The trace is model-controlled reviewer context, not an execution attestation; reviewer certification makes the behavioral claim, and neither the hash nor the run applies to later bytes.

An edit invalidates the scenarios whose behavior it changes. Those scenarios receive a targeted model run when model judgment is required. Unrelated scenarios remain historical evidence for their recorded behavior. Repository tests validate scenario shape, inputs, assertions, retained artifacts, trigger surfaces and internally consistent revision records without requiring historical behavior hashes to equal the current complete skill.

An integration scenario records every sibling revision it read. A sibling edit invalidates that scenario only when it changes the sibling behavior on which the integration depends.

## Verification

`tests/skill-scenarios.test.ts` distinguishes trigger and behavior evidence. It verifies that trigger manifests use the frontmatter surface, that behavioral traces and run manifests identify the exact revision used, that input and artifact hashes still resolve, and that recorded skill hashes remain internally consistent. `tests/skill-evals/README.md` states the evidence model; the affected evidence READMEs state the scope of their runs.

## Alternatives considered

**Require every historical scenario to bind the current complete skill.** This is easy to check, but it treats an unrelated word as a behavioral regression and turns one changed behavior into a full-corpus requirement.

**Record no skill hash.** This avoids currentness checks, but removes the provenance that lets a reviewer connect a response to the text the model actually read.

**Bind trigger evidence to the complete body.** This adds no information about selection, which reads only the catalog name and description, and makes body edits rerun trigger probes unnecessarily.

**Let the current-skill equality test stand while documenting the over-invalidation.** The gate would continue requiring unrelated reruns and would not encode the intended scope.

**Treat a file hash as proof of every behavior in the file.** A hash identifies bytes, not the behaviors those bytes cover.

## Consequences

- Trigger evidence follows trigger inputs; behavior evidence follows named behaviors.
- A model run remains valid evidence for its recorded revision only.
- A behavior change needs the smallest representative model evidence that can decide it, not every historical scenario.
- Deterministic tests remain responsible for current skill structure, corpus integrity, trigger surfaces, run inputs and retained artifacts.
- A later edit cannot silently reuse an old trace as proof of new wording; it either leaves unrelated evidence historical or adds a targeted run for the changed behavior.
