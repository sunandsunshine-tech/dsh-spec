# Agent Note: Scan scope, inlined rationale, and a package README

Status: implemented

English | [中文](2026-09-18-scan-scope-and-the-package-readme.zh.md)

## Problem

Running the initializer here exposed four things at once.

The scan counted twelve subtree instruction files inside `submodules/dsh/` and would have counted anything else a dependency tree happens to carry, because it walked directories and knew nothing about the project's ignore scope. A project's own `.gitignore` is the statement of what belongs to it; a scan that ignores that statement reports another owner's files as the maintainer's.

The deployed Agent Note contract pointed at three decision records that exist only in the skill set's source project, so three rules — the uniform format, the absent index, the frozen archive — carried their rationale in a repository the reader cannot open.

The initializer's workflow never told an agent to ask before writing. Its steps went inventory, gather, apply, and only then "replace every placeholder, with the maintainer" — so in a project whose mode is `attended`, the maintainer's answers arrive as corrections to work already done.

The package's README was written without opening the documentation standard it ships. It explained itself to the maintainer rather than to the person installing the package, and the voice rules it never read say they apply "to package READMEs with particular force".

## Decision

**The scan respects the project's ignore scope.** It takes git's view of the tree — tracked plus untracked, minus ignored — as the set of files that belong to the project, so an ignored path is never read and a submodule's contents are never entered. Without git it falls back to directory names. A dependency tree git does *not* ignore is still skipped when it holds both its own manifest and its own lockfile, and every refusal is printed with its reason so a maintainer can check the judgement rather than trust it.

**The three rationales are inlined into the contract.** A rule and its reason now sit together in `.agents/dsh-spec/notes/README.md`, in the skill set's own words, instead of pointing at a note in another repository. The rules had already transferred; only their justification was missing.

**The workflow asks before it writes.** `dsh-spec-init.md` carries a new step between gathering facts and applying them: under `attended`, present the inventory and the questions and wait; under `unattended`, apply what the files support and record the rest as proposals. Applying first and reporting afterwards is named as neither mode.

**The package README follows the standard it ships.** It opens with what a reader can do rather than what the package is, states the installation that makes the copy shared and the cost the pattern charges, and gives the first command that produces a result. The sentence addressed to the maintainer is gone.

## Alternatives considered

**Keep the walk and add `submodules/` to the skip list.** One string, and this repository's report becomes clean. It lost because `submodules/` is this project's fact: the next project's dependency tree has a different name, and the scan would report its instructions as the maintainer's in exactly the same way.

**Parse `.gitignore` directly.** No git dependency, and the scope would be visible in the scan's own source. It lost because ignore semantics — negation, anchoring, directory-only patterns, precedence between nested files — are a specification with a reference implementation, and a partial reimplementation fails silently in the direction of scanning too much.

**Keep the rationale upstream and link to the skill set.** The three rules belong to the pattern, so their reasoning could live in `references/` and the contract could cite it. It lost because a contract a project reads on every note should not require opening a second document to learn why the format is what it is, and the rules are short enough that their reasons are two sentences each.

**Add the missing step without saying what the wrong behaviour was.** A step that says "ask first" reads as style. Naming the failure — that a late answer becomes a correction — is what makes an agent follow it.

## Consequences

The initializer now reports one skipped tree on this repository, `submodules/dsh`, with the reason it was skipped. A maintainer reading that line can disagree with it, which is the point.

The scan depends on git being present and the root being inside a work tree. Outside one, the fallback is the old name-based walk, so the ignore scope is only respected where it exists.

The contract is longer by three sentences and shorter by three pointers to files a reader of this repository cannot open. The notes contract and its Chinese counterpart remain byte-identical to the skill set's templates, so the next template change reaches this repository with no reconciliation.

The README is now a paired document under the bilingual gate, which means editing it costs a counterpart edit and a re-record, and its length is bounded by the wrap rule rather than by taste.
