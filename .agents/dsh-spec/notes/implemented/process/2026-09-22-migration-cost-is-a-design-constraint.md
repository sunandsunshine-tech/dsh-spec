# Agent Note: Migration cost is a design constraint

Status: implemented

English | [中文](2026-09-22-migration-cost-is-a-design-constraint.zh.md)

## Problem

A package that writes into other people's trees decides two things in the same breath: how a feature works, and what design it leaves behind in a project that will keep it. The first is judged here, against the code, the tests and this repository's own needs. The second is judged there, against a project that has been editing its copy for months — its own sections around ours, its own wording inside a block, a path written into its `AGENTS.md`, links from its own notes. Renaming something costs a diff here and a breakage there, and that asymmetry only grows: at one project it is a conversation, at a hundred it is a migration.

This repository learned the asymmetry the ordinary way. A feature's files were placed under `docs/`, moved to `.agents/dsh-spec/` in the same session, and the discussion that moved them also asked what the first design would have cost had it been a single file: a later per-group split would have had to turn that file into a directory, moving a path projects already hold. The move was free only because nobody had adopted anything yet. The reasoning behind the first choice — "there is one document, so no directory is needed" — was sound about structure and blind about migration.

## Decision

**When two designs are equal for the architecture and for the plan, take the one an adopter's accumulated content would survive.** A directory that can gain files over a file that has to become one; a format that can gain fields over one that has to be rewritten; a name that can stay over one that has to move; a record beside its document over a record that gets renamed. The rule is about evolvability, not about paths: the question to answer is what adopters will be holding when this design changes.

Two conditions keep it from becoming a licence for speculation. The change has to be **likely**, and that likelihood is argued in the change rather than assumed. The design that survives it has to cost little now and leave the architecture and the plan alone. Where the rule would buy insurance against a change nobody expects, the simpler design wins, because speculative structure is its own defect here. Where the likelihood or the cost is genuinely a guess, the choice belongs to the maintainer: ask.

## Alternatives considered

**Choose the simplest design now, migrate later.** Rejected: migration is the expensive direction. The simplicity is paid once, by us; the migration is paid by every project that has accumulated content, and this repository is in no position to price that.

**Pay for optionality everywhere.** Rejected: it is the same coin from the other face. Building the general design before the need exists is what [four mechanisms instead of twelve](2026-09-18-four-mechanisms-instead-of-twelve.md) deleted, and an abstraction nobody needed is harder to remove than a directory is to add.

**Let every change decide for itself.** Rejected: that is how the first design was chosen — locally sound, blind to the adopter — and the answer should be reachable in a session without re-deriving it.

**Make every such decision a discussion with the maintainer.** Rejected as the default, kept as the fallback: it is the right move when the likelihood or the cost cannot be argued from evidence, and too slow when they can.

## Consequences

- Some changes carry a directory, an indirection, or a little more naming than the present needs. That is the price, and the change names it rather than leaving it to be discovered.
- "Likely" can be wrong. The mitigation is that the judgement is written down and argued, so a later reader can see what was assumed and correct it.
- The rule does not override the other boundaries: a design that would make the package assume one ecosystem, or a gate that passes on an empty corpus, is still refused.
