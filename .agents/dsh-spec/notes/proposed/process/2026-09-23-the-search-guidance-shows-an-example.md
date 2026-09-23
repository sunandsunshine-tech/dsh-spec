# Agent Note: The search guidance states its exclusions and shows an example

Status: proposed

English | [中文](2026-09-23-the-search-guidance-shows-an-example.zh.md)

## Problem

The recall batteries grew two sections about running a search: `## Running the batteries`, which explained how to invoke a tool and which paths it must be told to reach, and `## Shell rendering`, which described a `grep` fallback and an `ripgrep` rendering of the same patterns. They were written when this reference was made tool-neutral: the commands were replaced by prose about tools, so the file acquired a description of search behaviour that belongs to whatever tool the reader already has.

The cost is not only length. The durable parts of the reference are the patterns and the exclusions; the prose about invocation sits between a reader and both of them, and it describes a tool the project does not depend on in a file whose subject is prose quality. A reader who has a search tool learns nothing, and a reader who has none is given a fallback instead of the one fact that matters — which trees must not be read.

## Proposal

State the exclusions, and treat the commands as one example of the patterns rather than as instructions.

The reference keeps a `## Exclusions` section naming the vendored, frozen, self-quoting and fixture trees and why each is out; it keeps the judgment rules that are about the patterns rather than the tool (complete phrases, calibration, the opposite-language surface) in its opening; and it renders each battery as a command line with the exclusions named once above it, so a reader sees the shape of a search without reading a manual for one.

`ripgrep` stays out of the README's prerequisite table. The example names it; the project does not require it, and the reference says the commands are one rendering.

## Alternatives considered

- **Keep the tool-neutral prose.** It is what produced the sections being removed: prose about a tool is longer than the command it replaces, and it cannot be run.
- **Prescribe `ripgrep` and list it as a prerequisite.** Honest, and simpler to write, but it makes a prose-quality reference depend on one search implementation, and the prerequisite table is read by installers who need Node and Git only.
- **Keep the pattern list and drop the commands entirely.** The patterns are the durable part, so this loses little, but an example is what tells a reader how the case-sensitivity and the exclusions are meant to combine; without one, both have to be reconstructed.
- **Leave the fallback and delete the example.** Then the reference describes searching without showing it, which is the failure mode this change exists to undo.

## Acceptance criteria

- The reference names the exclusions and no longer describes how to invoke a tool or how to work without one.
- Each battery appears as example commands, with the exclusions named once rather than repeated per command.
- `dsh-prose-standard` states the vendored exclusion in the compact form, without the tool-neutral clauses.
- The README prerequisite table does not gain `ripgrep`.

## Risks

A reader whose environment has no `ripgrep` gets an example they cannot paste; the exclusions and the patterns still transfer, and the reference says so, but the reader has to map them. Treating the example as the specification is the other risk: a later editor may add tool-specific behaviour to the reference because the commands look load-bearing, which is how the sections being removed appeared in the first place.
