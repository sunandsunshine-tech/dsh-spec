# Agent Note: The search guidance states its exclusions and shows an example

Status: implemented

English | [中文](2026-09-23-the-search-guidance-shows-an-example.zh.md)

## Problem

The recall batteries grew two sections about running a search: `## Running the batteries`, which explained how to invoke a tool and which paths it must be told to reach, and `## Shell rendering`, which described a `grep` fallback and an `ripgrep` rendering of the same patterns. They were written when this reference was made tool-neutral: the commands were replaced by prose about tools, so the file acquired a description of search behaviour that belongs to whatever tool the reader already has.

The cost was not only length. The durable parts of the reference are the patterns and the exclusions; the prose about invocation sat between a reader and both of them, and it described a tool the project does not depend on in a file whose subject is prose quality. A reader who had a search tool learned nothing, and a reader who had none was given a fallback instead of the one fact that matters — which trees must not be read.

## Decision

The reference states the exclusions and treats the commands as one rendering of the patterns rather than as instructions.

- `## Exclusions` names the vendored, frozen, self-quoting and fixture trees and why each is out, and says that `.agents/` is corpus rather than an exclusion because an Agent Note is where this purge finds its misses.
- The judgment rules that belong to the patterns rather than the tool — complete phrases, calibration, the opposite-language surface — sit in the opening paragraph, where a reader meets them before any command.
- Each battery is a command line with the exclusions named once above it, so a reader sees the shape of a search without reading a manual for one. `ripgrep` stays out of the README's prerequisite table: the example names it, the project does not require it, and the reference says the commands are one rendering.
- `dsh-prose-standard` states the vendored exclusion in the compact form, without the tool-neutral clauses the same rewrite had added there.

## Alternatives considered

- **Keep the tool-neutral prose.** It is what produced the sections being removed: prose about a tool is longer than the command it replaces, and it cannot be run.
- **Prescribe `ripgrep` and list it as a prerequisite.** Honest, and simpler to write, but it makes a prose-quality reference depend on one search implementation, and the prerequisite table is read by installers who need Node and Git only.
- **Keep the pattern list and drop the commands entirely.** The patterns are the durable part, so this loses little, but an example is what tells a reader how the case-sensitivity and the exclusions are meant to combine; without one, both have to be reconstructed.
- **Leave the fallback and delete the example.** Then the reference would describe searching without showing it, which is the failure mode this decision exists to undo.

## Consequences

**What it bought.** The reference leads with what a search must exclude and shows one way to run it, so the durable facts are reachable without a detour through tool behaviour, and the README's prerequisite table still lists only what an installer needs.

**What it costs.** A reader whose environment has no `ripgrep` gets an example they cannot paste; the exclusions and the patterns still transfer, and the reference says so, but the reader has to map them. Treating the example as the specification is the other cost: a later editor may add tool-specific behaviour here because the commands look load-bearing, which is how the removed sections appeared.

**What it leaves to a reader.** The exclusions are stated once and the commands repeat none of them, so a second search implementation needs the list carried over by hand. The reference names the exclusion globs and not a tool's flag for them, and that gap is deliberate: the flags change between tools, the trees do not.
