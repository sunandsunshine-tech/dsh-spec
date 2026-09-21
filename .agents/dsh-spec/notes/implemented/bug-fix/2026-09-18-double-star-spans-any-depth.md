# Agent Note: `**/` spans any depth and `*` stays inside one segment

Status: implemented

English | [中文](2026-09-18-double-star-spans-any-depth.zh.md)

## Problem

One matcher decides whether a scope entry covers a path, and it treated `*` and `**` as the same operator: "any characters inside one segment". `**/README.md` therefore matched a two-segment path and nothing deeper, so a README one level further down fell outside every scope that named it — the documentation scope and the bilingual pairing scope both read a corpus smaller than the one their entries described.

No gate reported it. Every gate in this collection validates the files it finds, and none of them claims how many files there should be, so a scope that silently keeps a fraction of its paths produces a green report computed from the fraction. A count with no expected value is not evidence.

## Decision

**A scope entry ending in `/` covers that directory anywhere, an entry containing `*` is a glob, and anything else is one exact path.** In a glob, `**/` spans any number of directories and a single `*` stays inside one segment.

**A gate that reads a scope reports what it left outside, grouped by the rule that excluded it.** The pairing gate names each exclusion rule and counts the files under it, because a scope that suddenly covers much less is first visible in the size of the set the gate refused to read. The note gates keep the empty-corpus guard: a run that found nothing to check fails.

## Alternatives considered

**List the files the scope covers explicitly.** No pattern to get wrong, and the corpus is readable in one place. It lost because the list is a second copy of the tree: every new document would have to be added to it, and a forgotten entry is invisible in exactly the way the glob was.

**Derive the scope from the tree and check the entries against it.** The pattern and the corpus could not disagree. It lost because a scope entry is a decision, not a derivation: a document excluded on purpose is excluded by a declaration, and a matcher that infers the set cannot express the exclusion.

**Fix the matcher and report nothing.** The smallest change that removes the defect. It lost because the same class of mistake returns the next time a pattern decides membership, and the exclusion report is the only signal that turns a narrowed corpus into a visible fact.

## Consequences

A scope entry names a pattern a reader can check against the tree, and the report on each run makes the size of the corpus part of the output rather than a number somebody has to know in advance.

The cost is that the pairing report is longer: every run prints the excluded files and their rules. That output is the point — the files a gate does not read are where an intended exclusion and a matcher bug look identical.
