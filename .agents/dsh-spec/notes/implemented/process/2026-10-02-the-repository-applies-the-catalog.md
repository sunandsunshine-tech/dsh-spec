# Agent Note: The repository applies the catalog

Status: implemented

English | [中文](2026-10-02-the-repository-applies-the-catalog.zh.md)

## Problem

[A project applies the norms it chooses](2026-09-22-a-project-applies-the-norms-it-chooses.md) recorded that this repository would not apply its own catalog: the norms were distilled from it, so installing them back would state the same guidance twice, and two statements of one rule drift. A test held the line.

Two things changed. The catalog was reduced to rules that hold for any project rather than this repository's own machinery, and every norm gained a one-line invariant that the manager renders into the `AGENTS.md` hook from the catalog itself, rather than writing it by hand; the block bodies in `norms.md` are the longer explanation.

## Decision

This repository applies the catalog. `norms install --all` writes `.agents/dsh-spec/norms/norms.md` and `applied.yaml`, and `AGENTS.md` carries the hook. The test that held the opposite is reversed: it asserts the file exists and the hook is present.

The hook is the home of the generic invariants. A norm states its rule once, in the `invariant` the manager renders into the hook; the standing orders in `AGENTS.md` keep only what this repository adds and the catalog does not carry. A rule stated in both places is a rule that drifts.

The earlier note keeps what it owns — the mechanism, the record, and why the selection belongs to the project — and this note owns the reversal of its one decision about this repository.

## Alternatives considered

**Leave the repository applying nothing.** Rejected: the standing orders were the only place several of these rules were stated, and a rule an agent meets only when it opens a file is the rule a long run drops. The hook puts each red line in front of every session.

**Apply the catalog and leave the old note unamended.** Rejected: a reader would find two implemented notes disagreeing about whether this repository applies norms, with nothing linking them.

**Write the red lines into `AGENTS.md` by hand.** Rejected: that is the second statement of a rule the catalog already holds, and the two would drift — the failure the earlier note was written to avoid.

## Consequences

- A change to a norm reaches this repository's generated text: a changed `body` lands in `.agents/dsh-spec/norms/norms.md`, and a changed `invariant` lands in the `AGENTS.md` hook. `norms update` refuses rather than overwriting a block edited by hand — the drift check that protects an adopter protects this repository too.
- The catalog is what this repository obeys as well as ships, so a rule that does not hold here does not belong in it.
- Each applied norm contributes one red line to `AGENTS.md`; the fourteen norms this repository applies put fourteen lines there.
