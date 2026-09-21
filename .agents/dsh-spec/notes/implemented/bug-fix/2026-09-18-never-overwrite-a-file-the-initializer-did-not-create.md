# Agent Note: Never overwrite a file the initializer did not create

Status: implemented

English | [中文](2026-09-18-never-overwrite-a-file-the-initializer-did-not-create.zh.md)

## Problem

An initializer's contract is "write only what is missing", and the value of that contract is that a maintainer can re-run the tool at any time. `scripts/init-agents-md.ts` honoured it in every write except one: the block that installed a project's documentation contract copied its template without testing whether the destination existed. Re-run against a repository that already had that file, it replaced the repository's own contract with the raw template.

Every gate in this collection validates the shape of a tree; none of them executes the tool that writes the tree. A dry run on a fresh directory shows the contract being created — the case the new block was written for — so the first run and the second run look the same from inside the tool. Nothing in the corpus could distinguish them, and the file the block destroyed was the one the repository had spent the most work on.

## Decision

**The initializer overwrites nothing it did not write.** Every path it plans is tested for existence first and recorded as kept when it is already there, whether the plan is a template or a directory. A write added beside existing writes inherits that rule from them: the surrounding writes are the specification, and a new block that does not read them inherits none of it.

**The initializer writes the project's agent instructions and the Agent Note tree, and no documentation tree.** The contract this block installed belonged to the documentation mechanism, which is deleted; the standing orders, the note contract, the class folders and the note templates are what remain.

## Alternatives considered

**Trust the second run to be deliberate.** A maintainer who re-runs an initializer presumably wants it to operate. It lost because the tool also ships as part of an update path: a project takes a new revision of the collection and re-runs the initializer, which is the ordinary case, and it is the case that destroys hand-written content.

**Record a hash per planned file and rewrite only the ones that still match.** A stronger rule, and it would catch a file edited by a template that changed upstream. It lost because it makes the tool a merger: the project's file would be rewritten to the collection's text whenever the project had not touched it, and the collection does not own a project's instruction file.

**Ship no templates and let a project write its own.** One problem fewer, and nothing to overwrite. It lost because the file format is the contract the gates enforce: a project inventing its own note layout would fail gates it cannot read, so the templates stay as a starting point the tool will not take back.

## Consequences

The initializer is safe to re-run, and its report distinguishes what it wrote from what it left alone, so a maintainer sees which case the run was in. A template change upstream no longer reaches a project that has already adopted it: the project edits its own copy, which is the correct owner for a file the collection does not enforce.

The rule is invisible to every gate. Nothing here executes the initializer against a repository that is already initialized, so the guard is held by reading the code, and a future write added without it is caught in review rather than by a command.
