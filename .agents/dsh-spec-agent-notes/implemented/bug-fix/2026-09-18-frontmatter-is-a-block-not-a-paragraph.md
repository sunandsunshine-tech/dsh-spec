# Agent Note: Treat frontmatter as a block, not as a paragraph

Status: implemented

English | [中文](2026-09-18-frontmatter-is-a-block-not-a-paragraph.zh.md)

## Problem

A corpus-wide paragraph reflow rewrote each part's YAML frontmatter — a three-line block — into a single line, `--- name: … description: … ---`, which is not valid YAML. The damage survived in the authored tree and in the installed copy because nothing reads frontmatter: the routing table is hand-written, so a collapsed block cost nothing visible and every gate stayed green.

The tool split prose on blank lines and could not tell a fence from a sentence: a `---` line, `key: value` lines and a closing `---` are, to a paragraph rewriter, one paragraph. Two habits compounded it — the rule fix landed on the tool rather than on the tool's earlier output, and the repaired script was trusted to have left the corpus in the state it describes.

## Decision

**Frontmatter is a fenced block**: `---` on a line of its own, `key: value` lines, and a closing `---` on a line of its own. A fence carries nothing else, and the block is a mapping.

**A bulk edit treats a fenced region as an opaque unit**, masked before the pass rather than repaired after it: a YAML block, a fenced code block and a generated region are units the prose does not contain, and an edit that splits on blank lines has no model of them.

**Correcting a bulk edit's rule does not repair the output the earlier rule produced.** When such a pass is fixed, re-read the corpus and measure what the broken version wrote.

## Alternatives considered

**Leave it to whoever parses the YAML.** No gate, and a real YAML parser would be the authority if one arrived. It lost because nothing here parses frontmatter, which is exactly how the damage survived.

**Fix the tool's rule and re-run it.** The cheapest correction, and the tool no longer produces the shape. It lost because the re-run was manual: the same files keep the defect through the next corpus-wide edit, and a rule fix that only guards new output detects nothing about the old.

**Have every bulk pass skip the top of the file.** Enough for frontmatter, and not for fenced blocks or generated regions. It lost because it binds the rule to a position rather than to a unit: the pass that caused this splits on paragraphs, so it needs the idea of a fenced region and not the idea of a file's opening.

## Consequences

A corpus-wide edit costs one extra consideration for two kinds of region, and it buys a class of damage that can no longer land silently: a block whose meaning is its line structure is not rewritten by a pass that splits on blank lines.

The residual risk belongs to review: no gate here reads YAML semantics, so a well-formed frontmatter block that says the wrong thing still leaves every gate green.
